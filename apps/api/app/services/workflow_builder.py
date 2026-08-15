from __future__ import annotations

import json
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from random import randrange
from typing import Any
from dataclasses import dataclass

from app.schemas.generation import GenerateRequest, GenerationMode

API_ROOT = Path(__file__).resolve().parents[2]

TEXT_TO_IMAGE_WORKFLOW_PATH = (
    API_ROOT
    / "workflows"
    / "flux-text2image-api.json"
)

IMAGE_TO_IMAGE_WORKFLOW_PATH = (
    API_ROOT
    / "workflows"
    / "flux-image2image-api.json"
)

RESOLUTION_BY_ID = {
    "portrait": (768, 1152),
    "square": (1024, 1024),
    "landscape": (1152, 768),
}


@lru_cache
def load_flux_text_to_image_workflow_template() -> dict[str, Any]:
    if not TEXT_TO_IMAGE_WORKFLOW_PATH.exists():
        raise FileNotFoundError(
            f"Workflow template not found: "
            f"{TEXT_TO_IMAGE_WORKFLOW_PATH}"
        )

    with TEXT_TO_IMAGE_WORKFLOW_PATH.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


@lru_cache
def load_flux_image_to_image_workflow_template() -> dict[str, Any]:
    if not IMAGE_TO_IMAGE_WORKFLOW_PATH.exists():
        raise FileNotFoundError(
            f"Workflow template not found: "
            f"{IMAGE_TO_IMAGE_WORKFLOW_PATH}"
        )

    with IMAGE_TO_IMAGE_WORKFLOW_PATH.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)

@dataclass
class BuiltWorkflow:
    workflow: dict[str, Any]
    seed: int

def build_flux_text_to_image_workflow(
    request: GenerateRequest,
    model_filename: str,
    input_image_filename: str | None = None,
) -> BuiltWorkflow:

    validate_flux_text_to_image_model(
        model_filename
    )

    workflow = deepcopy(load_flux_text_to_image_workflow_template())

    width, height = RESOLUTION_BY_ID.get(
        request.resolution_id,
        (1024, 1024),
    )

    #
    # Node 1
    # UNET / diffusion model
    #
    workflow["1"]["inputs"]["unet_name"] = model_filename

    #
    # Node 2
    # FLUX sampling dimensions
    #
    workflow["2"]["inputs"]["width"] = width
    workflow["2"]["inputs"]["height"] = height

    #
    # LoRA
    #
    if request.lora_id == "none":
        workflow["6"]["inputs"]["model"] = [
            "2",
            0,
        ]

        workflow["7"]["inputs"]["model"] = [
            "2",
            0,
        ]

    else:
        workflow["3"]["inputs"]["lora_name"] = (
            request.lora_id
        )

        workflow["3"]["inputs"]["strength_model"] = (
            request.lora_strength
        )

        workflow["6"]["inputs"]["model"] = [
            "3",
            0,
        ]

        workflow["7"]["inputs"]["model"] = [
            "3",
            0,
        ]

    #
    # Node 5
    # Prompt / FLUX guidance
    #
    workflow["5"]["inputs"]["clip_l"] = ""

    workflow["5"]["inputs"]["t5xxl"] = (
        request.prompt
    )

    workflow["5"]["inputs"]["guidance"] = (
        request.guidance
    )

    #
    # Node 7
    # Steps
    #
    workflow["7"]["inputs"]["steps"] = request.steps
    workflow["7"]["inputs"]["denoise"] = getattr(request, "denoise_strength", 1.0)

    #
    # Node 15
    # Latent dimensions / batch
    #
    workflow["15"]["inputs"]["width"] = width
    workflow["15"]["inputs"]["height"] = height

    workflow["15"]["inputs"]["batch_size"] = (
        request.batch_size
    )

    #
    # Node 17
    # Seed
    #
    if request.seed == -1:
        seed = randrange(0, 2**63 - 1)
    else:
        seed = request.seed

    workflow["17"]["inputs"]["noise_seed"] = seed

    #
    # Node 18
    # Output filename
    #
    workflow["18"]["inputs"]["filename_prefix"] = (
        "Veyqra"
    )

    return BuiltWorkflow(
        workflow=workflow,
        seed=seed,
        )


def build_flux_image_to_image_workflow(
    request: GenerateRequest,
    model_filename: str,
    input_image_filename: str | None = None,
) -> BuiltWorkflow:
    # Use a dedicated image->image workflow template
    validate_flux_text_to_image_model(model_filename)

    workflow = deepcopy(load_flux_image_to_image_workflow_template())

    width, height = RESOLUTION_BY_ID.get(
        request.resolution_id,
        (1024, 1024),
    )

    workflow["2"]["inputs"]["width"] = width
    workflow["2"]["inputs"]["height"] = height

    # LoRA
    if request.lora_id == "none":
        workflow["6"]["inputs"]["model"] = [
            "2",
            0,
        ]
        workflow["7"]["inputs"]["model"] = [
            "2",
            0,
        ]
    else:
        workflow["3"]["inputs"]["lora_name"] = (
            request.lora_id
        )
        workflow["3"]["inputs"]["strength_model"] = (
            request.lora_strength
        )
        workflow["6"]["inputs"]["model"] = [
            "3",
            0,
        ]
        workflow["7"]["inputs"]["model"] = [
            "3",
            0,
        ]

    # Node 5 FLUX prompt / guidance
    workflow["5"]["inputs"]["clip_l"] = (
        request.prompt
    )
    workflow["5"]["inputs"]["t5xxl"] = (
        request.prompt
    )
    workflow["5"]["inputs"]["guidance"] = (
        request.guidance
    )

    # Node 7 Steps + img2img denoise
    workflow["7"]["inputs"]["steps"] = (
        request.steps
    )
    workflow["7"]["inputs"]["denoise"] = (
        request.denoise_strength
    )

    # Node 17 Seed
    if request.seed == -1:
        seed = randrange(
            0,
            2**63 - 1,
        )
    else:
        seed = request.seed

    workflow["17"]["inputs"]["noise_seed"] = (
        seed
    )

    # Node 23 Input image already uploaded to ComfyUI
    workflow["23"]["inputs"]["image"] = (
        input_image_filename
    )

    # Node 18 Output filename
    workflow["18"]["inputs"]["filename_prefix"] = (
        "Veyqra"
    )

    return BuiltWorkflow(
        workflow=workflow,
        seed=seed,
    )


def build_flux_workflow(
    request: GenerateRequest,
    model_filename: str,
    input_image_filename: str | None = None,
) -> BuiltWorkflow:

    if request.mode == GenerationMode.TEXT_TO_IMAGE:
        return build_flux_text_to_image_workflow(
            request=request, model_filename=model_filename, input_image_filename=input_image_filename
        )

    if request.mode == GenerationMode.IMAGE_TO_IMAGE:
        return build_flux_image_to_image_workflow(
            request=request, model_filename=model_filename, input_image_filename=input_image_filename
        )

    if request.mode == GenerationMode.INPAINT:
        raise ValueError("Inpainting is not implemented yet.")

    raise ValueError(f"Unsupported generation mode: {request.mode}")
    
def validate_flux_text_to_image_model(
    filename: str,
) -> None:
    name = filename.lower()

    unsupported_markers = (
        "fill",
        "inpaint",
        "inpainting",
    )

    if any(
        marker in name
        for marker in unsupported_markers
    ):
        raise ValueError(
            f"Model '{filename}' is not compatible "
            "with the FLUX text-to-image workflow."
        )
