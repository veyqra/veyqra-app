from fastapi import APIRouter, HTTPException, Response, status

from app.schemas.generation import (
    GenerateRequest,
    GenerationCreatedResponse,
    GenerationJobResponse,
)
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
    job = generation_service.create_job(request)

    return GenerationCreatedResponse(job=job)


@router.get(
    "",
    response_model=list[GenerationJobResponse],
)
async def list_generations() -> list[GenerationJobResponse]:
    return generation_service.list_jobs()


@router.get(
    "/{job_id}",
    response_model=GenerationJobResponse,
)
async def get_generation(job_id: str) -> GenerationJobResponse:
    job = generation_service.get_job(job_id)

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
    job = generation_service.cancel_job(job_id)

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
    # Persistent queue clearing follows in a later commit.
    return Response(status_code=status.HTTP_204_NO_CONTENT)
