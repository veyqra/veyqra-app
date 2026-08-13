from app.schemas.dashboard import (
    DashboardResponse,
    DashboardStatsResponse,
    DashboardSystemResponse,
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

        comfyui_online = False
        gpu_online = False

        try:
            system_stats = await comfy_client.health()

            comfyui_online = True

            devices = system_stats.get(
                "devices",
                [],
            )

            gpu_online = len(devices) > 0

        except ComfyUIError:
            pass

        return DashboardResponse(
            system=DashboardSystemResponse(
                comfyui_online=comfyui_online,
                gpu_online=gpu_online,
            ),
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
