from enum import StrEnum

from pydantic import BaseModel


class ModelKind(StrEnum):
    DIFFUSION = "diffusion"
    LORA = "lora"


class ModelFamily(StrEnum):
    FLUX = "flux"
    SDXL = "sdxl"
    SD15 = "sd15"
    UNKNOWN = "unknown"


class ModelCapability(StrEnum):
    TEXT_TO_IMAGE = "text_to_image"
    IMAGE_TO_IMAGE = "image_to_image"
    INPAINT = "inpaint"


class ModelItemResponse(BaseModel):
    id: str
    name: str
    filename: str
    kind: ModelKind
    family: ModelFamily

    capabilities: list[ModelCapability]

    selectable_for_generate: bool = True


class ModelCatalogResponse(BaseModel):
    diffusion_models: list[ModelItemResponse]
    loras: list[ModelItemResponse]
