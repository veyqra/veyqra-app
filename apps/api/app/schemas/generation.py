from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator, model_validator


class GenerationStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class GenerationMode(StrEnum):
    TEXT_TO_IMAGE = "text_to_image"
    IMAGE_TO_IMAGE = "image_to_image"
    INPAINT = "inpaint"


class SamplerName(StrEnum):
    EULER = "euler"
    EULER_ANCESTRAL = "euler_ancestral"
    DPM_PP_2M = "dpmpp_2m"
    DPM_PP_2M_SDE = "dpmpp_2m_sde"


class SchedulerName(StrEnum):
    NORMAL = "normal"
    KARRAS = "karras"
    EXPONENTIAL = "exponential"


class GenerateRequest(BaseModel):
    prompt: str = Field(
        min_length=1,
        max_length=10_000,
    )
    negative_prompt: str = Field(
        default="",
        max_length=10_000,
    )

    mode: GenerationMode = GenerationMode.TEXT_TO_IMAGE
    input_image: str | None = None

    model_id: str = Field(min_length=1)
    lora_id: str = Field(default="none")
    lora_strength: float = Field(
        default=1.0,
        ge=0.0,
        le=2.0,
    )

    resolution_id: str = Field(min_length=1)
    seed: int = -1
    steps: int = Field(
        default=28,
        ge=1,
        le=100,
    )
    guidance: float = Field(
        default=3.5,
        ge=0.0,
        le=30.0,
    )
    sampler: SamplerName = SamplerName.DPM_PP_2M
    scheduler: SchedulerName = SchedulerName.KARRAS
    batch_size: int = Field(
        default=1,
        ge=1,
        le=8,
    )
    denoise_strength: float = Field(
        default=0.65,
        ge=0.0,
        le=1.0,
    )
    # mask_image removed; automatic mask generation uses mask_prompt
    mask_prompt: str = Field(default="", max_length=1000)
    mask_confidence: float = Field(default=0.3, ge=0.0, le=1.0)
    mask_expand: int = Field(default=40, ge=0, le=128)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "Prompt must not be empty."
            )

        return value

    @model_validator(mode="after")
    def validate_input_image(self):
        if (
            self.mode
            in {
                GenerationMode.IMAGE_TO_IMAGE,
                GenerationMode.INPAINT,
            }
            and not self.input_image
        ):
            raise ValueError(
                "An input image is required for this generation mode."
            )
        if (
            self.mode == GenerationMode.INPAINT
            and not self.mask_prompt.strip()
        ):
            # mask_prompt may be empty; it can be auto-extracted from `prompt`.
            pass

        return self


class GeneratedImageResponse(BaseModel):
    id: str
    prompt: str
    image_url: str
    mask_preview_url: str | None = None
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
    mask_prompt: str | None = None
    mask_preview_url: str | None = None
    image: GeneratedImageResponse | None = None


class GenerationCreatedResponse(BaseModel):
    job: GenerationJobResponse
    
