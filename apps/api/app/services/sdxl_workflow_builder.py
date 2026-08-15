from __future__ import annotations

from copy import deepcopy
from random import randrange

from app.schemas.generation import GenerateRequest, GenerationMode
from app.services.translation_service import translate_to_english
from app.services.workflow_builder import resolve_resolution
from app.services.workflow_loader import load_sdxl_text_to_image_workflow
from app.services.workflow_types import BuiltWorkflow


def build_sdxl_text_to_image_workflow(
    request: GenerateRequest,
    *,
    model_filename: str,
    lora_filename: str | None = None,
) -> BuiltWorkflow:
    if request.mode != GenerationMode.TEXT_TO_IMAGE:
        raise ValueError(
            "The SDXL workflow currently supports text-to-image only."
        )

    workflow = deepcopy(load_sdxl_text_to_image_workflow())
    prompt_translation = translate_to_english(request.prompt)
    translated_prompt = prompt_translation.text
    translated_negative_prompt = translate_to_english(
        request.negative_prompt,
        source_language=prompt_translation.source_language,
    ).text

    seed = (
        randrange(0, 2**63 - 1)
        if request.seed < 0
        else request.seed
    )
    width, height = resolve_resolution(request.resolution_id)

    workflow["2"]["inputs"]["ckpt_name"] = model_filename
    workflow["4"]["inputs"]["text"] = translated_prompt
    workflow["5"]["inputs"]["text"] = translated_negative_prompt

    workflow["1"]["inputs"]["seed"] = seed
    workflow["1"]["inputs"]["steps"] = request.steps
    workflow["1"]["inputs"]["cfg"] = request.guidance
    workflow["1"]["inputs"]["sampler_name"] = request.sampler.value
    workflow["1"]["inputs"]["scheduler"] = request.scheduler.value
    workflow["1"]["inputs"]["denoise"] = 1.0

    workflow["20"]["inputs"]["width"] = width
    workflow["20"]["inputs"]["height"] = height
    workflow["20"]["inputs"]["batch_size"] = request.batch_size
    workflow["7"]["inputs"]["filename_prefix"] = "Veyqra_SDXL"

    if lora_filename:
        workflow["11"]["inputs"]["lora_name"] = lora_filename
        workflow["11"]["inputs"]["strength_model"] = request.lora_strength
        workflow["11"]["inputs"]["strength_clip"] = request.lora_strength
    else:
        # Bypass node 11 by wiring checkpoint MODEL and CLIP directly.
        workflow["1"]["inputs"]["model"] = ["2", 0]
        workflow["4"]["inputs"]["clip"] = ["2", 1]
        workflow["5"]["inputs"]["clip"] = ["2", 1]

    return BuiltWorkflow(
        workflow=workflow,
        seed=seed,
        width=width,
        height=height,
    )
