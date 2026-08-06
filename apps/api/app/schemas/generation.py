from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class GenerationStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=10_000)
    negative_prompt: str = Field(default="", max_length=10_000)

    model_id: str = Field(min_length=1)
    lora_id: str = Field(default="none")
    lora_strength: float = Field(default=1.0, ge=0.0, le=2.0)

    resolution_id: str = Field(min_length=1)
    seed: int = -1
    steps: int = Field(default=28, ge=1, le=100)
    guidance: float = Field(default=3.5, ge=0.0, le=30.0)
    batch_size: int = Field(default=1, ge=1, le=8)

    @field_validator("prompt")
    @classmethod
    def strip_prompt(cls, value: str) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError("Prompt must not be empty")

        return cleaned


class GeneratedImageResponse(BaseModel):
    id: str
    prompt: str
    image_url: str
    model_name: str
    width: int
    height: int
    created_at: datetime


class GenerationJobResponse(BaseModel):
    id: str
    prompt: str
    model_name: str
    status: GenerationStatus
    progress: int = Field(ge=0, le=100)
    created_at: datetime
    error: str | None = None
    image: GeneratedImageResponse | None = None


class GenerationCreatedResponse(BaseModel):
    job: GenerationJobResponse
