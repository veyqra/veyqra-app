from __future__ import annotations

from collections.abc import AsyncIterator
import json
from typing import Any
from urllib.parse import urlencode, urlsplit, urlunsplit
from pathlib import Path

import httpx
import websockets


class ComfyUIError(RuntimeError):
    pass


class ComfyUIClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def health(self) -> dict[str, Any]:
        return await self.get_system_stats()

    async def get_system_stats(self) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/system_stats"
                )
                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as exc:
            raise ComfyUIError(
                f"Unable to connect to ComfyUI: {exc}"
            ) from exc

    async def get_queue(self) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/queue"
                )
                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as exc:
            raise ComfyUIError(
                f"Unable to read ComfyUI queue: {exc}"
            ) from exc

    async def cancel_prompt(self, prompt_id: str) -> bool:
        queue = await self.get_queue()
        running = queue.get("queue_running") or []
        pending = queue.get("queue_pending") or []

        if self._queue_contains_prompt(running, prompt_id):
            await self.interrupt()
            return True

        if self._queue_contains_prompt(pending, prompt_id):
            await self.delete_queued_prompt(prompt_id)

            # The prompt can move from pending to running between the queue
            # lookup and deletion. Interrupt only when that same prompt is
            # now the active one, so unrelated jobs are not stopped.
            refreshed_queue = await self.get_queue()
            refreshed_running = (
                refreshed_queue.get("queue_running") or []
            )

            if self._queue_contains_prompt(
                refreshed_running,
                prompt_id,
            ):
                await self.interrupt()

            return True

        return False

    async def delete_queued_prompt(self, prompt_id: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/queue",
                    json={"delete": [prompt_id]},
                )
                response.raise_for_status()

        except httpx.HTTPError as exc:
            raise ComfyUIError(
                f"Unable to remove prompt from ComfyUI queue: {exc}"
            ) from exc

    async def interrupt(self) -> None:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/interrupt"
                )
                response.raise_for_status()

        except httpx.HTTPError as exc:
            raise ComfyUIError(
                f"Unable to interrupt ComfyUI generation: {exc}"
            ) from exc

    @staticmethod
    def _queue_contains_prompt(
        entries: Any,
        prompt_id: str,
    ) -> bool:
        if not isinstance(entries, list):
            return False

        for entry in entries:
            if (
                isinstance(entry, (list, tuple))
                and len(entry) > 1
                and str(entry[1]) == prompt_id
            ):
                return True

            if (
                isinstance(entry, dict)
                and str(entry.get("prompt_id", "")) == prompt_id
            ):
                return True

        return False

    async def queue_prompt(
        self,
        workflow: dict[str, Any],
        client_id: str | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "prompt": workflow,
        }

        if client_id:
            payload["client_id"] = client_id

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/prompt",
                    json=payload,
                )

                response.raise_for_status()

                data = response.json()

        except httpx.HTTPError as exc:
            raise ComfyUIError(
                f"Unable to submit workflow to ComfyUI: {exc}"
            ) from exc

        prompt_id = data.get("prompt_id")

        if not prompt_id:
            raise ComfyUIError(
                f"ComfyUI did not return a prompt_id: {data}"
            )

        return str(prompt_id)

    async def get_history(
        self,
        prompt_id: str,
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/history/{prompt_id}"
                )
                response.raise_for_status()

                return response.json()

        except httpx.HTTPError as exc:
            raise ComfyUIError(
                f"Unable to read ComfyUI history: {exc}"
            ) from exc

    async def listen_events(
        self,
        client_id: str,
    ) -> AsyncIterator[dict[str, Any]]:
        parts = urlsplit(self.base_url)
        websocket_url = urlunsplit(
            (
                "wss" if parts.scheme == "https" else "ws",
                parts.netloc,
                "/ws",
                urlencode({"clientId": client_id}),
                "",
            )
        )

        try:
            async with websockets.connect(
                websocket_url,
                open_timeout=15,
                ping_interval=20,
                ping_timeout=20,
            ) as websocket:
                async for raw_message in websocket:
                    if not isinstance(raw_message, str):
                        continue

                    message = json.loads(raw_message)

                    if isinstance(message, dict):
                        yield message

        except (
            OSError,
            ValueError,
            json.JSONDecodeError,
            websockets.WebSocketException,
        ) as exc:
            raise ComfyUIError(
                f"Unable to monitor ComfyUI progress: {exc}"
            ) from exc

    def image_url(
        self,
        filename: str,
        subfolder: str,
        folder_type: str,
    ) -> str:
        query = urlencode(
            {
                "filename": filename,
                "subfolder": subfolder,
                "type": folder_type,
            }
        )

        return f"{self.base_url}/view?{query}"
        
    async def get_image(
        self,
        filename: str,
        subfolder: str = "",
        folder_type: str = "output",
    ) -> tuple[bytes, str]:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(
                    f"{self.base_url}/view",
                    params={
                        "filename": filename,
                        "subfolder": subfolder,
                        "type": folder_type,
                    },
                )

                response.raise_for_status()

                content_type = response.headers.get(
                    "content-type",
                    "image/png",
                )

                return response.content, content_type

        except httpx.HTTPError as exc:
            raise ComfyUIError(
                f"Unable to load image from ComfyUI: {exc}"
            ) from exc
            
            
    async def get_object_info(
        self,
        node_name: str | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/object_info"

        if node_name:
            url = f"{url}/{node_name}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as exc:
            raise ComfyUIError(
                f"Unable to read ComfyUI object info: {exc}"
            ) from exc

    async def upload_image(self, image_path: Path, filename: str) -> str:
        async with httpx.AsyncClient() as client:
            with image_path.open("rb") as image_file:
                files = {
                    "image": (
                        filename,
                        image_file,
                        "application/octet-stream",
                    )
                }
                data = {
                    "type": "input",
                    "overwrite": "true",
                }
                response = await client.post(
                    f"{self.base_url}/upload/image",
                    files=files,
                    data=data,
                    timeout=60.0,
                )

        if response.is_error:
            raise ComfyUIError(
                f"Unable to upload image to ComfyUI: "
                f"{response.status_code}"
            )

        payload = response.json()
        return payload["name"]
