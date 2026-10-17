from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.schemas.training import DatasetImageResponse, DatasetResponse, TrainingCreatedResponse, TrainingJobResponse, TrainingRequest
from app.services.dataset_service import dataset_service
from app.services.ai_toolkit_backend import AIToolkitBackendError
from app.services.training_service import OUTPUT_DIR, training_service

router = APIRouter(prefix="/training", tags=["Training"])
settings = get_settings()


@router.get("/datasets", response_model=list[DatasetResponse])
async def list_datasets() -> list[DatasetResponse]:
    return dataset_service.list_datasets()


@router.post("/datasets", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(name: str = Form(...), files: list[UploadFile] = File(...)) -> DatasetResponse:
    try:
        return await dataset_service.create_dataset(name, files)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/datasets/{dataset_id}/images", response_model=list[DatasetImageResponse])
async def list_dataset_images(
    dataset_id: str,
) -> list[DatasetImageResponse]:
    images = dataset_service.list_images(
        dataset_id,
        f"{settings.public_api_url}{settings.api_prefix}/training/datasets",
    )
    if images is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found.",
        )
    return images


@router.get("/datasets/{dataset_id}/images/{filename}")
async def get_dataset_image(
    dataset_id: str,
    filename: str,
) -> FileResponse:
    path = dataset_service.get_image_path(dataset_id, filename)
    if path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset image not found.",
        )
    return FileResponse(path)


@router.get("/jobs", response_model=list[TrainingJobResponse])
async def list_jobs() -> list[TrainingJobResponse]:
    return training_service.list_jobs()


@router.post("/jobs", response_model=TrainingCreatedResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_job(request: TrainingRequest) -> TrainingCreatedResponse:
    try:
        return TrainingCreatedResponse(job=await training_service.create_job(request))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIToolkitBackendError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/jobs/{job_id}", response_model=TrainingJobResponse)
async def get_job(job_id: str) -> TrainingJobResponse:
    job = training_service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training job not found.")
    return job


@router.delete("/jobs/{job_id}", response_model=TrainingJobResponse)
async def cancel_job(job_id: str) -> TrainingJobResponse:
    job = await training_service.cancel_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training job not found.")
    return job


@router.get("/jobs/{job_id}/download")
async def download_lora(job_id: str) -> FileResponse:
    job = training_service.get_job(job_id)
    if job is None or not job.output_filename:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training output not found.")
    path = OUTPUT_DIR / job_id / Path(job.output_filename).name
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training output file not found.")
    return FileResponse(path, filename=path.name, media_type="application/octet-stream")
