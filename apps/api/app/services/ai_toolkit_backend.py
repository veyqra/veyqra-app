from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Awaitable, Callable
from pathlib import Path

from app.core.config import get_settings
from app.schemas.training import TrainingRequest

LogCallback = Callable[[str], Awaitable[None]]


class AIToolkitBackendError(RuntimeError):
    pass


class AIToolkitBackend:
    """Adapter for Ostris AI Toolkit's YAML-based ``run.py`` interface."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._processes: dict[str, asyncio.subprocess.Process] = {}

    def availability_error(self) -> str | None:
        if not self.settings.ai_toolkit_script:
            return "AI Toolkit is not configured. Set VEYQRA_AI_TOOLKIT_SCRIPT to its run.py path."
        if not Path(self.settings.ai_toolkit_script).is_file():
            return f"Configured AI Toolkit script was not found: {self.settings.ai_toolkit_script}"
        return None

    async def train(self, job_id: str, request: TrainingRequest, dataset_path: Path, output_dir: Path, on_log: LogCallback) -> Path:
        error = self.availability_error()
        if error:
            raise AIToolkitBackendError(error)

        output_dir.mkdir(parents=True, exist_ok=True)
        output_name = self._safe_output_name(request.name)
        config_path = output_dir / "train.yaml"
        config_path.write_text(self._build_config(request, dataset_path, output_dir, output_name), encoding="utf-8")
        command = [self.settings.ai_toolkit_python, self.settings.ai_toolkit_script, str(config_path)]
        await on_log("Starting AI Toolkit training.")
        await on_log("Command: " + " ".join(command))

        process = await asyncio.create_subprocess_exec(*command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT, cwd=str(Path(self.settings.ai_toolkit_script).parent))
        self._processes[job_id] = process
        try:
            if process.stdout is not None:
                while line := await process.stdout.readline():
                    await on_log(line.decode(errors="replace").rstrip())
            return_code = await process.wait()
        finally:
            self._processes.pop(job_id, None)

        if return_code != 0:
            raise AIToolkitBackendError(f"AI Toolkit exited with status {return_code}.")
        artifacts = sorted(output_dir.rglob("*.safetensors"), key=lambda path: path.stat().st_mtime, reverse=True)
        if not artifacts:
            raise AIToolkitBackendError("AI Toolkit finished without producing a .safetensors LoRA.")
        return artifacts[0]

    async def stop(self, job_id: str) -> bool:
        process = self._processes.get(job_id)
        if process is None or process.returncode is not None:
            return False
        process.terminate()
        try:
            await asyncio.wait_for(process.wait(), timeout=10)
        except TimeoutError:
            process.kill()
            await process.wait()
        return True

    def _build_config(self, request: TrainingRequest, dataset_path: Path, output_dir: Path, output_name: str) -> str:
        quote = json.dumps
        return f'''---
job: extension
config:
  name: {quote(output_name)}
  process:
    - type: "sd_trainer"
      training_folder: {quote(str(output_dir))}
      device: "cuda:0"
      network:
        type: "lora"
        linear: {request.network_rank}
        linear_alpha: {request.network_rank}
      save:
        dtype: "float16"
        save_every: 250
        max_step_saves_to_keep: 4
      datasets:
        - folder_path: {quote(str(dataset_path))}
          caption_ext: "txt"
          cache_latents_to_disk: true
          resolution: [512, 768, 1024]
      train:
        batch_size: {request.batch_size}
        steps: {request.max_train_steps}
        gradient_accumulation_steps: 1
        train_unet: true
        train_text_encoder: false
        gradient_checkpointing: true
        noise_scheduler: "flowmatch"
        optimizer: "adamw8bit"
        lr: {request.learning_rate}
        dtype: "bf16"
      model:
        name_or_path: {quote(request.base_model)}
        is_flux: true
        quantize: true
      sample:
        disable_sampling: true
meta:
  name: "[name]"
  version: "1.0"
'''

    def _safe_output_name(self, name: str) -> str:
        normalized = re.sub(r"[^A-Za-z0-9_-]+", "-", name).strip("-_")
        return normalized or "veyqra-lora"


ai_toolkit_backend = AIToolkitBackend()
