from app.schemas.generation import GenerateRequest, GenerationMode
from app.schemas.model import ModelFamily, ModelItemResponse
from app.services.sdxl_workflow_builder import (
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
    input_image_filename: str | None = None,
    input_image_size: tuple[int, int] | None = None,
) -> BuiltWorkflow:
    lora_filename = (
        None if request.lora_id == "none" else request.lora_id
    )

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
        raise ValueError(
            "SDXL currently supports text-to-image only."
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
