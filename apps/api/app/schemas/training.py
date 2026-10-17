from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class TrainingStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DatasetResponse(BaseModel):
    id: str
    name: str
    image_count: int = Field(ge=0)
    created_at: datetime


class DatasetImageResponse(BaseModel):
    filename: str
    image_url: str


class TrainingRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    dataset_id: str = Field(min_length=1)
    base_model: str = Field(min_length=1)
    network_rank: int = Field(default=16, ge=1, le=256)
    learning_rate: float = Field(default=0.0001, gt=0, le=1)
    max_train_steps: int = Field(default=1000, ge=1, le=1_000_000)
    batch_size: int = Field(default=1, ge=1, le=64)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Training name must not be empty.")
        return value


class TrainingJobResponse(BaseModel):
    id: str
    name: str
    dataset_id: str
    base_model: str
    status: TrainingStatus
    progress: int = Field(ge=0, le=100)
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None
    output_filename: str | None = None
    logs: list[str] = Field(default_factory=list)


class TrainingCreatedResponse(BaseModel):
    job: TrainingJobResponse
