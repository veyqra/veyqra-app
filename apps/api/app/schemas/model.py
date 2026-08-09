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


class ModelItemResponse(BaseModel):
    id: str
    name: str
    filename: str
    kind: ModelKind
    family: ModelFamily


class ModelCatalogResponse(BaseModel):
    diffusion_models: list[ModelItemResponse]
    loras: list[ModelItemResponse]
