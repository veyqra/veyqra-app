from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from typing import Any

from app.schemas.training import DatasetResponse, TrainingJobResponse

API_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = API_ROOT / "data"
TRAINING_PATH = DATA_DIR / "training.json"


class TrainingStore:
    """Small, local persistence layer for datasets and training jobs."""

    def __init__(self) -> None:
        self._lock = Lock()
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not TRAINING_PATH.exists():
            self._write_unlocked({"datasets": [], "jobs": []})

    def list_datasets(self) -> list[DatasetResponse]:
        with self._lock:
            items = self._read_unlocked()["datasets"]
        return sorted((DatasetResponse.model_validate(item) for item in items), key=lambda item: item.created_at, reverse=True)

    def get_dataset(self, dataset_id: str) -> DatasetResponse | None:
        return next((item for item in self.list_datasets() if item.id == dataset_id), None)

    def save_dataset(self, dataset: DatasetResponse) -> None:
        self._save("datasets", dataset)

    def list_jobs(self) -> list[TrainingJobResponse]:
        with self._lock:
            items = self._read_unlocked()["jobs"]
        return sorted((TrainingJobResponse.model_validate(item) for item in items), key=lambda item: item.created_at, reverse=True)

    def get_job(self, job_id: str) -> TrainingJobResponse | None:
        return next((item for item in self.list_jobs() if item.id == job_id), None)

    def save_job(self, job: TrainingJobResponse) -> None:
        self._save("jobs", job)

    def _save(self, collection: str, value: DatasetResponse | TrainingJobResponse) -> None:
        with self._lock:
            data = self._read_unlocked()
            items = data[collection]
            serialized = value.model_dump(mode="json")
            for index, item in enumerate(items):
                if item.get("id") == value.id:
                    items[index] = serialized
                    break
            else:
                items.append(serialized)
            self._write_unlocked(data)

    def _read_unlocked(self) -> dict[str, list[dict[str, Any]]]:
        try:
            value = json.loads(TRAINING_PATH.read_text(encoding="utf-8"))
            if isinstance(value, dict) and isinstance(value.get("datasets"), list) and isinstance(value.get("jobs"), list):
                return value
        except (OSError, json.JSONDecodeError):
            pass
        return {"datasets": [], "jobs": []}

    def _write_unlocked(self, value: dict[str, list[dict[str, Any]]]) -> None:
        TRAINING_PATH.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")


training_store = TrainingStore()
