from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import PurePosixPath
from threading import Lock
from typing import Any
from uuid import uuid4
import asyncio

from app.core.config import get_settings
from app.schemas.generation import (
    GeneratedImageResponse,
    GenerateRequest,
    GenerationJobResponse,
    GenerationStatus,
)
from app.schemas.history import HistoryItemResponse
from app.services.comfyui_client import ComfyUIClient
from app.services.history_service import history_service
from app.services.storage_service import storage_service
from app.services.workflow_builder import build_flux_workflow
from app.schemas.job import PersistedGenerationJob
from app.services.job_store import job_store

settings = get_settings()
comfy_client = ComfyUIClient(settings.comfyui_url)


@dataclass
class StoredGenerationJob:
    response: GenerationJobResponse
    request: GenerateRequest
    comfy_prompt_id: str | None = None
    history_saved: bool = False
    actual_seed: int | None = None
    stored_image: GeneratedImageResponse | None = None


class GenerationService:
    def __init__(self) -> None:
        self._jobs: dict[str, StoredGenerationJob] = {}
        self._lock = Lock()

        for persisted in job_store.list_jobs():
            self._jobs[persisted.id] = (
                self._restore_job(persisted)
            )

    async def resume_pending_jobs(self) -> None:
        while True:
            with self._lock:
                job_ids = [
                    job_id
                    for job_id, stored_job in self._jobs.items()
                    if stored_job.response.status
                    not in {
                        GenerationStatus.COMPLETED,
                        GenerationStatus.FAILED,
                        GenerationStatus.CANCELLED,
                    }
                ]

            for job_id in job_ids:
                try:
                    await self.get_job(job_id)
                except Exception as error:
                    print(
                        f"Unable to resume generation job "
                        f"{job_id}: {error}"
                    )

            await asyncio.sleep(5)


    async def create_job(
        self,
        request: GenerateRequest,
    ) -> GenerationJobResponse:
        job_id = str(uuid4())

        model_name = self._display_model_name(
            request.model_id
        )

        response = GenerationJobResponse(
            id=job_id,
            prompt=request.prompt,
            model_name=model_name,
            status=GenerationStatus.QUEUED,
            progress=0,
            created_at=datetime.now(UTC),
        )

        stored_job = StoredGenerationJob(
            response=response,
            request=request,
        )

        with self._lock:
            self._jobs[job_id] = stored_job    
            
        self._persist_job(
            job_id,
            stored_job,
        )

        built = build_flux_workflow(request)

        stored_job.actual_seed = built.seed
        
        self._persist_job(
            job_id,
            stored_job,
        )

        prompt_id = await comfy_client.queue_prompt(
            workflow=built.workflow,
            client_id=job_id,
        )

        updated_response = response.model_copy(
            update={
                "status": GenerationStatus.QUEUED,
                "progress": 5,
            }
        )

        with self._lock:
            stored_job.comfy_prompt_id = prompt_id
            stored_job.response = updated_response
            
        self._persist_job(
            job_id,
            stored_job,
        )

        return updated_response

    async def get_job(
        self,
        job_id: str,
    ) -> GenerationJobResponse | None:
        with self._lock:
            stored_job = self._jobs.get(job_id)

        if stored_job is None:
            persisted = job_store.get_job(
                job_id
            )

            if persisted is None:
                return None

            stored_job = self._restore_job(
                persisted
            )

            with self._lock:
                self._jobs[job_id] = stored_job

        if stored_job.response.status in {
            GenerationStatus.COMPLETED,
            GenerationStatus.FAILED,
            GenerationStatus.CANCELLED,
        }:
            return stored_job.response

        if not stored_job.comfy_prompt_id:
            return stored_job.response

        history = await comfy_client.get_history(
            stored_job.comfy_prompt_id
        )

        updated = await self._apply_history_to_job(
            stored_job,
            history,
        )

        with self._lock:
            self._jobs[job_id] = stored_job

        self._persist_job(
            job_id,
            stored_job,
        )

        return updated

    async def list_jobs(
        self,
    ) -> list[GenerationJobResponse]:
        with self._lock:
            job_ids = list(self._jobs.keys())

        jobs: list[GenerationJobResponse] = []

        for job_id in job_ids:
            job = await self.get_job(job_id)

            if job is not None:
                jobs.append(job)

        return sorted(
            jobs,
            key=lambda job: job.created_at,
            reverse=True,
        )

    async def cancel_job(
        self,
        job_id: str,
    ) -> GenerationJobResponse | None:
        with self._lock:
            stored_job = self._jobs.get(job_id)

        if stored_job is None:
            persisted = job_store.get_job(
                job_id
            )

            if persisted is None:
                return None

            stored_job = self._restore_job(
                persisted
            )

            with self._lock:
                self._jobs[job_id] = stored_job

        if stored_job.response.status in {
            GenerationStatus.COMPLETED,
            GenerationStatus.FAILED,
            GenerationStatus.CANCELLED,
        }:
            return stored_job.response

        stored_job.response = (
            stored_job.response.model_copy(
                update={
                    "status": GenerationStatus.CANCELLED,
                }
            )
        )

        with self._lock:
            self._jobs[job_id] = stored_job

        self._persist_job(
            job_id,
            stored_job,
        )

        return stored_job.response

    async def _apply_history_to_job(
        self,
        stored_job: StoredGenerationJob,
        history: dict[str, Any],
    ) -> GenerationJobResponse:
        current = stored_job.response
        prompt_id = stored_job.comfy_prompt_id

        if not prompt_id:
            return current

        history_entry = history.get(prompt_id)

        if not history_entry:
            updated = current.model_copy(
                update={
                    "status": GenerationStatus.RUNNING,
                    "progress": max(
                        current.progress,
                        35,
                    ),
                }
            )

            stored_job.response = updated
            return updated

        #
        # ComfyUI error handling
        #
        status_info = history_entry.get(
            "status",
            {},
        )

        if status_info.get("status_str") == "error":
            messages = status_info.get(
                "messages",
                [],
            )

            error_message = (
                "ComfyUI generation failed"
            )

            if messages:
                error_message = str(
                    messages[-1]
                )

            updated = current.model_copy(
                update={
                    "status": GenerationStatus.FAILED,
                    "error": error_message,
                }
            )

            stored_job.response = updated
            return updated

        image_info = self._extract_first_image(
            history_entry
        )

        if image_info is None:
            updated = current.model_copy(
                update={
                    "status": GenerationStatus.RUNNING,
                    "progress": max(
                        current.progress,
                        80,
                    ),
                }
            )

            stored_job.response = updated
            return updated

        #
        # Copy finished ComfyUI image into
        # Vyrra-owned persistent storage.
        #
        if stored_job.stored_image is None:
            stored_filename = (
                await storage_service.store_comfyui_image(
                    filename=image_info["filename"],
                    subfolder=image_info.get(
                        "subfolder",
                        "",
                    ),
                    folder_type=image_info.get(
                        "type",
                        "output",
                    ),
                )
            )

            image_url = (
                f"{settings.public_api_url}"
                f"{settings.api_prefix}"
                f"/storage/history/{stored_filename}"
            )

            image = GeneratedImageResponse(
                id=str(uuid4()),
                prompt=current.prompt,
                image_url=image_url,
                model_name=current.model_name,
                width=self._get_width(
                    stored_job.request.resolution_id
                ),
                height=self._get_height(
                    stored_job.request.resolution_id
                ),
                created_at=datetime.now(UTC),
            )

            stored_job.stored_image = image

            #
            # Persist metadata once.
            #
            if not stored_job.history_saved:
                history_item = HistoryItemResponse(
                    id=image.id,
                    prompt=stored_job.request.prompt,
                    negative_prompt=(
                        stored_job.request.negative_prompt
                    ),
                    model_id=stored_job.request.model_id,
                    model_name=current.model_name,
                    lora_id=stored_job.request.lora_id,
                    lora_strength=(
                        stored_job.request.lora_strength
                    ),
                    image_filename=stored_filename,
                    image_url=image.image_url,
                    width=image.width,
                    height=image.height,
                    seed=(
                        stored_job.actual_seed
                        if stored_job.actual_seed
                        is not None
                        else stored_job.request.seed
                    ),
                    steps=stored_job.request.steps,
                    guidance=(
                        stored_job.request.guidance
                    ),
                    created_at=image.created_at,
                )

                history_service.add_item(
                    history_item
                )

                stored_job.history_saved = True

        image = stored_job.stored_image

        if image is None:
            updated = current.model_copy(
                update={
                    "status": GenerationStatus.FAILED,
                    "error": (
                        "Generated image could not "
                        "be stored by Vyrra."
                    ),
                }
            )

            stored_job.response = updated
            return updated

        updated = current.model_copy(
            update={
                "status": GenerationStatus.COMPLETED,
                "progress": 100,
                "image": image,
            }
        )

        stored_job.response = updated

        return updated

    def _extract_first_image(
        self,
        history_entry: dict[str, Any],
    ) -> dict[str, Any] | None:
        outputs = history_entry.get(
            "outputs",
            {},
        )

        for node_output in outputs.values():
            images = node_output.get(
                "images"
            )

            if images:
                return images[0]

        return None

    def _get_width(
        self,
        resolution_id: str,
    ) -> int:
        if resolution_id == "portrait":
            return 768

        if resolution_id == "landscape":
            return 1152

        return 1024

    def _get_height(
        self,
        resolution_id: str,
    ) -> int:
        if resolution_id == "portrait":
            return 1152

        if resolution_id == "landscape":
            return 768

        return 1024

    def _persist_job(
        self,
        job_id: str,
        stored_job: StoredGenerationJob,
    ) -> None:
        response = stored_job.response

        persisted = PersistedGenerationJob(
            id=job_id,
            request=stored_job.request,
            status=response.status,
            progress=response.progress,
            model_name=response.model_name,
            created_at=response.created_at,
            comfy_prompt_id=stored_job.comfy_prompt_id,
            actual_seed=stored_job.actual_seed,
            history_saved=stored_job.history_saved,
            image=response.image,
            error=response.error,
        )

        job_store.save_job(persisted)
     
    def clear_jobs(self) -> None:
        with self._lock:
            self._jobs.clear()

        job_store.clear()     
        
    def _restore_job(
        self,
        persisted: PersistedGenerationJob,
    ) -> StoredGenerationJob:
        response = GenerationJobResponse(
            id=persisted.id,
            prompt=persisted.request.prompt,
            model_name=persisted.model_name,
            status=persisted.status,
            progress=persisted.progress,
            created_at=persisted.created_at,
            image=persisted.image,
            error=persisted.error,
        )

        return StoredGenerationJob(
            response=response,
            request=persisted.request,
            comfy_prompt_id=persisted.comfy_prompt_id,
            history_saved=persisted.history_saved,
            actual_seed=persisted.actual_seed,
            stored_image=persisted.image,
        )

    def _display_model_name(
        self,
        filename: str,
    ) -> str:
        name = PurePosixPath(
            filename
        ).name

        for suffix in (
            ".safetensors",
            ".ckpt",
            ".pt",
            ".pth",
            ".bin",
        ):
            if name.lower().endswith(
                suffix
            ):
                name = name[
                    :-len(suffix)
                ]

                break

        return (
            name
            .replace("_", " ")
            .replace("-", " ")
            .strip()
        )


generation_service = GenerationService()
