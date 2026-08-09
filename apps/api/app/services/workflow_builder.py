from __future__ import annotations

import json
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from random import randrange
from typing import Any

from app.schemas.generation import GenerateRequest

API_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = API_ROOT / "workflows" / "flux-text2image-api.json"

MODEL_FILENAME_BY_ID = {
    "flux-dev": "flux1-dev.safetensors",
}

LORA_FILENAME_BY_ID = {
    "example": "example-lora.safetensors",
}

RESOLUTION_BY_ID = {
    "portrait": (768, 1152),
    "square": (1024, 1024),
    "landscape": (1152, 768),
}


@lru_cache
def load_flux_workflow_template() -> dict[str, Any]:
    with WORKFLOW_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def build_flux_workflow(request: GenerateRequest) -> dict[str, Any]:
    if request.model_id not in MODEL_FILENAME_BY_ID:
        raise ValueError(
            f"Model '{request.model_id}' is not supported by the FLUX workflow yet."
        )

    workflow = deepcopy(load_flux_workflow_template())

    width, height = RESOLUTION_BY_ID.get(
        request.resolution_id,
        (1024, 1024),
    )

    # Node 1: UNETLoader
    workflow["1"]["inputs"]["unet_name"] = MODEL_FILENAME_BY_ID[
        request.model_id
    ]

    # Node 2: ModelSamplingFlux
    workflow["2"]["inputs"]["width"] = width
    workflow["2"]["inputs"]["height"] = height

    # Node 3 / 6 / 7: LoRA handling
    if request.lora_id == "none":
        workflow["6"]["inputs"]["model"] = ["2", 0]
        workflow["7"]["inputs"]["model"] = ["2", 0]
    else:
        lora_filename = LORA_FILENAME_BY_ID.get(request.lora_id)

        if not lora_filename:
            raise ValueError(
                f"LoRA '{request.lora_id}' is not supported by the FLUX workflow yet."
            )

        workflow["3"]["inputs"]["lora_name"] = lora_filename
        workflow["3"]["inputs"]["strength_model"] = request.lora_strength
        workflow["6"]["inputs"]["model"] = ["3", 0]
        workflow["7"]["inputs"]["model"] = ["3", 0]

    # Node 5: CLIPTextEncodeFlux
    workflow["5"]["inputs"]["clip_l"] = ""
    workflow["5"]["inputs"]["t5xxl"] = request.prompt
    workflow["5"]["inputs"]["guidance"] = request.guidance

    # Node 7: BasicScheduler
    workflow["7"]["inputs"]["steps"] = request.steps

    # Node 15: EmptyLatentImage
    workflow["15"]["inputs"]["width"] = width
    workflow["15"]["inputs"]["height"] = height
    workflow["15"]["inputs"]["batch_size"] = request.batch_size

    # Node 17: RandomNoise
    workflow["17"]["inputs"]["noise_seed"] = (
        randrange(0, 2**63 - 1)
        if request.seed == -1
        else request.seed
    )

    # Node 18: SaveImage
    workflow["18"]["inputs"]["filename_prefix"] = "Vyrra"

    return workflow
