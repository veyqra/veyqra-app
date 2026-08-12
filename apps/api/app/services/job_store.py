from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from app.schemas.job import PersistedGenerationJob


API_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = API_ROOT / "data"
JOBS_PATH = DATA_DIR / "jobs.json"


class JobStore:
    def __init__(self) -> None:
        self._lock = Lock()

        DATA_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        if not JOBS_PATH.exists():
            JOBS_PATH.write_text(
                "[]",
                encoding="utf-8",
            )

    def list_jobs(
        self,
    ) -> list[PersistedGenerationJob]:
        with self._lock:
            items = self._read_unlocked()

        jobs = [
            PersistedGenerationJob.model_validate(item)
            for item in items
        ]

        return sorted(
            jobs,
            key=lambda job: job.created_at,
            reverse=True,
        )

    def get_job(
        self,
        job_id: str,
    ) -> PersistedGenerationJob | None:
        with self._lock:
            items = self._read_unlocked()

        for item in items:
            if item.get("id") == job_id:
                return PersistedGenerationJob.model_validate(
                    item
                )

        return None

    def save_job(
        self,
        job: PersistedGenerationJob,
    ) -> None:
        with self._lock:
            items = self._read_unlocked()

            serialized = job.model_dump(
                mode="json"
            )

            for index, item in enumerate(items):
                if item.get("id") == job.id:
                    items[index] = serialized
                    break
            else:
                items.append(serialized)

            self._write_unlocked(items)

    def delete_job(
        self,
        job_id: str,
    ) -> bool:
        with self._lock:
            items = self._read_unlocked()

            filtered = [
                item
                for item in items
                if item.get("id") != job_id
            ]

            if len(filtered) == len(items):
                return False

            self._write_unlocked(filtered)

        return True

    def clear(self) -> None:
        with self._lock:
            self._write_unlocked([])

    def _read_unlocked(
        self,
    ) -> list[dict]:
        try:
            raw = JOBS_PATH.read_text(
                encoding="utf-8"
            )

            data = json.loads(raw)

            if isinstance(data, list):
                return data

        except (
            OSError,
            json.JSONDecodeError,
        ):
            pass

        return []

    def _write_unlocked(
        self,
        items: list[dict],
    ) -> None:
        JOBS_PATH.write_text(
            json.dumps(
                items,
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )


job_store = JobStore()
