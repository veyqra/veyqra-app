from __future__ import annotations

from datetime import UTC, datetime
from threading import Lock
from time import monotonic
from uuid import uuid4

from app.schemas.generation import (
    GeneratedImageResponse,
    GenerateRequest,
    GenerationJobResponse,
    GenerationStatus,
)

MODEL_NAMES: dict[str, str] = {
    "flux-dev": "FLUX.1 Dev",
    "juggernaut-xl": "Juggernaut XL",
}

RESOLUTIONS: dict[str, tuple[int, int]] = {
    "portrait": (768, 1152),
    "square": (1024, 1024),
    "landscape": (1152, 768),
}


class StoredGenerationJob:
    def __init__(
        self,
        response: GenerationJobResponse,
        request: GenerateRequest,
    ) -> None:
        self.response = response
        self.request = request
        self.started_at = monotonic()


class GenerationService:
    """
    In-memory job service.

    This is deliberately temporary. A later commit replaces the simulated
    completion with a ComfyUI adapter and persistent job storage.
    """

    def __init__(self) -> None:
        self._jobs: dict[str, StoredGenerationJob] = {}
        self._lock = Lock()

    def create_job(
        self,
        request: GenerateRequest,
    ) -> GenerationJobResponse:
        job_id = str(uuid4())
        model_name = MODEL_NAMES.get(request.model_id, request.model_id)

        response = GenerationJobResponse(
            id=job_id,
            prompt=request.prompt,
            model_name=model_name,
            status=GenerationStatus.QUEUED,
            progress=0,
            created_at=datetime.now(UTC),
        )

        with self._lock:
            self._jobs[job_id] = StoredGenerationJob(
                response=response,
                request=request,
            )

        return response

    def get_job(self, job_id: str) -> GenerationJobResponse | None:
        with self._lock:
            stored_job = self._jobs.get(job_id)

            if stored_job is None:
                return None

            self._advance_simulation(stored_job)
            return stored_job.response

    def list_jobs(self) -> list[GenerationJobResponse]:
        with self._lock:
            jobs = list(self._jobs.values())

            for stored_job in jobs:
                self._advance_simulation(stored_job)

            return sorted(
                (stored_job.response for stored_job in jobs),
                key=lambda job: job.created_at,
                reverse=True,
            )

    def cancel_job(self, job_id: str) -> GenerationJobResponse | None:
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

    def _advance_simulation(self, stored_job: StoredGenerationJob) -> None:
        current = stored_job.response

        if current.status in {
            GenerationStatus.COMPLETED,
            GenerationStatus.FAILED,
            GenerationStatus.CANCELLED,
        }:
            return

        elapsed = monotonic() - stored_job.started_at

        if elapsed < 0.5:
            stored_job.response = current.model_copy(
                update={
                    "status": GenerationStatus.QUEUED,
                    "progress": 5,
                }
            )
            return

        if elapsed < 1.5:
            stored_job.response = current.model_copy(
                update={
                    "status": GenerationStatus.RUNNING,
                    "progress": 35,
                }
            )
            return

        if elapsed < 2.5:
            stored_job.response = current.model_copy(
                update={
                    "status": GenerationStatus.RUNNING,
                    "progress": 75,
                }
            )
            return

        width, height = RESOLUTIONS.get(
            stored_job.request.resolution_id,
            (1024, 1024),
        )

        image = GeneratedImageResponse(
            id=str(uuid4()),
            prompt=stored_job.request.prompt,
            image_url=(
                "https://placehold.co/"
                f"{width}x{height}/18181b/a78bfa"
                "?text=Vyrra+API+Preview"
            ),
            model_name=current.model_name,
            width=width,
            height=height,
            created_at=datetime.now(UTC),
        )

        stored_job.response = current.model_copy(
            update={
                "status": GenerationStatus.COMPLETED,
                "progress": 100,
                "image": image,
            }
        )


generation_service = GenerationService()
