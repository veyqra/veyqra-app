from __future__ import annotations

from pathlib import PurePosixPath

from app.core.config import get_settings
from app.schemas.model import (
    ModelCapability,
    ModelCatalogResponse,
    ModelFamily,
    ModelItemResponse,
    ModelKind,
)
from app.services.comfyui_client import ComfyUIClient

settings = get_settings()


def detect_model_family(filename: str) -> ModelFamily:
    name = filename.lower()

    sdxl_markers = (
        "sdxl",
        "sd_xl",
        "juggernautxl",
        "realvisxl",
        "dreamshaperxl",
    )

    if any(marker in name for marker in sdxl_markers):
        return ModelFamily.SDXL

    if "flux" in name:
        return ModelFamily.FLUX

    if (
        "sd15" in name
        or "sd1.5" in name
        or "sd_15" in name
    ):
        return ModelFamily.SD15

    return ModelFamily.UNKNOWN


def detect_lora_family(filename: str) -> ModelFamily:
    name = filename.lower()

    if (
        "sdxl" in name
        or "xl" in name
        or "juggernaut" in name
    ):
        return ModelFamily.SDXL

    if "flux" in name:
        return ModelFamily.FLUX

    return ModelFamily.UNKNOWN


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

    async def list_checkpoints(self) -> list[str]:
        return await self._get_combo_values(
            node_name="CheckpointLoaderSimple",
            input_name="ckpt_name",
        )

    async def get_catalog(self) -> ModelCatalogResponse:
        lora_filenames = await self.list_loras()
        model_filenames = await self.list_unets()
        checkpoint_filenames = await self.list_checkpoints()
        all_model_filenames = list(dict.fromkeys(
            [*model_filenames, *checkpoint_filenames]
        ))

        diffusion_models = [
            self._create_item(
                filename=filename,
                kind=ModelKind.DIFFUSION,
            )
            for filename in all_model_filenames
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

    async def get_model(self, filename: str) -> ModelItemResponse:
        catalog = await self.get_catalog()

        for model in catalog.diffusion_models:
            if model.filename == filename:
                return model

        raise ValueError(
            f"Model '{filename}' was not found in the ComfyUI catalog."
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

        if not input_definition:
            return []

        values = input_definition[0]

        if not isinstance(values, list):
            return []

        return sorted(str(value) for value in values)

    def _create_item(
        self,
        filename: str,
        kind: ModelKind,
    ) -> ModelItemResponse:
        family = (
            detect_lora_family(filename)
            if kind == ModelKind.LORA
            else detect_model_family(filename)
        )

        if kind == ModelKind.DIFFUSION:
            capabilities = (
                [ModelCapability.TEXT_TO_IMAGE]
                if family == ModelFamily.SDXL
                else self._detect_model_capabilities(filename)
            )
        else:
            capabilities = []

        selectable_for_generate = (
            kind == ModelKind.LORA
            or (
                family in {ModelFamily.FLUX, ModelFamily.SDXL}
                and ModelCapability.TEXT_TO_IMAGE in capabilities
            )
        )

        return ModelItemResponse(
            id=filename,
            name=self._display_name(filename),
            filename=filename,
            kind=kind,
            family=family,
            capabilities=capabilities,
            selectable_for_generate=selectable_for_generate,
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

        return (
            basename
            .replace("_", " ")
            .replace("-", " ")
            .strip()
        )

    def _detect_family(
        self,
        filename: str,
    ) -> ModelFamily:
        return detect_model_family(filename)

    def _detect_model_capabilities(
        self,
        filename: str,
    ) -> list[ModelCapability]:
        name = filename.lower()

        #
        # Fill / inpainting models
        #
        fill_markers = (
            "fill",
            "inpaint",
            "inpainting",
        )

        if any(marker in name for marker in fill_markers):
            return [
                ModelCapability.INPAINT,
                ModelCapability.IMAGE_TO_IMAGE,
            ]

        #
        # Normal diffusion models
        #
        return [
            ModelCapability.TEXT_TO_IMAGE,
        ]


model_service = ModelService()
