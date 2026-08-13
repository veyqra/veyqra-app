from fastapi import APIRouter, HTTPException, Response, status

from app.schemas.generation import (
    GenerateRequest,
    GenerationCreatedResponse,
    GenerationJobResponse,
)
from app.services.comfyui_client import ComfyUIError
from app.services.generation_service import generation_service

router = APIRouter(prefix="/generations", tags=["Generations"])


@router.post(
    "",
    response_model=GenerationCreatedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_generation(
    request: GenerateRequest,
) -> GenerationCreatedResponse:
    try:
        job = await generation_service.create_job(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ComfyUIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return GenerationCreatedResponse(job=job)


@router.get(
    "",
    response_model=list[GenerationJobResponse],
)
async def list_generations() -> list[GenerationJobResponse]:
    try:
        return await generation_service.list_jobs()
    except ComfyUIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get(
    "/{job_id}",
    response_model=GenerationJobResponse,
)
async def get_generation(job_id: str) -> GenerationJobResponse:
    try:
        job = await generation_service.get_job(job_id)
    except ComfyUIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found",
        )

    return job


@router.delete(
    "/{job_id}",
    response_model=GenerationJobResponse,
)
async def cancel_generation(job_id: str) -> GenerationJobResponse:
    job = await generation_service.cancel_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found",
        )

    return job


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def clear_generations() -> Response:
    generation_service.clear_jobs()

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )
