from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from threading import Lock
from typing import Any
from uuid import uuid4
import asyncio

from PIL import Image, UnidentifiedImageError

from app.core.config import get_settings
from app.schemas.generation import (
    GeneratedImageResponse,
    GenerateRequest,
    GenerationJobResponse,
    GenerationStatus,
)
from app.schemas.generation import GenerationMode
from app.schemas.history import HistoryItemResponse
from app.services.comfyui_client import ComfyUIClient
from app.services.generation_workflow_builder import (
    build_generation_workflow,
)
from app.services.history_service import history_service
from app.services.model_service import model_service
from app.services.storage_service import storage_service
from app.schemas.job import PersistedGenerationJob
from app.services.job_store import job_store

settings = get_settings()
comfy_client = ComfyUIClient(settings.comfyui_url)

# Resolve uploads dir relative to the API package, not the process cwd
API_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = (
    API_ROOT
    / "data"
    / "uploads"
)


@dataclass
class StoredGenerationJob:
    response: GenerationJobResponse
    request: GenerateRequest
    comfy_prompt_id: str | None = None
    history_saved: bool = False
    actual_seed: int | None = None
    output_width: int | None = None
    output_height: int | None = None
    stored_image: GeneratedImageResponse | None = None


class GenerationService:
    def __init__(self) -> None:
        self._jobs: dict[str, StoredGenerationJob] = {}
        self._progress_tasks: dict[str, asyncio.Task[None]] = {}
        self._lock = Lock()

        for persisted in job_store.list_jobs():
            self._jobs[persisted.id] = (
                self._restore_job(persisted)
            )

    async def resume_pending_jobs(self) -> None:
        with self._lock:
            cancelled_prompt_ids = [
                stored_job.comfy_prompt_id
                for stored_job in self._jobs.values()
                if stored_job.comfy_prompt_id
                and stored_job.response.status
                == GenerationStatus.CANCELLED
            ]
            pending_job_ids = [
                job_id
                for job_id, stored_job in self._jobs.items()
                if stored_job.comfy_prompt_id
                and stored_job.response.status
                not in {
                    GenerationStatus.COMPLETED,
                    GenerationStatus.FAILED,
                    GenerationStatus.CANCELLED,
                }
            ]

        for prompt_id in cancelled_prompt_ids:
            try:
                await comfy_client.cancel_prompt(prompt_id)
            except Exception as error:
                print(
                    "Unable to clean up cancelled ComfyUI prompt "
                    f"{prompt_id}: {error}"
                )

        for job_id in pending_job_ids:
            self._start_progress_monitor(job_id)

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

        # If an input image is provided for image-to-image or inpaint,
        # ensure it exists and upload it to ComfyUI so the workflow can reference it.
        comfy_filename: str | None = None
        input_image_size: tuple[int, int] | None = None

        try:
            if request.mode in {
                GenerationMode.IMAGE_TO_IMAGE,
                GenerationMode.INPAINT,
            }:
                if not request.input_image:
                    raise ValueError("Input image is required.")

                input_path = UPLOAD_DIR / request.input_image

                if not input_path.exists():
                    raise ValueError(
                        "Input image does not exist."
                    )

                input_image_size = self._read_image_size(
                    input_path
                )

                comfy_filename = (
                    await comfy_client.upload_image(
                        input_path,
                        request.input_image,
                    )
                )

            selected_model = await model_service.get_model(
                request.model_id
            )

            built = build_generation_workflow(
                request=request,
                model=selected_model,
                input_image_filename=comfy_filename,
                input_image_size=input_image_size,
            )
        except Exception as error:
            failed_response = response.model_copy(
                update={
                    "status": GenerationStatus.FAILED,
                    "error": str(error),
                }
            )

            stored_job.response = failed_response
            self._persist_job(
                job_id,
                stored_job,
            )

            raise

        response = response.model_copy(
            update={
                "mask_prompt": built.mask_prompt,
            }
        )
        stored_job.response = response
        stored_job.actual_seed = built.seed
        stored_job.output_width = built.width
        stored_job.output_height = built.height
        
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
                "progress": 0,
            }
        )

        with self._lock:
            stored_job.comfy_prompt_id = prompt_id
            stored_job.response = updated_response
            
        self._persist_job(
            job_id,
            stored_job,
        )

        self._start_progress_monitor(job_id)

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

        if stored_job.comfy_prompt_id:
            await comfy_client.cancel_prompt(
                stored_job.comfy_prompt_id
            )

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

        self._stop_progress_monitor(job_id)

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
            # A prompt without a history entry may still be waiting in the
            # ComfyUI queue. The websocket progress event changes it to
            # RUNNING once the sampler actually starts.
            if (
                current.status == GenerationStatus.QUEUED
                and current.progress != 0
            ):
                current = current.model_copy(
                    update={"progress": 0}
                )
                stored_job.response = current

            return current

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

        mask_preview_url = current.mask_preview_url

        if (
            stored_job.request.mode == GenerationMode.INPAINT
            and not mask_preview_url
        ):
            mask_image_info = self._extract_node_image(
                history_entry,
                "253",
            )
            default_mask_folder_type = "output"

            # Jobs queued before the dedicated mask SaveImage node was
            # introduced only expose the temporary PreviewImage output.
            if mask_image_info is None:
                mask_image_info = self._extract_node_image(
                    history_entry,
                    "22",
                )
                default_mask_folder_type = "temp"

            if mask_image_info is not None:
                mask_filename = (
                    await storage_service.store_comfyui_image(
                        filename=mask_image_info["filename"],
                        subfolder=mask_image_info.get(
                            "subfolder",
                            "",
                        ),
                        folder_type=mask_image_info.get(
                            "type",
                            default_mask_folder_type,
                        ),
                    )
                )

                mask_preview_url = (
                    f"{settings.public_api_url}"
                    f"{settings.api_prefix}"
                    f"/storage/history/{mask_filename}"
                )

        if stored_job.request.mode == GenerationMode.INPAINT:
            image_info = self._extract_node_image(
                history_entry,
                "13",
            )
        else:
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
                    "mask_preview_url": mask_preview_url,
                }
            )

            stored_job.response = updated
            return updated

        #
        # Copy finished ComfyUI image into
        # Veyqra-owned persistent storage.
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
                mask_preview_url=mask_preview_url,
                model_name=current.model_name,
                width=(
                    stored_job.output_width
                    or self._get_width(
                        stored_job.request.resolution_id
                    )
                ),
                height=(
                    stored_job.output_height
                    or self._get_height(
                        stored_job.request.resolution_id
                    )
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
                        "be stored by Veyqra."
                    ),
                }
            )

            stored_job.response = updated
            return updated

        updated = current.model_copy(
            update={
                "status": GenerationStatus.COMPLETED,
                "progress": 100,
                "mask_preview_url": mask_preview_url,
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

    def _start_progress_monitor(
        self,
        job_id: str,
    ) -> None:
        existing = self._progress_tasks.get(job_id)

        if existing is not None and not existing.done():
            return

        task = asyncio.create_task(
            self._monitor_comfyui_progress(job_id)
        )
        self._progress_tasks[job_id] = task

        def remove_completed_task(
            completed_task: asyncio.Task[None],
        ) -> None:
            if self._progress_tasks.get(job_id) is completed_task:
                self._progress_tasks.pop(job_id, None)

        task.add_done_callback(remove_completed_task)

    def _stop_progress_monitor(
        self,
        job_id: str,
    ) -> None:
        task = self._progress_tasks.pop(job_id, None)

        if task is not None and not task.done():
            task.cancel()

    async def _monitor_comfyui_progress(
        self,
        job_id: str,
    ) -> None:
        with self._lock:
            stored_job = self._jobs.get(job_id)
            prompt_id = (
                stored_job.comfy_prompt_id
                if stored_job is not None
                else None
            )

        if not prompt_id:
            return

        try:
            async for message in comfy_client.listen_events(job_id):
                message_type = message.get("type")
                data = message.get("data", {})

                if not isinstance(data, dict):
                    continue

                if message_type == "progress":
                    self._apply_comfyui_progress(
                        job_id=job_id,
                        prompt_id=str(data.get("prompt_id", "")),
                        node_id=str(data.get("node", "")),
                        value=data.get("value"),
                        maximum=data.get("max"),
                    )

                if (
                    message_type == "executing"
                    and data.get("node") is None
                    and data.get("prompt_id") == prompt_id
                ):
                    return

        except asyncio.CancelledError:
            raise
        except Exception as error:
            print(
                f"Unable to monitor generation progress "
                f"for {job_id}: {error}"
            )

    def _apply_comfyui_progress(
        self,
        job_id: str,
        prompt_id: str,
        node_id: str,
        value: Any,
        maximum: Any,
    ) -> None:
        if node_id not in {"1", "8", "247"}:
            return

        if not isinstance(value, (int, float)):
            return

        if not isinstance(maximum, (int, float)) or maximum <= 0:
            return

        with self._lock:
            stored_job = self._jobs.get(job_id)

            if stored_job is None:
                return

            if stored_job.comfy_prompt_id != prompt_id:
                return

            if stored_job.response.status in {
                GenerationStatus.COMPLETED,
                GenerationStatus.FAILED,
                GenerationStatus.CANCELLED,
            }:
                return

            sampler_progress = 10 + round(
                min(max(value / maximum, 0), 1) * 85
            )
            progress = max(
                stored_job.response.progress,
                sampler_progress,
            )

            if (
                stored_job.response.status == GenerationStatus.RUNNING
                and stored_job.response.progress == progress
            ):
                return

            stored_job.response = stored_job.response.model_copy(
                update={
                    "status": GenerationStatus.RUNNING,
                    "progress": progress,
                }
            )

        self._persist_job(job_id, stored_job)

    def _extract_node_image(
        self,
        history_entry: dict[str, Any],
        node_id: str,
    ) -> dict[str, Any] | None:
        outputs = history_entry.get(
            "outputs",
            {},
        )

        node_output = outputs.get(node_id)

        if not node_output:
            return None

        images = node_output.get("images")

        if not images:
            return None

        return images[0]

    def _get_width(
        self,
        resolution_id: str,
    ) -> int:
        if resolution_id == "portrait":
            return 768

        if resolution_id == "landscape":
            return 1152

        return 1024

    def _read_image_size(
        self,
        image_path: Path,
    ) -> tuple[int, int]:
        try:
            with Image.open(image_path) as image:
                width, height = image.size
                image.verify()
        except (OSError, UnidentifiedImageError) as error:
            raise ValueError(
                "Input image is not a valid PNG, JPEG, or WebP image."
            ) from error

        if width <= 0 or height <= 0:
            raise ValueError(
                "Input image dimensions must be positive."
            )

        return width, height

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
            output_width=stored_job.output_width,
            output_height=stored_job.output_height,
            history_saved=stored_job.history_saved,
            mask_prompt=response.mask_prompt,
            mask_preview_url=response.mask_preview_url,
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
            mask_prompt=persisted.mask_prompt,
            mask_preview_url=persisted.mask_preview_url,
            image=persisted.image,
            error=persisted.error,
        )

        return StoredGenerationJob(
            response=response,
            request=persisted.request,
            comfy_prompt_id=persisted.comfy_prompt_id,
            history_saved=persisted.history_saved,
            actual_seed=persisted.actual_seed,
            output_width=persisted.output_width,
            output_height=persisted.output_height,
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
