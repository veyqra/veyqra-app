from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import get_settings
from app.services.comfyui_runtime import comfyui_runtime
from app.services.comfyui_client import (
    ComfyUIClient,
    ComfyUIError,
)

router = APIRouter(
    prefix="/comfyui",
    tags=["ComfyUI"],
)

settings = get_settings()


@router.get("/overview")
async def comfyui_overview() -> dict:
    return await comfyui_runtime.overview()


@router.post("/start", status_code=202)
async def start_comfyui(request: Request) -> dict:
    if request.headers.get("content-type", "").split(";")[0].strip() != "application/json":
        raise HTTPException(status_code=415, detail="Use application/json for runtime actions.")
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(status_code=403, detail="Runtime actions must originate from Veyqra.")
    try:
        return await comfyui_runtime.start()
    except (ValueError, OSError, TypeError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
