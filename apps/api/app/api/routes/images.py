from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.config import get_settings
from app.services.comfyui_client import (
    ComfyUIClient,
    ComfyUIError,
)

router = APIRouter(
    prefix="/images",
    tags=["Images"],
)

settings = get_settings()
client = ComfyUIClient(settings.comfyui_url)


@router.get("/comfyui")
async def get_comfyui_image(
    filename: str = Query(...),
    subfolder: str = Query(default=""),
    type: str = Query(default="output"),
) -> Response:
    try:
        data, content_type = await client.get_image(
            filename=filename,
            subfolder=subfolder,
            folder_type=type,
        )

    except ComfyUIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return Response(
        content=data,
        media_type=content_type,
    )
