from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any
from app.services.storage_service import storage_service

from app.schemas.history import (
    HistoryItemResponse,
    HistoryListResponse,
    HistoryBatchUpdate,
    normalize_tags,
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
        offset: int = 0,
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
            items=parsed_items[offset:offset + limit],
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

    def get_item(
        self,
        item_id: str,
    ) -> HistoryItemResponse | None:
        items = self._read_items()
        target = next(
            (
                item
                for item in items
                if item.get("id") == item_id
            ),
            None,
        )

        if target is None:
            return None

        return HistoryItemResponse.model_validate(target)

    def delete_item(
        self,
        item_id: str,
    ) -> bool:
        with self._lock:
            items = self._read_items_unlocked()

            target = next(
                (
                    item
                    for item in items
                    if item.get("id") == item_id
                ),
                None,
            )

            if target is None:
                return False

            filtered = [
                item
                for item in items
                if item.get("id") != item_id
            ]

            self._write_items_unlocked(
                filtered
            )

        image_filename = target.get(
            "image_filename"
        )

        if image_filename:
            storage_service.delete_image(
                image_filename
            )

        return True

    def update_item(self, item_id: str, favorite: bool, project: str, tags: list[str] | None = None) -> HistoryItemResponse | None:
        with self._lock:
            items = self._read_items_unlocked()
            for item in items:
                if item.get("id") == item_id:
                    item.update(favorite=favorite, project=project.strip())
                    if tags is not None:
                        item["tags"] = normalize_tags(tags)
                    self._write_items_unlocked(items)
                    return HistoryItemResponse.model_validate(item)
        return None

    def update_many(self, request: HistoryBatchUpdate) -> list[HistoryItemResponse]:
        with self._lock:
            items = self._read_items_unlocked()
            ids = set(request.ids)
            if ids - {item["id"] for item in items}:
                raise KeyError("Some selected images no longer exist. Refresh the history.")
            updated = []
            for item in items:
                if item["id"] not in ids:
                    continue
                if request.favorite is not None:
                    item["favorite"] = request.favorite
                if request.project is not None:
                    item["project"] = request.project.strip()
                if request.add_tags or request.remove_tags:
                    item["tags"] = normalize_tags([
                        tag for tag in item.get("tags", []) + request.add_tags
                        if tag.strip().casefold() not in request.remove_tags
                    ])
                updated.append(HistoryItemResponse.model_validate(item))
            # Validation completes for the whole selection before anything is saved.
            self._write_items_unlocked(items)
            return updated

    def clear(self) -> None:
        with self._lock:
            self._write_items_unlocked([])

        storage_service.clear_images()

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
        temporary_path = HISTORY_PATH.with_suffix(".tmp")
        temporary_path.write_text(
            json.dumps(
                items,
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        temporary_path.replace(HISTORY_PATH)


history_service = HistoryService()
