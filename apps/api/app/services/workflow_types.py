from dataclasses import dataclass
from typing import Any


@dataclass
class BuiltWorkflow:
    workflow: dict[str, Any]
    seed: int
    width: int
    height: int
    mask_prompt: str | None = None
