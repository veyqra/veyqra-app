from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from threading import Lock
from typing import Any
from uuid import uuid4
from urllib.parse import urlencode
from pathlib import PurePosixPath
from app.schemas.history import HistoryItemResponse
from app.services.history_service import history_service

from app.core.config import get_settings
from app.schemas.generation import (
    GeneratedImageResponse,
    GenerateRequest,
    GenerationJobResponse,
    GenerationStatus,
)
from app.services.comfyui_client import ComfyUIClient, ComfyUIError
from app.services.workflow_builder import build_flux_workflow


settings = get_settings()
comfy_client = ComfyUIClient(settings.comfyui_url)


@dataclass
class StoredGenerationJob:
    response: GenerationJobResponse
    request: GenerateRequest
    comfy_prompt_id: str | None = None
    history_saved: bool = False
    actual_seed: int | None = None


class GenerationService:
    def __init__(self) -> None:
        self._jobs: dict[str, StoredGenerationJob] = {}
        self._lock = Lock()

    async def create_job(
        self,
        request: GenerateRequest,
    ) -> GenerationJobResponse:
        job_id = str(uuid4())
        model_name = self._display_model_name(request.model_id)

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

        built = build_flux_workflow(request)

        stored_job.actual_seed = built.seed

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

        return updated_response

    async def get_job(
        self,
        job_id: str,
    ) -> GenerationJobResponse | None:
        with self._lock:
            stored_job = self._jobs.get(job_id)

        if stored_job is None:
            return None

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

        updated = self._apply_history_to_job(stored_job, history)

        with self._lock:
            self._jobs[job_id] = stored_job

        return updated

    async def list_jobs(self) -> list[GenerationJobResponse]:
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
                return None

            if stored_job.response.status in {
                GenerationStatus.COMPLETED,
                GenerationStatus.FAILED,
            }:
                return stored_job.response

            stored_job.response = stored_job.response.model_copy(
                update={
                    "status": GenerationStatus.CANCELLED,
                }
            )

            return stored_job.response

    def _apply_history_to_job(
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
                    "progress": max(current.progress, 35),
                }
            )
            stored_job.response = updated
            return updated

        image_info = self._extract_first_image(history_entry)

        if image_info is None:
            updated = current.model_copy(
                update={
                    "status": GenerationStatus.RUNNING,
                    "progress": max(current.progress, 80),
                }
            )
            stored_job.response = updated
            return updated

        query = urlencode(
            {
                "filename": image_info["filename"],
                "subfolder": image_info.get("subfolder", ""),
                "type": image_info.get("type", "output"),
            }
        )

        image_url = (
            f"http://localhost:8000/api/v1/images/comfyui?{query}"
        )

        image = GeneratedImageResponse(
            id=str(uuid4()),
            prompt=current.prompt,
            image_url=image_url,
            model_name=current.model_name,
            width=self._get_width(stored_job.request.resolution_id),
            height=self._get_height(stored_job.request.resolution_id),
            created_at=datetime.now(UTC),
        )
        
        if not stored_job.history_saved:
            history_item = HistoryItemResponse(
                id=image.id,
                prompt=stored_job.request.prompt,
                negative_prompt=stored_job.request.negative_prompt,
                model_id=stored_job.request.model_id,
                model_name=current.model_name,
                lora_id=stored_job.request.lora_id,
                lora_strength=stored_job.request.lora_strength,
                image_url=image.image_url,
                width=image.width,
                height=image.height,
                seed=(
                    stored_job.actual_seed
                    if stored_job.actual_seed is not None
                    else stored_job.request.seed
                ),
                steps=stored_job.request.steps,
                guidance=stored_job.request.guidance,
                created_at=image.created_at,
            )

            history_service.add_item(
            history_item
            )
            
            stored_job.history_saved = True

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
        outputs = history_entry.get("outputs", {})

        for node_output in outputs.values():
            images = node_output.get("images")

            if images:
                return images[0]

        return None

    def _get_width(self, resolution_id: str) -> int:
        if resolution_id == "portrait":
            return 768
        if resolution_id == "landscape":
            return 1152
        return 1024

    def _get_height(self, resolution_id: str) -> int:
        if resolution_id == "portrait":
            return 1152
        if resolution_id == "landscape":
            return 768
        return 1024
        
    def _display_model_name(
        self,
        filename: str,
    ) -> str:
        name = PurePosixPath(filename).name

        for suffix in (
            ".safetensors",
            ".ckpt",
            ".pt",
            ".pth",
            ".bin",
        ):
            if name.lower().endswith(suffix):
                name = name[:-len(suffix)]
                break

        return (
            name
            .replace("_", " ")
            .replace("-", " ")
            .strip()
        )


generation_service = GenerationService()
