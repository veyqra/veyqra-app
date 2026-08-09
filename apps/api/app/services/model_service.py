from __future__ import annotations

from pathlib import PurePosixPath

from app.core.config import get_settings
from app.schemas.model import (
    ModelCatalogResponse,
    ModelFamily,
    ModelItemResponse,
    ModelKind,
)
from app.services.comfyui_client import ComfyUIClient

settings = get_settings()


class ModelService:
    def __init__(self) -> None:
        self.client = ComfyUIClient(settings.comfyui_url)

    async def list_loras(self) -> list[str]:
        return await self._get_combo_values(
            node_name="LoraLoaderModelOnly",
            input_name="lora_name",
        )

    async def list_unets(self) -> list[str]:
        return await self._get_combo_values(
            node_name="UNETLoader",
            input_name="unet_name",
        )

    async def get_catalog(self) -> ModelCatalogResponse:
        lora_filenames = await self.list_loras()
        model_filenames = await self.list_unets()

        diffusion_models = [
            self._create_item(
                filename=filename,
                kind=ModelKind.DIFFUSION,
            )
            for filename in model_filenames
        ]

        loras = [
            self._create_item(
                filename=filename,
                kind=ModelKind.LORA,
            )
            for filename in lora_filenames
        ]

        return ModelCatalogResponse(
            diffusion_models=diffusion_models,
            loras=loras,
        )

    async def _get_combo_values(
        self,
        node_name: str,
        input_name: str,
    ) -> list[str]:
        info = await self.client.get_object_info(node_name)

        node = info.get(node_name, {})

        required = (
            node
            .get("input", {})
            .get("required", {})
        )

        input_definition = required.get(input_name)

        if not isinstance(input_definition, list):
            return []

        if len(input_definition) == 0:
            return []

        values = input_definition[0]

        if not isinstance(values, list):
            return []

        return sorted(
            str(value)
            for value in values
        )

    def _create_item(
        self,
        filename: str,
        kind: ModelKind,
    ) -> ModelItemResponse:
        return ModelItemResponse(
            id=filename,
            name=self._display_name(filename),
            filename=filename,
            kind=kind,
            family=self._detect_family(filename),
        )

    def _display_name(self, filename: str) -> str:
        basename = PurePosixPath(filename).name

        for suffix in (
            ".safetensors",
            ".ckpt",
            ".pt",
            ".pth",
            ".bin",
        ):
            if basename.lower().endswith(suffix):
                basename = basename[:-len(suffix)]
                break

        return basename.replace("_", " ").replace("-", " ").strip()

    def _detect_family(
        self,
        filename: str,
    ) -> ModelFamily:
        name = filename.lower()

        if "flux" in name:
            return ModelFamily.FLUX

        if "sdxl" in name or "xl" in name:
            return ModelFamily.SDXL

        if (
            "sd15" in name
            or "sd1.5" in name
            or "sd_15" in name
        ):
            return ModelFamily.SD15

        return ModelFamily.UNKNOWN


model_service = ModelService()
