from __future__ import annotations

from copy import deepcopy
from random import randrange

from app.schemas.generation import GenerateRequest, GenerationMode
from app.services.prompt_parser import (
    extract_mask_prompt,
    normalize_mask_prompt,
    remove_mask_prompt,
)
from app.services.resolutions import resolve_resolution
from app.services.translation_service import translate_to_english
from app.services.workflow_loader import (
    load_sdxl_image_to_image_workflow,
    load_sdxl_inpaint_workflow,
    load_sdxl_text_to_image_workflow,
)
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
    required_nodes = {
        "1",
        "2",
        "4",
        "5",
        "6",
        "7",
        "11",
        "20",
    }
    missing_nodes = required_nodes - set(workflow)

    if missing_nodes:
        raise ValueError(
            "Invalid SDXL workflow. Missing nodes: "
            f"{', '.join(sorted(missing_nodes))}"
        )

    prompt, negative_prompt = _translate_prompts(request)
    seed = _resolve_seed(request.seed)
    width, height = resolve_resolution(request.resolution_id)

    if width < 512 or height < 512:
        raise ValueError(
            "The selected resolution is too small "
            "for the SDXL workflow."
        )

    workflow["2"]["inputs"]["ckpt_name"] = model_filename
    workflow["4"]["inputs"]["text"] = prompt
    workflow["5"]["inputs"]["text"] = negative_prompt
    _configure_sampler(workflow, request, seed, 1.0)

    workflow["20"]["inputs"]["width"] = width
    workflow["20"]["inputs"]["height"] = height
    workflow["20"]["inputs"]["batch_size"] = request.batch_size
    workflow["7"]["inputs"]["filename_prefix"] = "Veyqra_SDXL"

    _configure_lora(workflow, request, lora_filename)

    return BuiltWorkflow(
        workflow=workflow,
        seed=seed,
        width=width,
        height=height,
    )


def build_sdxl_image_to_image_workflow(
    request: GenerateRequest,
    *,
    model_filename: str,
    lora_filename: str | None = None,
    input_image_filename: str | None = None,
    input_image_size: tuple[int, int] | None = None,
) -> BuiltWorkflow:
    if not input_image_filename:
        raise ValueError(
            "Input image is required for SDXL image-to-image."
        )
    if input_image_size is None:
        raise ValueError(
            "Original input image dimensions are required "
            "for SDXL image-to-image."
        )

    workflow = deepcopy(load_sdxl_image_to_image_workflow())
    _validate_nodes(
        workflow,
        {"1", "2", "4", "5", "6", "7", "11", "21", "22"},
        "image-to-image",
    )
    prompt, negative_prompt = _translate_prompts(request)
    seed = _resolve_seed(request.seed)
    width, height = input_image_size

    workflow["2"]["inputs"]["ckpt_name"] = model_filename
    workflow["4"]["inputs"]["text"] = prompt
    workflow["5"]["inputs"]["text"] = negative_prompt
    workflow["22"]["inputs"]["image"] = input_image_filename
    denoise = max(0.0, min(1.0, request.denoise_strength))
    _configure_sampler(workflow, request, seed, denoise)
    workflow["7"]["inputs"]["filename_prefix"] = "Veyqra_SDXL_Img2Img"
    _configure_lora(workflow, request, lora_filename)

    return BuiltWorkflow(
        workflow=workflow,
        seed=seed,
        width=width,
        height=height,
    )


def build_sdxl_inpaint_workflow(
    request: GenerateRequest,
    *,
    model_filename: str,
    lora_filename: str | None = None,
    input_image_filename: str | None = None,
    input_image_size: tuple[int, int] | None = None,
) -> BuiltWorkflow:
    if not input_image_filename:
        raise ValueError("Input image is required for SDXL inpainting.")
    if input_image_size is None:
        raise ValueError(
            "Original input image dimensions are required "
            "for SDXL inpainting."
        )

    workflow = deepcopy(load_sdxl_inpaint_workflow())
    _validate_nodes(
        workflow,
        {
            "1",
            "2",
            "4",
            "5",
            "6",
            "7",
            "11",
            "12",
            "18",
            "22",
            "23",
            "25",
            "26",
        },
        "inpaint",
    )
    prompt_translation = translate_to_english(request.prompt)
    translated_prompt = prompt_translation.text
    translated_negative_prompt = translate_to_english(
        request.negative_prompt,
        source_language=prompt_translation.source_language,
    ).text
    explicit_mask_prompt = (
        normalize_mask_prompt(request.mask_prompt)
        if request.mask_prompt
        else ""
    )
    if request.mask_image:
        mask_prompt = ""
    elif explicit_mask_prompt:
        mask_prompt = translate_to_english(
            explicit_mask_prompt,
            source_language=(
                prompt_translation.source_language
                if prompt_translation.source_language != "en"
                else None
            ),
        ).text
    else:
        mask_prompt = extract_mask_prompt(translated_prompt)
    if not mask_prompt and not request.mask_image:
        raise ValueError(
            "Unable to determine the inpaint area from the prompt. "
            "Specify the area in the mask prompt."
        )

    generation_prompt = translated_prompt if request.mask_image else remove_mask_prompt(
        translated_prompt,
        mask_prompt,
    )
    seed = _resolve_seed(request.seed)
    width, height = input_image_size

    workflow["2"]["inputs"]["ckpt_name"] = model_filename
    workflow["4"]["inputs"]["text"] = generation_prompt
    workflow["5"]["inputs"]["text"] = translated_negative_prompt
    workflow["12"]["inputs"]["image"] = input_image_filename
    workflow["23"]["inputs"]["prompt"] = mask_prompt
    workflow["23"]["inputs"]["confidence_threshold"] = (
        request.mask_confidence
    )
    workflow["18"]["inputs"]["grow_mask_by"] = request.mask_expand
    _configure_sampler(workflow, request, seed, 1.0)
    workflow["7"]["inputs"]["filename_prefix"] = "Veyqra_SDXL_Inpaint"
    _configure_lora(workflow, request, lora_filename)

    return BuiltWorkflow(
        workflow=workflow,
        seed=seed,
        width=width,
        height=height,
        mask_prompt=mask_prompt,
    )


def _validate_nodes(
    workflow: dict,
    required_nodes: set[str],
    workflow_name: str,
) -> None:
    missing_nodes = required_nodes - set(workflow)
    if missing_nodes:
        raise ValueError(
            f"Invalid SDXL {workflow_name} workflow. Missing nodes: "
            f"{', '.join(sorted(missing_nodes))}"
        )


def _translate_prompts(request: GenerateRequest) -> tuple[str, str]:
    prompt_translation = translate_to_english(request.prompt)
    negative_prompt = translate_to_english(
        request.negative_prompt,
        source_language=prompt_translation.source_language,
    ).text
    return prompt_translation.text, negative_prompt


def _resolve_seed(seed: int) -> int:
    return randrange(0, 2**63 - 1) if seed < 0 else seed


def _configure_sampler(
    workflow: dict,
    request: GenerateRequest,
    seed: int,
    denoise: float,
) -> None:
    workflow["1"]["inputs"]["seed"] = seed
    workflow["1"]["inputs"]["steps"] = request.steps
    workflow["1"]["inputs"]["cfg"] = request.guidance
    workflow["1"]["inputs"]["sampler_name"] = request.sampler.value
    workflow["1"]["inputs"]["scheduler"] = request.scheduler.value
    workflow["1"]["inputs"]["denoise"] = denoise


def _configure_lora(
    workflow: dict,
    request: GenerateRequest,
    lora_filename: str | None,
) -> None:
    if lora_filename:
        workflow["11"]["inputs"]["lora_name"] = lora_filename
        workflow["11"]["inputs"]["strength_model"] = request.lora_strength
        workflow["11"]["inputs"]["strength_clip"] = request.lora_strength
        workflow["11"]["inputs"]["model"] = ["2", 0]
        workflow["11"]["inputs"]["clip"] = ["2", 1]
        workflow["1"]["inputs"]["model"] = ["11", 0]
        workflow["4"]["inputs"]["clip"] = ["11", 1]
        workflow["5"]["inputs"]["clip"] = ["11", 1]
        return

    workflow["1"]["inputs"]["model"] = ["2", 0]
    workflow["4"]["inputs"]["clip"] = ["2", 1]
    workflow["5"]["inputs"]["clip"] = ["2", 1]
