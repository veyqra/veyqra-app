from fastapi import APIRouter, HTTPException, Query, Response, status

from app.schemas.history import HistoryListResponse, HistoryItemResponse, HistoryUpdate, HistoryBatchUpdate, UpscaleRequest
from app.schemas.generation import GenerationCreatedResponse
from app.services.generation_service import generation_service
from app.services.comfyui_client import ComfyUIError
from app.services.history_service import history_service

router = APIRouter(
    prefix="/history",
    tags=["History"],
)


@router.get("/upscale-models", response_model=list[str])
async def list_upscale_models() -> list[str]:
    try:
        return await generation_service.list_upscale_models()
    except ComfyUIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{item_id}", response_model=HistoryItemResponse)
def update_history_item(item_id: str, request: HistoryUpdate) -> HistoryItemResponse:
    item = history_service.update_item(item_id, request.favorite, request.project, request.tags)
    if item is None:
        raise HTTPException(status_code=404, detail="History item not found")
    return item


@router.patch("", response_model=list[HistoryItemResponse])
def update_history_selection(request: HistoryBatchUpdate) -> list[HistoryItemResponse]:
    try:
        return history_service.update_many(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=exc.args[0]) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{item_id}/upscale", response_model=GenerationCreatedResponse, status_code=202)
async def upscale_history_item(item_id: str, request: UpscaleRequest) -> GenerationCreatedResponse:
    try:
        job = await generation_service.create_upscale_job(item_id, request.model, request.factor)
        return GenerationCreatedResponse(job=job)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ComfyUIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get(
    "",
    response_model=HistoryListResponse,
)
async def list_history(
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    offset: int = Query(default=0, ge=0),
) -> HistoryListResponse:
    return history_service.list_items(
        limit=limit,
        offset=offset,
    )


@router.delete("/{item_id}")
async def delete_history_item(
    item_id: str,
) -> dict[str, bool]:
    deleted = history_service.delete_item(
        item_id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History item not found",
        )

    return {
        "deleted": True,
    }


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def clear_history() -> Response:
    history_service.clear()

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )
