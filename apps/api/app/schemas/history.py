from datetime import datetime

from pydantic import BaseModel


class HistoryItemResponse(BaseModel):
    id: str
    prompt: str
    negative_prompt: str
    model_id: str
    model_name: str
    lora_id: str
    lora_strength: float
    image_url: str
    width: int
    height: int
    seed: int
    steps: int
    guidance: float
    created_at: datetime


class HistoryListResponse(BaseModel):
    items: list[HistoryItemResponse]
    total: int
