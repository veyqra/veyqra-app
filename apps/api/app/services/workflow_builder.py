from __future__ import annotations

import json
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from random import randrange
from typing import Any

from app.schemas.generation import GenerateRequest

API_ROOT = Path(__file__).resolve().parents[2]

WORKFLOW_PATH = (
    API_ROOT
    / "workflows"
    / "flux-text2image-api.json"
)

RESOLUTION_BY_ID = {
    "portrait": (768, 1152),
    "square": (1024, 1024),
    "landscape": (1152, 768),
}


@lru_cache
def load_flux_workflow_template() -> dict[str, Any]:
    if not WORKFLOW_PATH.exists():
        raise FileNotFoundError(
            f"Workflow template not found: {WORKFLOW_PATH}"
        )

    with WORKFLOW_PATH.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def build_flux_workflow(
    request: GenerateRequest,
) -> dict[str, Any]:
    workflow = deepcopy(
        load_flux_workflow_template()
    )

    width, height = RESOLUTION_BY_ID.get(
        request.resolution_id,
        (1024, 1024),
    )

    #
    # Node 1
    # UNET / diffusion model
    #
    workflow["1"]["inputs"]["unet_name"] = (
        request.model_id
    )

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
    workflow["7"]["inputs"]["steps"] = (
        request.steps
    )

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
        "Vyrra"
    )

    return workflow
