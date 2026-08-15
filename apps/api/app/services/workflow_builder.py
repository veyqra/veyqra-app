from __future__ import annotations

import json
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from random import randrange
from typing import Any
from dataclasses import dataclass

from app.schemas.generation import GenerateRequest, GenerationMode
from app.services.prompt_parser import (
    extract_mask_prompt,
    normalize_mask_prompt,
)
from app.services.translation_service import translate_to_english

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

INPAINT_WORKFLOW_PATH = (
    API_ROOT
    / "workflows"
    / "inpaint_flux.json"
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


def load_flux_inpaint_workflow_template() -> dict[str, Any]:
    if not INPAINT_WORKFLOW_PATH.exists():
        raise FileNotFoundError(
            f"Workflow template not found: "
            f"{INPAINT_WORKFLOW_PATH}"
        )

    with INPAINT_WORKFLOW_PATH.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


@dataclass
class BuiltWorkflow:
    workflow: dict[str, Any]
    seed: int
    width: int
    height: int
    mask_prompt: str | None = None


def build_flux_text_to_image_workflow(
    request: GenerateRequest,
    model_filename: str,
    input_image_filename: str | None = None,
) -> BuiltWorkflow:

    validate_flux_text_to_image_model(
        model_filename
    )

    workflow = deepcopy(load_flux_text_to_image_workflow_template())
    translated_prompt = translate_to_english(request.prompt).text

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

    workflow["5"]["inputs"]["t5xxl"] = translated_prompt

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
        width=width,
        height=height,
    )


def build_flux_image_to_image_workflow(
    request: GenerateRequest,
    model_filename: str,
    input_image_filename: str | None = None,
    input_image_size: tuple[int, int] | None = None,
) -> BuiltWorkflow:
    # Use a dedicated image->image workflow template
    validate_flux_text_to_image_model(model_filename)

    workflow = deepcopy(load_flux_image_to_image_workflow_template())
    translated_prompt = translate_to_english(request.prompt).text

    if input_image_size is None:
        raise ValueError(
            "Original input image dimensions are required "
            "for image-to-image generation."
        )

    width, height = input_image_size

    workflow["2"]["inputs"]["width"] = width
    workflow["2"]["inputs"]["height"] = height

    workflow["24"] = {
        "inputs": {
            "image": ["21", 0],
            "upscale_method": "lanczos",
            "width": width,
            "height": height,
            "crop": "disabled",
        },
        "class_type": "ImageScale",
        "_meta": {
            "title": "Restore Original Image Size",
        },
    }
    workflow["18"]["inputs"]["images"] = ["24", 0]

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
    workflow["5"]["inputs"]["clip_l"] = translated_prompt
    workflow["5"]["inputs"]["t5xxl"] = translated_prompt
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
        width=width,
        height=height,
    )


def build_flux_workflow(
    request: GenerateRequest,
    model_filename: str,
    input_image_filename: str | None = None,
    input_image_size: tuple[int, int] | None = None,
) -> BuiltWorkflow:

    if request.mode == GenerationMode.TEXT_TO_IMAGE:
        return build_flux_text_to_image_workflow(
            request=request,
            model_filename=model_filename,
            input_image_filename=input_image_filename,
        )

    if request.mode == GenerationMode.IMAGE_TO_IMAGE:
        return build_flux_image_to_image_workflow(
            request=request,
            model_filename=model_filename,
            input_image_filename=input_image_filename,
            input_image_size=input_image_size,
        )

    if request.mode == GenerationMode.INPAINT:
        return build_flux_inpaint_workflow(
            request=request,
            model_filename=model_filename,
            input_image_filename=input_image_filename,
            input_image_size=input_image_size,
        )

    raise ValueError(f"Unsupported generation mode: {request.mode}")


def build_flux_inpaint_workflow(
    request: GenerateRequest,
    model_filename: str,
    input_image_filename: str | None = None,
    input_image_size: tuple[int, int] | None = None,
) -> BuiltWorkflow:
    validate_flux_inpaint_model(model_filename)

    workflow = deepcopy(load_flux_inpaint_workflow_template())
    prompt_translation = translate_to_english(request.prompt)
    translated_prompt = prompt_translation.text
    translated_negative_prompt = translate_to_english(
        request.negative_prompt,
        source_language=prompt_translation.source_language,
    ).text

    if input_image_size is None:
        raise ValueError(
            "Original input image dimensions are required "
            "for inpaint generation."
        )

    width, height = input_image_size

    workflow["246"]["inputs"]["width"] = width
    workflow["246"]["inputs"]["height"] = height

    workflow["254"] = {
        "inputs": {
            "image": ["251", 0],
            "upscale_method": "lanczos",
            "width": width,
            "height": height,
            "crop": "disabled",
        },
        "class_type": "ImageScale",
        "_meta": {
            "title": "Restore Original Image Size",
        },
    }
    workflow["13"]["inputs"]["images"] = ["254", 0]

    workflow["245"]["inputs"]["unet_name"] = model_filename

    if request.lora_id == "none":
        workflow["247"]["inputs"]["model"] = ["246", 0]
    else:
        workflow["252"]["inputs"]["lora_name"] = request.lora_id
        workflow["252"]["inputs"]["strength_model"] = request.lora_strength
        workflow["247"]["inputs"]["model"] = ["252", 0]

    workflow["248"]["inputs"]["clip_l"] = translated_prompt
    workflow["248"]["inputs"]["t5xxl"] = translated_prompt
    workflow["248"]["inputs"]["guidance"] = request.guidance
    workflow["250"]["inputs"]["clip_l"] = translated_negative_prompt
    workflow["250"]["inputs"]["t5xxl"] = translated_negative_prompt

    workflow["247"]["inputs"]["steps"] = request.steps
    # FLUX Fill expects full denoising for inpainting. Keeping this
    # authoritative in the API also protects non-web clients from
    # accidentally submitting the image-to-image default.
    workflow["247"]["inputs"]["denoise"] = 1.0

    # Seed
    if request.seed == -1:
        seed = randrange(0, 2**63 - 1)
    else:
        seed = request.seed

    workflow["247"]["inputs"]["seed"] = seed

    # Input image (uploaded to ComfyUI)
    workflow["16"]["inputs"]["image"] = input_image_filename

    # Grounding mask detector: prefer explicit mask_prompt, otherwise
    # attempt to extract a target from the main prompt.
    explicit_mask_prompt = (
        normalize_mask_prompt(request.mask_prompt)
        if request.mask_prompt
        else ""
    )

    if explicit_mask_prompt:
        mask_source_language = (
            prompt_translation.source_language
            if prompt_translation.source_language != "en"
            else None
        )
        mask_prompt = translate_to_english(
            explicit_mask_prompt,
            source_language=mask_source_language,
        ).text
    else:
        mask_prompt = extract_mask_prompt(translated_prompt)

    if not mask_prompt:
        raise ValueError(
            "Unable to determine the inpaint area "
            "from the prompt. Use a prompt such as "
            "'replace the red shirt with a black jacket'."
        )

    workflow["23"]["inputs"]["prompt"] = mask_prompt
    workflow["23"]["inputs"]["confidence_threshold"] = request.mask_confidence

    # Mask expand node
    workflow["234"]["inputs"]["expand"] = request.mask_expand

    workflow["13"]["inputs"]["filename_prefix"] = "Veyqra"

    return BuiltWorkflow(
        workflow=workflow,
        seed=seed,
        width=width,
        height=height,
        mask_prompt=mask_prompt,
    )


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


def validate_flux_inpaint_model(
    filename: str,
) -> None:
    name = filename.lower()

    unsupported_markers = (
        "sdxl",
        "sd15",
    )

    if any(
        marker in name
        for marker in unsupported_markers
    ):
        raise ValueError(
            f"Model '{filename}' is not compatible "
            "with the FLUX inpaint workflow."
        )
