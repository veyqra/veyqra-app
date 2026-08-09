from fastapi import APIRouter, HTTPException, Query, Response, status

from app.schemas.history import HistoryListResponse
from app.services.history_service import history_service

router = APIRouter(
    prefix="/history",
    tags=["History"],
)


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
) -> HistoryListResponse:
    return history_service.list_items(
        limit=limit,
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
