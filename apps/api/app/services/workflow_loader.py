import json
from functools import lru_cache
from pathlib import Path
from typing import Any

API_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_DIR = API_ROOT / "workflows"

FLUX_TEXT_TO_IMAGE_WORKFLOW_PATH = (
    WORKFLOW_DIR / "flux-text2image-api.json"
)
FLUX_IMAGE_TO_IMAGE_WORKFLOW_PATH = (
    WORKFLOW_DIR / "flux-image2image-api.json"
)
FLUX_INPAINT_WORKFLOW_PATH = WORKFLOW_DIR / "inpaint_flux.json"
SDXL_TEXT_TO_IMAGE_WORKFLOW_PATH = (
    WORKFLOW_DIR / "sdxl-text2image-api.json"
)


def load_workflow(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Workflow template not found: {path}")

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


@lru_cache
def load_flux_text_to_image_workflow() -> dict[str, Any]:
    return load_workflow(FLUX_TEXT_TO_IMAGE_WORKFLOW_PATH)


@lru_cache
def load_flux_image_to_image_workflow() -> dict[str, Any]:
    return load_workflow(FLUX_IMAGE_TO_IMAGE_WORKFLOW_PATH)


@lru_cache
def load_flux_inpaint_workflow() -> dict[str, Any]:
    return load_workflow(FLUX_INPAINT_WORKFLOW_PATH)


@lru_cache
def load_sdxl_text_to_image_workflow() -> dict[str, Any]:
    return load_workflow(SDXL_TEXT_TO_IMAGE_WORKFLOW_PATH)
