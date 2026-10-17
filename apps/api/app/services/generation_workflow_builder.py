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
    request: GenerateRequest, *, model: ModelItemResponse, lora: ModelItemResponse | None = None,
    input_image_filename: str | None = None, input_image_size: tuple[int, int] | None = None,
    mask_image_filename: str | None = None,
) -> BuiltWorkflow:
    built = _build_generation_workflow(request, model=model, lora=lora,
        input_image_filename=input_image_filename, input_image_size=input_image_size)
    if request.mask_image:
        if not mask_image_filename:
            raise ValueError("Manual mask has not been uploaded to ComfyUI.")
        workflow = built.workflow
        flux = model.family == ModelFamily.FLUX
        image_node, output_node = ("16", "13") if flux else ("12", "7")
        workflow["manual_mask"] = {"class_type": "LoadImageMask", "inputs": {"image": mask_image_filename, "channel": "red"}}
        if flux:
            workflow["234"]["inputs"]["mask"] = ["manual_mask", 0]
        else:
            workflow["18"]["inputs"].update(pixels=[image_node, 0], mask=["manual_mask", 0])
            workflow["25"]["inputs"]["mask"] = ["manual_mask", 0]
        workflow["manual_scale"] = {"class_type": "ImageScale", "inputs": {
            "image": workflow[output_node]["inputs"]["images"], "upscale_method": "lanczos",
            "width": built.width, "height": built.height, "crop": "disabled",
        }}
        workflow["manual_composite"] = {"class_type": "ImageCompositeMasked", "inputs": {
            "destination": [image_node, 0], "source": ["manual_scale", 0], "mask": ["manual_mask", 0],
            "x": 0, "y": 0, "resize_source": False,
        }}
        workflow[output_node]["inputs"]["images"] = ["manual_composite", 0]
        # Retain only the output and mask-preview dependencies: grounding nodes
        # are not needed or validated by ComfyUI for a hand-painted mask.
        keep = set()
        def visit(node_id):
            if node_id in keep:
                return
            keep.add(node_id)
            for value in workflow[node_id]["inputs"].values():
                if isinstance(value, list) and len(value) == 2 and isinstance(value[0], str) and value[0] in workflow:
                    visit(value[0])
        for node_id in [output_node, "253" if flux else "26"]:
            visit(node_id)
        built.workflow = {key: value for key, value in workflow.items() if key in keep}
        built.mask_prompt = None
    return built


def _build_generation_workflow(
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
