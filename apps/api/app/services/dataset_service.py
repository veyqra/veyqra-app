from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from shutil import rmtree
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.schemas.training import DatasetImageResponse, DatasetResponse
from app.services.training_store import training_store

API_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = API_ROOT / "data" / "datasets"
ALLOWED_CONTENT_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


class DatasetService:
    async def create_dataset(self, name: str, files: list[UploadFile]) -> DatasetResponse:
        name = name.strip()
        if not name:
            raise ValueError("Dataset name must not be empty.")
        if not files:
            raise ValueError("Add at least one image to the dataset.")

        dataset_id = str(uuid4())
        directory = DATASET_DIR / dataset_id
        directory.mkdir(parents=True, exist_ok=False)
        image_count = 0
        try:
            for file in files:
                extension = ALLOWED_CONTENT_TYPES.get(file.content_type or "")
                if extension is None:
                    raise ValueError("Datasets only support PNG, JPEG, and WebP images.")
                content = await file.read()
                if not content:
                    raise ValueError("Dataset contains an empty image.")
                destination = directory / f"{uuid4().hex}{extension}"
                destination.write_bytes(content)
                self._validate_image(destination)
                # AI Toolkit expects a caption beside each training image.
                # The dataset name is a safe baseline trigger until editable
                # per-image captions are added to the workspace.
                destination.with_suffix(".txt").write_text(
                    name,
                    encoding="utf-8",
                )
                image_count += 1
        except Exception:
            rmtree(directory, ignore_errors=True)
            raise

        dataset = DatasetResponse(id=dataset_id, name=name, image_count=image_count, created_at=datetime.now(UTC))
        training_store.save_dataset(dataset)
        return dataset

    def get_dataset_path(self, dataset_id: str) -> Path | None:
        dataset = training_store.get_dataset(dataset_id)
        path = DATASET_DIR / dataset_id
        return path if dataset and path.is_dir() else None

    def list_datasets(self) -> list[DatasetResponse]:
        return training_store.list_datasets()

    def list_images(
        self,
        dataset_id: str,
        image_url_prefix: str,
    ) -> list[DatasetImageResponse] | None:
        path = self.get_dataset_path(dataset_id)
        if path is None:
            return None

        return [
            DatasetImageResponse(
                filename=image.name,
                image_url=(
                    f"{image_url_prefix}/{dataset_id}/images/"
                    f"{image.name}"
                ),
            )
            for image in sorted(path.iterdir())
            if image.is_file()
            and image.suffix.lower()
            in {".png", ".jpg", ".jpeg", ".webp"}
        ]

    def get_image_path(
        self,
        dataset_id: str,
        filename: str,
    ) -> Path | None:
        dataset_path = self.get_dataset_path(dataset_id)
        if dataset_path is None:
            return None

        path = dataset_path / Path(filename).name
        if path.suffix.lower() not in {
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
        }:
            return None

        return path if path.is_file() else None

    def _validate_image(self, path: Path) -> None:
        try:
            with Image.open(path) as image:
                image.verify()
        except (OSError, UnidentifiedImageError) as error:
            raise ValueError("Dataset contains an invalid image.") from error


dataset_service = DatasetService()
