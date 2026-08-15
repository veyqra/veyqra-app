from pathlib import Path
from shutil import copyfile
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.services.history_service import history_service
from app.services.storage_service import storage_service

router = APIRouter(
    prefix="/uploads",
    tags=["uploads"],
)

API_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_DIR = API_ROOT / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
) -> dict[str, str]:
    extension = ALLOWED_CONTENT_TYPES.get(
        file.content_type or ""
    )

    if extension is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image type.",
        )

    filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    destination.write_bytes(content)

    return {
        "filename": filename,
        "content_type": file.content_type or "",
    }


@router.post("/image/from-history/{item_id}")
async def use_history_image(
    item_id: str,
) -> dict[str, str]:
    item = history_service.get_item(item_id)

    if item is None or not item.image_filename:
        raise HTTPException(
            status_code=404,
            detail="History image not found.",
        )

    source = storage_service.get_image_path(
        item.image_filename
    )

    if source is None:
        raise HTTPException(
            status_code=404,
            detail="Stored history image not found.",
        )

    content_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }
    extension = source.suffix.lower()
    content_type = content_types.get(extension)

    if content_type is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported history image type.",
        )

    filename = f"{uuid4().hex}{extension}"
    copyfile(source, UPLOAD_DIR / filename)

    return {
        "filename": filename,
        "content_type": content_type,
    }


@router.get("/image/{filename}")
async def get_uploaded_image(
    filename: str,
) -> FileResponse:
    path = UPLOAD_DIR / filename

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="Uploaded image not found.",
        )

    return FileResponse(path)
