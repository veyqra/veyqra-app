import asyncio
import importlib
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

runtime_module = importlib.import_module("app.services.comfyui_runtime")


class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "config").mkdir()
        self.comfy = self.root / "Comfy UI"
        self.comfy.mkdir()
        (self.comfy / "main.py").write_text("# test", encoding="utf-8")
        self.python = self.root / "python.exe"
        self.python.touch()
        self.configuration = {
            "comfyui_dir": str(self.comfy), "comfyui_python": str(self.python),
            "comfyui_host": "127.0.0.1", "comfyui_port": 8188,
        }
        (self.root / "config" / "local-install.windows.json").write_text(json.dumps(self.configuration), encoding="utf-8")
        (self.root / "config" / "comfyui-nodes.json").write_text(json.dumps({"nodes": [
            {"name": "Grounding", "required": True, "provides": ["GroundingMaskDetector"]},
        ]}), encoding="utf-8")
        self.client = Mock()
        self.client.get_system_stats = AsyncMock(side_effect=RuntimeError("offline"))
        self.client.get_queue = AsyncMock(side_effect=RuntimeError("offline"))
        self.client.get_object_info = AsyncMock(return_value={"GroundingMaskDetector": {}})
        self.process = Mock(pid=4242, returncode=None)
        self.process.poll.return_value = None
        self.spawn = Mock(return_value=self.process)
        for patcher in [
            patch.object(runtime_module, "REPO_ROOT", self.root),
            patch.object(runtime_module, "LOG_PATH", self.root / "runtime.log"),
            patch.object(runtime_module, "ComfyUIClient", return_value=self.client),
            patch.object(runtime_module.subprocess, "Popen", self.spawn),
            patch.object(runtime_module, "get_settings", return_value=SimpleNamespace(comfyui_url="http://127.0.0.1:8188")),
        ]:
            patcher.start()
            self.addCleanup(patcher.stop)
        self.runtime = runtime_module.ComfyUIRuntime()

    async def test_offline_overview_allows_start(self):
        result = await self.runtime.overview()
        self.assertEqual(result["state"], "offline")
        self.assertTrue(result["can_start"])
        self.assertEqual(result["directory"], str(self.comfy))
        self.assertEqual(result["devices"], [])
        self.assertIn("offline", result["connection_error"])

    async def test_concurrent_start_launches_once_without_shell_or_window(self):
        results = await asyncio.gather(self.runtime.start(), self.runtime.start(), self.runtime.start())
        self.assertTrue(all(result["state"] == "starting" for result in results))
        self.spawn.assert_called_once()
        arguments, options = self.spawn.call_args
        self.assertEqual(arguments[0], [str(self.python), "-u", str(self.comfy / "main.py"), "--listen", "127.0.0.1", "--port", "8188"])
        self.assertNotIn("shell", options)
        self.assertEqual(options["cwd"], self.comfy)
        self.assertEqual(options["creationflags"], runtime_module.subprocess.CREATE_NO_WINDOW)
        overview = await self.runtime.overview()
        self.assertEqual(overview["state"], "starting")
        self.assertFalse(overview["can_start"])
        self.assertEqual(overview["pid"], 4242)

    async def test_online_runtime_versions_memory_queue_and_extensions(self):
        self.client.get_system_stats.side_effect = None
        self.client.get_system_stats.return_value = {
            "system": {"comfyui_version": "test", "ram_total": 100, "ram_free": 20},
            "devices": [{"name": "GPU", "vram_total": 90, "vram_free": 10}],
        }
        self.client.get_queue.side_effect = None
        self.client.get_queue.return_value = {"queue_running": [[1]], "queue_pending": [[2], [3]]}
        self.assertEqual(await self.runtime.start(), {"state": "online"})
        self.spawn.assert_not_called()
        overview = await self.runtime.overview()
        self.assertEqual(overview["system"]["comfyui_version"], "test")
        self.assertEqual(overview["devices"][0]["name"], "GPU")
        self.assertEqual((overview["queue_running"], overview["queue_pending"]), (1, 2))
        self.assertEqual(overview["node_checks"], [{"name": "Grounding", "available": True}])
        await self.runtime.overview()
        self.client.get_object_info.assert_awaited_once()

    async def test_failed_process_exposes_log_and_allows_retry(self):
        await self.runtime.start()
        self.process.poll.return_value = 1
        self.process.returncode = 1
        runtime_module.LOG_PATH.write_text("missing torch\n", encoding="utf-8")
        result = await self.runtime.overview()
        self.assertEqual(result["state"], "failed")
        self.assertTrue(result["can_start"])
        self.assertIn("code 1", result["error"])
        self.assertEqual(result["logs"], ["missing torch"])

    async def test_invalid_configuration_and_remote_runtime_cannot_launch(self):
        self.runtime.settings.comfyui_url = "http://remote.example:8188"
        with self.assertRaisesRegex(ValueError, "Remote ComfyUI"):
            await self.runtime.start()
        self.runtime.settings.comfyui_url = "http://127.0.0.1:9999"
        with self.assertRaisesRegex(ValueError, "port"):
            await self.runtime.start()
        self.runtime.settings.comfyui_url = "http://127.0.0.1:8188"
        (self.comfy / "main.py").unlink()
        result = await self.runtime.overview()
        self.assertFalse(result["can_start"])
        self.assertIn("directory", result["start_blocked_reason"])
        self.spawn.assert_not_called()

    async def test_spawn_failure_is_reported(self):
        self.spawn.side_effect = OSError("permission denied")
        with self.assertRaisesRegex(ValueError, "Unable to start"):
            await self.runtime.start()
        self.assertEqual((await self.runtime.overview())["state"], "failed")

    async def test_linux_configuration_is_parsed_without_executing_shell(self):
        (self.root / "config" / "local-install.env").write_text(
            f"VEYQRA_COMFYUI_DIR='{self.comfy}'\nVEYQRA_COMFYUI_PYTHON='{self.python}'\n"
            "VEYQRA_COMFYUI_PORT=8188\nVEYQRA_GPU_BACKEND=amd\nVEYQRA_HSA_OVERRIDE_GFX_VERSION=11.0.0\n",
            encoding="utf-8",
        )
        with patch.object(runtime_module.sys, "platform", "linux"):
            configuration = self.runtime._configuration()
        self.assertEqual(configuration["comfyui_dir"], str(self.comfy))
        self.assertEqual(configuration["hsa_override"], "11.0.0")

    async def test_log_tail_is_bounded(self):
        runtime_module.LOG_PATH.write_text("line\n" * 100_000, encoding="utf-8")
        self.assertEqual(len(self.runtime._logs()), 80)


class RuntimeRouteTests(unittest.TestCase):
    def test_start_action_validates_browser_requests_and_configuration_errors(self):
        from app.api.routes.comfyui import router
        app = FastAPI()
        app.include_router(router)
        with TestClient(app) as client:
            self.assertEqual(client.post("/comfyui/start").status_code, 415)
            self.assertEqual(client.post("/comfyui/start", json={}, headers={"Sec-Fetch-Site": "cross-site"}).status_code, 403)
            with patch.object(runtime_module.comfyui_runtime, "start", AsyncMock(return_value={"state": "starting"})):
                self.assertEqual(client.post("/comfyui/start", json={}).status_code, 202)
            with patch.object(runtime_module.comfyui_runtime, "start", AsyncMock(side_effect=ValueError("missing configuration"))):
                self.assertEqual(client.post("/comfyui/start", json={}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
