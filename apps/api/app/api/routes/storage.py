from fastapi import (
    APIRouter,
    HTTPException,
    status,
)
from fastapi.responses import FileResponse

from app.services.storage_service import (
    storage_service,
)

router = APIRouter(
    prefix="/storage",
    tags=["Storage"],
)


@router.get("/history/{filename}")
async def get_history_image(
    filename: str,
) -> FileResponse:
    path = storage_service.get_image_path(
        filename
    )

    if path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History image not found",
        )

    return FileResponse(path)
