from fastapi import APIRouter, HTTPException, status

from app.schemas.model import ModelCatalogResponse
from app.services.comfyui_client import ComfyUIError
from app.services.model_service import model_service

router = APIRouter(
    prefix="/models",
    tags=["Models"],
)


@router.get("/catalog", response_model=ModelCatalogResponse)
async def get_model_catalog() -> ModelCatalogResponse:
    try:
        return await model_service.get_catalog()

    except ComfyUIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get("/loras")
async def list_loras() -> dict[str, list[str]]:
    try:
        loras = await model_service.list_loras()

    except ComfyUIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "loras": loras,
    }


@router.get("/unets")
async def list_unets() -> dict[str, list[str]]:
    try:
        models = await model_service.list_unets()

    except ComfyUIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "models": models,
    }
