"""Inspect ComfyUI and start the installation configured on the API host."""
from __future__ import annotations

import asyncio
import ipaddress
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import time
from urllib.parse import urlsplit

from app.core.config import get_settings
from app.services.comfyui_client import ComfyUIClient

REPO_ROOT = Path(__file__).resolve().parents[4]
LOG_PATH = REPO_ROOT / "apps" / "api" / "data" / "comfyui-runtime.log"


class ComfyUIRuntime:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = ComfyUIClient(self.settings.comfyui_url)
        self._process: subprocess.Popen | None = None
        self._lock = asyncio.Lock()
        self._started_at: float | None = None
        self._error: str | None = None
        self._nodes: list[dict] = []
        self._nodes_checked_at = 0.0

    def _configuration(self) -> dict:
        if sys.platform == "win32":
            path = REPO_ROOT / "config" / "local-install.windows.json"
            if not path.is_file():
                raise ValueError("Run the Veyqra installer to configure local ComfyUI startup.")
            values = json.loads(path.read_text(encoding="utf-8-sig"))
            if not isinstance(values, dict):
                raise ValueError("The local ComfyUI installation configuration is invalid.")
        else:
            path = REPO_ROOT / "config" / "local-install.env"
            if not path.is_file():
                raise ValueError("Run the Veyqra installer to configure local ComfyUI startup.")
            entries = {}
            for line in path.read_text(encoding="utf-8").splitlines():
                if not line.startswith("VEYQRA_") or "=" not in line:
                    continue
                key, raw = line.split("=", 1)
                tokens = shlex.split(raw)
                entries[key] = tokens[0] if tokens else ""
            values = {
                "comfyui_dir": entries.get("VEYQRA_COMFYUI_DIR", ""),
                "comfyui_python": entries.get("VEYQRA_COMFYUI_PYTHON", ""),
                "comfyui_host": entries.get("VEYQRA_COMFYUI_HOST", "127.0.0.1"),
                "comfyui_port": entries.get("VEYQRA_COMFYUI_PORT", "8188"),
                "gpu_backend": entries.get("VEYQRA_GPU_BACKEND", ""),
                "hsa_override": entries.get("VEYQRA_HSA_OVERRIDE_GFX_VERSION", ""),
            }

        url = urlsplit(self.settings.comfyui_url)
        host = url.hostname or ""
        try:
            local = host == "localhost" or ipaddress.ip_address(host).is_loopback
        except ValueError:
            local = False
        if not local or url.scheme != "http" or url.path not in ("", "/"):
            raise ValueError("Remote ComfyUI can be monitored, but must be started on its own host.")
        if int(values.get("comfyui_port", 8188)) != (url.port or 80):
            raise ValueError("The ComfyUI URL and installation port do not match.")
        directory = Path(values.get("comfyui_dir", ""))
        python = Path(values.get("comfyui_python", ""))
        if not directory.is_absolute() or not (directory / "main.py").is_file():
            raise ValueError("The configured ComfyUI directory is missing or invalid.")
        if not python.is_absolute() or not python.is_file():
            raise ValueError("The configured ComfyUI Python executable was not found.")
        return values

    def _logs(self) -> list[str]:
        try:
            with LOG_PATH.open("rb") as stream:
                stream.seek(0, 2)
                stream.seek(max(0, stream.tell() - 32_768))
                return stream.read().decode("utf-8", errors="replace").splitlines()[-80:]
        except OSError:
            return []

    async def _node_checks(self) -> list[dict]:
        if time.monotonic() - self._nodes_checked_at < 30:
            return self._nodes
        try:
            info = await self.client.get_object_info()
            manifest = json.loads((REPO_ROOT / "config" / "comfyui-nodes.json").read_text(encoding="utf-8"))
            self._nodes = [
                {"name": node["name"], "available": all(name in info for name in node["provides"])}
                for node in manifest["nodes"] if node.get("required") and node.get("provides")
            ]
            self._nodes_checked_at = time.monotonic()
        except Exception:
            # Keep the runtime overview available when node introspection fails.
            return []
        return self._nodes

    async def overview(self) -> dict:
        stats_result, queue_result = await asyncio.gather(
            self.client.get_system_stats(), self.client.get_queue(), return_exceptions=True,
        )
        connected = isinstance(stats_result, dict)
        stats = stats_result if connected else {}
        queue = queue_result if isinstance(queue_result, dict) else {}
        configuration = None
        blocked_reason = None
        try:
            configuration = self._configuration()
        except (ValueError, OSError, TypeError, KeyError) as error:
            blocked_reason = str(error)

        process_running = self._process is not None and self._process.poll() is None
        if connected:
            state = "online"
            self._error = None
        elif process_running:
            state = "starting"
            if self._started_at and time.monotonic() - self._started_at > 180:
                self._error = "ComfyUI is taking longer than expected. Check the startup log."
        elif self._process is not None:
            state = "failed"
            self._error = f"ComfyUI exited with code {self._process.returncode}. Check the startup log."
        else:
            state = "failed" if self._error else "offline"

        system = stats.get("system") or {}
        running = queue.get("queue_running") or []
        pending = queue.get("queue_pending") or []
        url = self.settings.comfyui_url
        if urlsplit(url).scheme not in ("http", "https"):
            url = ""
        return {
            "state": state, "connected": connected, "url": url,
            "can_start": configuration is not None and not connected and not process_running,
            "start_blocked_reason": blocked_reason, "error": self._error,
            "connection_error": str(stats_result) if not connected else None,
            "directory": configuration.get("comfyui_dir") if configuration else None,
            "python": configuration.get("comfyui_python") if configuration else None,
            "managed": process_running, "pid": self._process.pid if process_running else None,
            "devices": stats.get("devices") or [],
            "system": {
                key: system.get(key) for key in (
                    "comfyui_version", "python_version", "pytorch_version", "os", "ram_total", "ram_free",
                )
            },
            "queue_running": len(running) if isinstance(running, list) else 0,
            "queue_pending": len(pending) if isinstance(pending, list) else 0,
            "queue_error": str(queue_result) if isinstance(queue_result, Exception) and connected else None,
            "node_checks": await self._node_checks() if connected else [],
            "logs": self._logs(),
        }

    async def start(self) -> dict:
        async with self._lock:
            # Checking health under the lock also makes repeated clicks idempotent.
            try:
                await self.client.get_system_stats()
                return {"state": "online"}
            except Exception:
                pass
            if self._process is not None and self._process.poll() is None:
                return {"state": "starting"}
            configuration = self._configuration()
            directory = Path(configuration["comfyui_dir"])
            command = [configuration["comfyui_python"], "-u", str(directory / "main.py"),
                       "--listen", str(configuration.get("comfyui_host", "127.0.0.1")),
                       "--port", str(configuration.get("comfyui_port", 8188))]
            environment = os.environ.copy()
            environment["PYTHONIOENCODING"] = "utf-8"
            if configuration.get("gpu_backend") == "amd" and configuration.get("hsa_override"):
                environment["HSA_OVERRIDE_GFX_VERSION"] = configuration["hsa_override"]
            LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
            try:
                with LOG_PATH.open("wb") as log:
                    self._process = subprocess.Popen(
                        command, cwd=directory, env=environment, stdin=subprocess.DEVNULL,
                        stdout=log, stderr=subprocess.STDOUT,
                        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
                        start_new_session=sys.platform != "win32",
                    )
            except OSError as error:
                self._error = str(error)
                raise ValueError(f"Unable to start ComfyUI: {error}") from error
            self._started_at = time.monotonic()
            self._error = None
            self._nodes_checked_at = 0
            return {"state": "starting"}


comfyui_runtime = ComfyUIRuntime()
