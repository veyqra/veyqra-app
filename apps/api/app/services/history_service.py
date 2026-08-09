from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any

from app.schemas.history import (
    HistoryItemResponse,
    HistoryListResponse,
)

API_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = API_ROOT / "data"

HISTORY_PATH = DATA_DIR / "history.json"


class HistoryService:
    def __init__(self) -> None:
        self._lock = Lock()

        DATA_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        if not HISTORY_PATH.exists():
            HISTORY_PATH.write_text(
                "[]",
                encoding="utf-8",
            )

    def list_items(
        self,
        limit: int = 100,
    ) -> HistoryListResponse:
        items = self._read_items()

        parsed_items = [
            HistoryItemResponse.model_validate(item)
            for item in items
        ]

        parsed_items.sort(
            key=lambda item: item.created_at,
            reverse=True,
        )

        return HistoryListResponse(
            items=parsed_items[:limit],
            total=len(parsed_items),
        )

    def add_item(
        self,
        item: HistoryItemResponse,
    ) -> HistoryItemResponse:
        with self._lock:
            items = self._read_items_unlocked()

            items.append(
                item.model_dump(
                    mode="json",
                )
            )

            self._write_items_unlocked(items)

        return item

    def delete_item(
        self,
        item_id: str,
    ) -> bool:
        with self._lock:
            items = self._read_items_unlocked()

            filtered = [
                item
                for item in items
                if item.get("id") != item_id
            ]

            if len(filtered) == len(items):
                return False

            self._write_items_unlocked(filtered)

        return True

    def clear(self) -> None:
        with self._lock:
            self._write_items_unlocked([])

    def _read_items(self) -> list[dict[str, Any]]:
        with self._lock:
            return self._read_items_unlocked()

    def _read_items_unlocked(
        self,
    ) -> list[dict[str, Any]]:
        try:
            raw = HISTORY_PATH.read_text(
                encoding="utf-8",
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

    def _write_items_unlocked(
        self,
        items: list[dict[str, Any]],
    ) -> None:
        HISTORY_PATH.write_text(
            json.dumps(
                items,
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )


history_service = HistoryService()
