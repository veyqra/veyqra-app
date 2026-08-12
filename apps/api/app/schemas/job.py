from datetime import datetime

from pydantic import BaseModel

from app.schemas.generation import (
    GenerateRequest,
    GeneratedImageResponse,
    GenerationStatus,
)


class PersistedGenerationJob(BaseModel):
    id: str
    request: GenerateRequest
    status: GenerationStatus
    progress: int
    model_name: str
    created_at: datetime

    comfy_prompt_id: str | None = None
    actual_seed: int | None = None
    history_saved: bool = False
    image: GeneratedImageResponse | None = None
    error: str | None = None
