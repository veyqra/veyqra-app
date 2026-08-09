from fastapi import APIRouter, HTTPException, status

from app.core.config import get_settings
from app.services.comfyui_client import (
    ComfyUIClient,
    ComfyUIError,
)

router = APIRouter(
    prefix="/comfyui",
    tags=["ComfyUI"],
)

settings = get_settings()


@router.get("/status")
async def comfyui_status() -> dict[str, object]:
    client = ComfyUIClient(settings.comfyui_url)

    try:
        stats = await client.health()

    except ComfyUIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "connected": True,
        "url": settings.comfyui_url,
        "stats": stats,
    }
