import importlib
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, Mock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.schemas.generation import GenerateRequest, GenerationJobResponse
from app.services.comfyui_client import ComfyUIError

generation_module = importlib.import_module("app.services.generation_service")
dashboard_module = importlib.import_module("app.services.dashboard_service")


class DashboardAvailabilityTests(unittest.IsolatedAsyncioTestCase):
    async def test_cached_job_listing_never_contacts_comfyui(self):
        with patch.object(generation_module.job_store, "list_jobs", return_value=[]):
            service = generation_module.GenerationService()
        response = GenerationJobResponse(id="running", prompt="test", model_name="Model",
            status="running", progress=45, created_at=datetime.now(UTC))
        service._jobs[response.id] = generation_module.StoredGenerationJob(
            response=response, request=GenerateRequest(prompt="test", model_id="model", resolution_id="square"),
            comfy_prompt_id="unreachable",
        )
        with patch.object(service, "get_job", AsyncMock(side_effect=ComfyUIError("offline"))) as refresh:
            jobs = await service.list_jobs(refresh=False)
        self.assertEqual(jobs, [response])
        refresh.assert_not_awaited()

    async def test_dashboard_keeps_jobs_and_stats_while_comfyui_is_offline(self):
        service = dashboard_module.DashboardService()
        response = GenerationJobResponse(id="running", prompt="test", model_name="Model",
            status="running", progress=45, created_at=datetime.now(UTC))
        with patch.object(dashboard_module.generation_service, "list_jobs", AsyncMock(return_value=[response])) as jobs, \
             patch.object(service, "_refresh_comfy_data", Mock()):
            dashboard = await service.get_dashboard()
        jobs.assert_awaited_once_with(refresh=False)
        self.assertEqual(dashboard.stats.active_jobs, 1)
        self.assertEqual(dashboard.recent_jobs[0].progress, 45)
        self.assertFalse(dashboard.system.comfyui_online)


class DashboardRouteTests(unittest.TestCase):
    def test_dashboard_responds_200_during_comfyui_outage(self):
        from app.api.routes.dashboard import router
        app = FastAPI()
        app.include_router(router)
        with patch.object(dashboard_module.comfy_client, "get_history", AsyncMock(side_effect=ComfyUIError("offline"))), \
             patch.object(dashboard_module.generation_service, "list_jobs", AsyncMock(return_value=[])), \
             patch.object(dashboard_module.dashboard_service, "_refresh_comfy_data", Mock()):
            with TestClient(app) as client:
                self.assertEqual(client.get("/dashboard").status_code, 200)
