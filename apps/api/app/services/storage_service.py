from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.services.comfyui_client import (
    ComfyUIClient,
    ComfyUIError,
)

API_ROOT = Path(__file__).resolve().parents[2]
HISTORY_IMAGE_DIR = API_ROOT / "data" / "history-images"

settings = get_settings()


class StorageService:
    def __init__(self) -> None:
        self.comfyui = ComfyUIClient(settings.comfyui_url)

        HISTORY_IMAGE_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

    async def store_comfyui_image(
        self,
        filename: str,
        subfolder: str = "",
        folder_type: str = "output",
    ) -> str:
        data, content_type = await self.comfyui.get_image(
            filename=filename,
            subfolder=subfolder,
            folder_type=folder_type,
        )

        extension = self._extension_from_content_type(
            content_type
        )

        stored_filename = (
            f"{uuid4()}{extension}"
        )

        target = (
            HISTORY_IMAGE_DIR
            / stored_filename
        )

        target.write_bytes(data)

        return stored_filename

    def get_image_path(
        self,
        filename: str,
    ) -> Path | None:
        safe_name = Path(filename).name

        path = (
            HISTORY_IMAGE_DIR
            / safe_name
        )

        if not path.exists():
            return None

        if not path.is_file():
            return None

        return path

    def delete_image(
        self,
        filename: str,
    ) -> bool:
        path = self.get_image_path(filename)

        if path is None:
            return False

        path.unlink()
        return True

    def clear_images(self) -> None:
        for path in HISTORY_IMAGE_DIR.iterdir():
            if path.is_file():
                path.unlink()

    def _extension_from_content_type(
        self,
        content_type: str,
    ) -> str:
        normalized = (
            content_type
            .split(";")[0]
            .strip()
            .lower()
        )

        extensions = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/webp": ".webp",
        }

        return extensions.get(
            normalized,
            ".png",
        )


storage_service = StorageService()
