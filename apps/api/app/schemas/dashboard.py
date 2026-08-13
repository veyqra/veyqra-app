from pydantic import BaseModel

from app.schemas.generation import GenerationJobResponse


class DashboardSystemResponse(BaseModel):
    comfyui_online: bool
    gpu_online: bool


class DashboardStatsResponse(BaseModel):
    diffusion_models: int
    loras: int
    total_models: int
    active_jobs: int
    completed_jobs: int
    failed_jobs: int


class DashboardResponse(BaseModel):
    system: DashboardSystemResponse
    stats: DashboardStatsResponse
    recent_jobs: list[GenerationJobResponse]
