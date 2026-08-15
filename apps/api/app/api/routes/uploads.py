from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(
    prefix="/uploads",
    tags=["uploads"],
)

UPLOAD_DIR = Path("data/uploads")
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
