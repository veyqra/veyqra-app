from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from uuid import uuid4

from app.schemas.training import TrainingJobResponse, TrainingRequest, TrainingStatus
from app.services.dataset_service import dataset_service
from app.services.ai_toolkit_backend import (
    AIToolkitBackendError,
    ai_toolkit_backend,
)
from app.services.training_store import training_store

API_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = API_ROOT / "data" / "training-output"
TERMINAL_STATUSES = {TrainingStatus.COMPLETED, TrainingStatus.FAILED, TrainingStatus.CANCELLED}


class TrainingService:
    def __init__(self) -> None:
        self._jobs = {job.id: job for job in training_store.list_jobs()}
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._lock = Lock()

    def list_jobs(self) -> list[TrainingJobResponse]:
        with self._lock:
            return sorted(self._jobs.values(), key=lambda job: job.created_at, reverse=True)

    def get_job(self, job_id: str) -> TrainingJobResponse | None:
        with self._lock:
            return self._jobs.get(job_id)

    async def create_job(self, request: TrainingRequest) -> TrainingJobResponse:
        dataset_path = dataset_service.get_dataset_path(request.dataset_id)
        if dataset_path is None:
            raise ValueError("Dataset was not found.")
        error = ai_toolkit_backend.availability_error()
        if error:
            raise AIToolkitBackendError(error)

        job = TrainingJobResponse(id=str(uuid4()), name=request.name, dataset_id=request.dataset_id, base_model=request.base_model, status=TrainingStatus.QUEUED, progress=0, created_at=datetime.now(UTC))
        self._save(job)
        self._tasks[job.id] = asyncio.create_task(self._run(job.id, request, dataset_path))
        return job

    async def cancel_job(self, job_id: str) -> TrainingJobResponse | None:
        job = self.get_job(job_id)
        if job is None:
            return None
        if job.status in TERMINAL_STATUSES:
            return job
        await ai_toolkit_backend.stop(job_id)
        task = self._tasks.get(job_id)
        if task and not task.done():
            task.cancel()
        return self._update(job, status=TrainingStatus.CANCELLED, completed_at=datetime.now(UTC), logs=[*job.logs, "Training cancelled."])

    async def _run(self, job_id: str, request: TrainingRequest, dataset_path: Path) -> None:
        job = self.get_job(job_id)
        if job is None:
            return
        job = self._update(job, status=TrainingStatus.RUNNING, started_at=datetime.now(UTC), progress=1, logs=[*job.logs, "Training queued by Veyqra."])
        try:
            artifact = await ai_toolkit_backend.train(job_id, request, dataset_path, OUTPUT_DIR / job_id, lambda message: self._append_log(job_id, message))
            job = self.get_job(job_id)
            if job and job.status != TrainingStatus.CANCELLED:
                self._update(job, status=TrainingStatus.COMPLETED, progress=100, completed_at=datetime.now(UTC), output_filename=artifact.name)
        except asyncio.CancelledError:
            raise
        except Exception as error:
            job = self.get_job(job_id)
            if job and job.status != TrainingStatus.CANCELLED:
                self._update(job, status=TrainingStatus.FAILED, completed_at=datetime.now(UTC), error=str(error), logs=[*job.logs, f"Error: {error}"])
        finally:
            self._tasks.pop(job_id, None)

    async def _append_log(self, job_id: str, message: str) -> None:
        job = self.get_job(job_id)
        if job is None or job.status == TrainingStatus.CANCELLED:
            return
        logs = [*job.logs, message][-500:]
        progress = job.progress
        if "steps:" in message.lower():
            progress = max(progress, 2)
        self._update(job, logs=logs, progress=progress)

    def _update(self, job: TrainingJobResponse, **changes: object) -> TrainingJobResponse:
        return self._save(job.model_copy(update=changes))

    def _save(self, job: TrainingJobResponse) -> TrainingJobResponse:
        with self._lock:
            self._jobs[job.id] = job
        training_store.save_job(job)
        return job


training_service = TrainingService()
