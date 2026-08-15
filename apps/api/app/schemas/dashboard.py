from pydantic import BaseModel

from app.schemas.generation import GenerationJobResponse


class GpuStatusResponse(BaseModel):
    name: str | None = None
    type: str | None = None
    vram_total: int | None = None
    vram_free: int | None = None
    torch_vram_total: int | None = None
    torch_vram_free: int | None = None


class DashboardSystemResponse(BaseModel):
    comfyui_online: bool = False
    gpu_online: bool = False
    gpu: GpuStatusResponse | None = None
    queue_running: int = 0
    queue_pending: int = 0


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
