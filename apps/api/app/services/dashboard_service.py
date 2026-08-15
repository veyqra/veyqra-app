from app.schemas.dashboard import (
    DashboardResponse,
    DashboardStatsResponse,
    DashboardSystemResponse,
    GpuStatusResponse,
)
from app.schemas.generation import GenerationStatus
from app.core.config import get_settings
from app.services.comfyui_client import (
    ComfyUIClient,
    ComfyUIError,
)
from app.services.generation_service import generation_service
from app.services.model_service import model_service

settings = get_settings()
comfy_client = ComfyUIClient(settings.comfyui_url)


async def get_local_system_status(
    client: ComfyUIClient,
) -> DashboardSystemResponse:
    try:
        system_stats = await client.get_system_stats()
        queue = await client.get_queue()
    except ComfyUIError:
        return DashboardSystemResponse()

    devices = system_stats.get("devices") or []
    device = devices[0] if devices else None
    gpu = None

    if isinstance(device, dict):
        gpu = GpuStatusResponse(
            name=device.get("name"),
            type=device.get("type"),
            vram_total=device.get("vram_total"),
            vram_free=device.get("vram_free"),
            torch_vram_total=device.get("torch_vram_total"),
            torch_vram_free=device.get("torch_vram_free"),
        )

    running = queue.get("queue_running") or []
    pending = queue.get("queue_pending") or []

    return DashboardSystemResponse(
        comfyui_online=True,
        gpu_online=gpu is not None,
        gpu=gpu,
        queue_running=(
            len(running) if isinstance(running, list) else 0
        ),
        queue_pending=(
            len(pending) if isinstance(pending, list) else 0
        ),
    )


class DashboardService:
    async def get_dashboard(
        self,
    ) -> DashboardResponse:
        jobs = await generation_service.list_jobs()

        active_jobs = sum(
            1
            for job in jobs
            if job.status
            in {
                GenerationStatus.QUEUED,
                GenerationStatus.RUNNING,
            }
        )

        completed_jobs = sum(
            1
            for job in jobs
            if job.status
            == GenerationStatus.COMPLETED
        )

        failed_jobs = sum(
            1
            for job in jobs
            if job.status
            == GenerationStatus.FAILED
        )

        catalog = await model_service.get_catalog()

        diffusion_models = len(
            catalog.diffusion_models
        )

        loras = len(
            catalog.loras
        )

        local_system = await get_local_system_status(
            comfy_client
        )

        return DashboardResponse(
            system=local_system,
            stats=DashboardStatsResponse(
                diffusion_models=diffusion_models,
                loras=loras,
                total_models=(
                    diffusion_models
                    + loras
                ),
                active_jobs=active_jobs,
                completed_jobs=completed_jobs,
                failed_jobs=failed_jobs,
            ),
            recent_jobs=jobs[:5],
        )


dashboard_service = DashboardService()
