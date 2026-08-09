from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

import httpx


class ComfyUIError(RuntimeError):
    pass


class ComfyUIClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def health(self) -> dict[str, Any]:
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
