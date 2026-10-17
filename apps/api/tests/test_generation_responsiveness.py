import asyncio
import importlib
from threading import Event, get_ident
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from app.schemas.generation import GenerateRequest
from app.services.workflow_types import BuiltWorkflow

module = importlib.import_module("app.services.generation_service")
translation = importlib.import_module("app.services.translation_service")


class ResponsivenessTests(unittest.IsolatedAsyncioTestCase):
    async def test_workflow_preparation_does_not_block_api_event_loop(self):
        entered = Event()
        release = Event()
        loop_thread = get_ident()
        worker_threads = []
        def build(**kwargs):
            worker_threads.append(get_ident())
            entered.set()
            if not release.wait(3):
                raise TimeoutError("API event loop was blocked")
            return BuiltWorkflow(workflow={}, seed=1, width=1024, height=1024)

        with patch.object(module.job_store, "list_jobs", return_value=[]):
            service = module.GenerationService()
        service._persist_job = Mock()
        service._start_progress_monitor = Mock()
        client = SimpleNamespace(queue_prompt=AsyncMock(return_value="prompt"))
        with patch.object(module, "build_generation_workflow", side_effect=build), \
             patch.object(module, "comfy_client", client), \
             patch.object(module.model_service, "get_selection", AsyncMock(return_value=(None, None))):
            task = asyncio.create_task(service.create_job(GenerateRequest(prompt="test", model_id="model", resolution_id="square")))
            try:
                async def wait_for_worker():
                    while not entered.is_set():
                        await asyncio.sleep(0.005)
                await asyncio.wait_for(wait_for_worker(), timeout=1)
                # Other requests can run while the workflow thread is busy.
                self.assertEqual(await service.list_jobs(refresh=False) != [], True)
            finally:
                release.set()
            result = await task
        self.assertEqual(result.status, "queued")
        self.assertNotEqual(worker_threads[0], loop_thread)


class TranslationGuardTests(unittest.TestCase):
    def test_unsupported_detected_language_never_imports_argos(self):
        translation.translate_to_english.cache_clear()
        import builtins
        original_import = builtins.__import__
        def guarded_import(name, *args, **kwargs):
            if name.startswith("argostranslate"):
                raise AssertionError("Unsupported languages must not load Argos")
            return original_import(name, *args, **kwargs)
        with patch.object(translation, "_detect_language", return_value="nl"), \
             patch("builtins.__import__", side_effect=guarded_import):
            result = translation.translate_to_english("studio portrait")
        self.assertEqual(result.text, "studio portrait")
        self.assertFalse(result.translated)
        translation.translate_to_english.cache_clear()
