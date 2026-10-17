"""Regression tests using temporary storage and a mocked ComfyUI backend."""
import importlib
import json
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

from PIL import Image
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.schemas.history import HistoryItemResponse

history_module = importlib.import_module("app.services.history_service")
generation_module = importlib.import_module("app.services.generation_service")


def image_item(**changes):
    values = dict(
        id="original", prompt="A forest", negative_prompt="blur", model_id="model.safetensors",
        model_name="Original model", lora_id="none", lora_strength=1,
        image_filename="original.png", image_url="/api/v1/storage/history/original.png",
        width=64, height=48, seed=1234, steps=28, guidance=3.5, created_at=datetime.now(UTC),
    )
    return HistoryItemResponse(**(values | changes))


class HistoryTests(unittest.TestCase):
    def test_legacy_defaults_and_metadata_survive_reload(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(history_module, "HISTORY_PATH", Path(directory) / "history.json"):
                service = history_module.HistoryService()
                original = image_item()
                legacy = original.model_dump(mode="json", exclude={
                    "favorite", "project", "tags", "source_image_id", "upscale_model", "upscale_factor", "sampler", "scheduler",
                })
                history_module.HISTORY_PATH.write_text(json.dumps([legacy]), encoding="utf-8")
                self.assertFalse(service.get_item(original.id).favorite)
                self.assertEqual(service.get_item(original.id).tags, [])
                updated = service.update_item(original.id, True, "  Portfolio  ")
                self.assertEqual(updated.project, "Portfolio")
                reloaded = history_module.HistoryService().get_item(original.id)
                self.assertTrue(reloaded.favorite)
                self.assertEqual(reloaded.project, "Portfolio")
                self.assertEqual(reloaded.seed, 1234)
                self.assertEqual(reloaded.image_filename, original.image_filename)
                self.assertIsNone(service.update_item("missing", True, ""))

    def test_pagination_keeps_total(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(history_module, "HISTORY_PATH", Path(directory) / "history.json"):
                service = history_module.HistoryService()
                for index in range(3):
                    service.add_item(image_item(id=str(index)))
                first = service.list_items(limit=2)
                second = service.list_items(limit=2, offset=2)
                self.assertEqual(first.total, 3)
                self.assertEqual(len(second.items), 1)
                self.assertFalse({i.id for i in first.items} & {i.id for i in second.items})

    def test_routes_validate_updates_and_upscale_factor(self):
        from app.api.routes.history import router
        app = FastAPI()
        app.include_router(router)
        with TestClient(app) as client:
            self.assertEqual(client.patch("/history/a", json={"favorite": True, "project": "a" * 101}).status_code, 422)
            self.assertEqual(client.post("/history/a/upscale", json={"model": "upscale.pth", "factor": 5}).status_code, 422)
            with patch.object(history_module.history_service, "update_item", return_value=None):
                self.assertEqual(client.patch("/history/missing", json={"favorite": True}).status_code, 404)


class UpscaleTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "original.png"
        Image.new("RGB", (64, 48), "green").save(self.path)
        self.source = image_item(project="Portfolio")
        self.client = Mock()
        self.client.get_object_info = AsyncMock(return_value={
            "UpscaleModelLoader": {"input": {"required": {"model_name": [["upscale.pth"]]}}},
        })
        self.client.upload_image = AsyncMock(return_value="original.png")
        self.client.queue_prompt = AsyncMock(return_value="comfy-prompt")
        self.storage = Mock()
        self.storage.get_image_path.return_value = self.path
        self.storage.store_comfyui_image = AsyncMock(return_value="result.png")
        self.history = Mock()
        self.history.get_item.return_value = self.source
        self.jobs = Mock()
        self.jobs.list_jobs.return_value = []
        patcher = patch.multiple(generation_module, comfy_client=self.client,
                                 storage_service=self.storage, history_service=self.history, job_store=self.jobs)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.service = generation_module.GenerationService()
        self.service._start_progress_monitor = Mock()

    async def test_upscale_workflow_completion_and_restart(self):
        job = await self.service.create_upscale_job("original", "upscale.pth", 2)
        workflow = self.client.queue_prompt.call_args.args[0]
        self.assertEqual(workflow["3"]["class_type"], "ImageUpscaleWithModel")
        self.assertEqual(workflow["4"]["inputs"]["width"], 128)
        self.assertEqual(workflow["4"]["inputs"]["height"], 96)
        persisted = self.jobs.save_job.call_args.args[0]
        restored = self.service._restore_job(persisted)
        self.assertEqual(restored.request.upscale_model, "upscale.pth")
        self.assertEqual(restored.comfy_prompt_id, "comfy-prompt")
        result = await self.service._apply_history_to_job(restored, {
            "comfy-prompt": {"status": {"status_str": "success"}, "outputs": {
                "5": {"images": [{"filename": "upscaled.png", "type": "output"}]},
            }},
        })
        self.assertEqual(result.status, "completed")
        self.assertEqual((result.image.width, result.image.height), (128, 96))
        saved = self.history.add_item.call_args.args[0]
        self.assertNotEqual(saved.id, self.source.id)
        self.assertEqual(saved.source_image_id, "original")
        self.assertEqual(saved.project, "Portfolio")
        self.assertEqual(saved.seed, self.source.seed)
        self.assertEqual(saved.upscale_factor, 2)
        self.assertEqual(saved.upscale_model, "upscale.pth")
        self.assertEqual(job.status, "queued")

    async def test_invalid_models_missing_sources_and_large_outputs_never_queue(self):
        with self.assertRaisesRegex(ValueError, "unavailable"):
            await self.service.create_upscale_job("original", "missing.pth", 2)
        self.history.get_item.return_value = None
        with self.assertRaisesRegex(ValueError, "not found"):
            await self.service.create_upscale_job("missing", "upscale.pth", 2)
        self.history.get_item.return_value = self.source
        with patch.object(self.service, "_read_image_size", return_value=(4000, 4000)):
            with self.assertRaisesRegex(ValueError, "40 megapixel"):
                await self.service.create_upscale_job("original", "upscale.pth", 2)
        self.client.queue_prompt.assert_not_called()

    async def test_comfy_execution_failure_is_reported(self):
        job = await self.service.create_upscale_job("original", "upscale.pth", 2)
        result = await self.service._apply_history_to_job(self.service._jobs[job.id], {
            "comfy-prompt": {"status": {"status_str": "error", "messages": [["execution_error", "out of memory"]]}},
        })
        self.assertEqual(result.status, "failed")
        self.assertIn("out of memory", result.error)
        self.history.add_item.assert_not_called()


if __name__ == "__main__":
    unittest.main()
