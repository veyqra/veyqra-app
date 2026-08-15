from app.schemas.generation import GenerateRequest, GenerationMode
from app.schemas.model import ModelFamily, ModelItemResponse
from app.services.resolutions import resolve_resolution
from app.services.sdxl_workflow_builder import (
    build_sdxl_image_to_image_workflow,
    build_sdxl_inpaint_workflow,
    build_sdxl_text_to_image_workflow,
)
from app.services.workflow_builder import (
    build_flux_text_to_image_workflow,
    build_flux_workflow,
)
from app.services.workflow_types import BuiltWorkflow


def build_generation_workflow(
    request: GenerateRequest,
    *,
    model: ModelItemResponse,
    lora: ModelItemResponse | None = None,
    input_image_filename: str | None = None,
    input_image_size: tuple[int, int] | None = None,
) -> BuiltWorkflow:
    if model.family == ModelFamily.SDXL and not model.filename:
        raise ValueError(
            "The selected SDXL model has no checkpoint file."
        )

    if (
        lora is not None
        and lora.family not in {model.family, ModelFamily.UNKNOWN}
    ):
        raise ValueError(
            "The selected LoRA is not compatible "
            "with the selected model family."
        )

    if request.mode == GenerationMode.TEXT_TO_IMAGE:
        width, height = resolve_resolution(
            request.resolution_id
        )

        if (
            model.family == ModelFamily.SDXL
            and (width < 512 or height < 512)
        ):
            raise ValueError(
                "The selected resolution is too small "
                "for the SDXL workflow."
            )

    lora_filename = lora.filename if lora is not None else None

    if request.mode == GenerationMode.TEXT_TO_IMAGE:
        if model.family == ModelFamily.FLUX:
            return build_flux_text_to_image_workflow(
                request=request,
                model_filename=model.filename,
            )

        if model.family == ModelFamily.SDXL:
            return build_sdxl_text_to_image_workflow(
                request=request,
                model_filename=model.filename,
                lora_filename=lora_filename,
            )

        raise ValueError(
            "Text-to-image is not supported "
            f"for model family '{model.family}'."
        )

    if model.family == ModelFamily.SDXL:
        if request.mode == GenerationMode.IMAGE_TO_IMAGE:
            return build_sdxl_image_to_image_workflow(
                request=request,
                model_filename=model.filename,
                lora_filename=lora_filename,
                input_image_filename=input_image_filename,
                input_image_size=input_image_size,
            )

        if request.mode == GenerationMode.INPAINT:
            return build_sdxl_inpaint_workflow(
                request=request,
                model_filename=model.filename,
                lora_filename=lora_filename,
                input_image_filename=input_image_filename,
                input_image_size=input_image_size,
            )

    if model.family != ModelFamily.FLUX:
        raise ValueError(
            f"Generation mode '{request.mode}' is not supported "
            f"for model family '{model.family}'."
        )

    return build_flux_workflow(
        request=request,
        model_filename=model.filename,
        input_image_filename=input_image_filename,
        input_image_size=input_image_size,
    )
