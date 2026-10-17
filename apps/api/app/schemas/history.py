from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def normalize_tags(values: list[str]) -> list[str]:
    tags = list(dict.fromkeys(value.strip().casefold() for value in values if value.strip()))
    if len(tags) > 30 or any(len(tag) > 50 for tag in tags):
        raise ValueError("Use at most 30 tags with at most 50 characters each.")
    return tags


class HistoryItemResponse(BaseModel):
    id: str
    prompt: str
    negative_prompt: str
    model_id: str
    model_name: str
    lora_id: str
    lora_strength: float
    image_filename: str | None = None
    image_url: str
    favorite: bool = False
    project: str = ""
    tags: list[str] = Field(default_factory=list)
    source_image_id: str | None = None
    upscale_model: str | None = None
    upscale_factor: int | None = None
    sampler: str = "dpmpp_2m"
    scheduler: str = "karras"
    width: int
    height: int
    seed: int
    steps: int
    guidance: float
    created_at: datetime


class HistoryListResponse(BaseModel):
    items: list[HistoryItemResponse]
    total: int


class HistoryUpdate(BaseModel):
    favorite: bool
    project: str = Field(default="", max_length=100)
    tags: list[str] | None = Field(default=None, max_length=30)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, values: list[str] | None) -> list[str] | None:
        return normalize_tags(values) if values is not None else None


class HistoryBatchUpdate(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=500)
    favorite: bool | None = None
    project: str | None = Field(default=None, max_length=100)
    add_tags: list[str] = Field(default_factory=list, max_length=30)
    remove_tags: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("add_tags", "remove_tags")
    @classmethod
    def validate_tags(cls, values: list[str]) -> list[str]:
        return normalize_tags(values)


class UpscaleRequest(BaseModel):
    model: str = Field(min_length=1)
    factor: int = Field(default=2, ge=2, le=4)
