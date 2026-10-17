from types import SimpleNamespace
import importlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, Mock, patch
from PIL import Image

from pydantic import ValidationError
from app.schemas.generation import GenerateRequest
from app.schemas.model import ModelItemResponse
from app.services.generation_workflow_builder import build_generation_workflow


class ManualMaskWorkflowTests(unittest.TestCase):
    def request(self, **changes):
        return GenerateRequest(**(dict(prompt="a blue jacket", mode="inpaint", input_image="input.png",
            mask_image="mask.png", model_id="model", resolution_id="square", seed=7) | changes))

    def build(self, family, manual=True):
        model = ModelItemResponse(id="model", name="Model", filename="flux1-fill-dev.safetensors" if family == "flux" else "sdxl.safetensors",
            kind="diffusion", family=family, capabilities=["inpaint"])
        request = self.request(mask_image="mask.png" if manual else None, mask_prompt="jacket")
        translation = SimpleNamespace(text="a blue jacket", source_language="en")
        with patch("app.services.workflow_builder.translate_to_english", return_value=translation), \
             patch("app.services.sdxl_workflow_builder.translate_to_english", return_value=translation):
            return build_generation_workflow(request, model=model, input_image_filename="input.png",
                input_image_size=(1024, 768), mask_image_filename="uploaded-mask.png" if manual else None)

    def test_flux_and_sdxl_manual_masks_remove_grounding_dependencies(self):
        for family in ("flux", "sdxl"):
            with self.subTest(family=family):
                built = self.build(family)
                workflow = built.workflow
                self.assertFalse(any(node["class_type"].startswith("Grounding") for node in workflow.values()))
                self.assertEqual(workflow["manual_mask"]["inputs"], {"image": "uploaded-mask.png", "channel": "red"})
                self.assertEqual((built.width, built.height), (1024, 768))
                self.assertIsNone(built.mask_prompt)
                output = "13" if family == "flux" else "7"
                self.assertEqual(workflow[output]["inputs"]["images"], ["manual_composite", 0])
                self.assertEqual(workflow["manual_composite"]["inputs"]["mask"], ["manual_mask", 0])
                self.assertEqual(workflow["manual_scale"]["inputs"]["height"], 768)
                prompt = workflow["248"]["inputs"]["t5xxl"] if family == "flux" else workflow["4"]["inputs"]["text"]
                self.assertEqual(prompt, "a blue jacket")
                for node in workflow.values():
                    for value in node["inputs"].values():
                        if isinstance(value, list) and len(value) == 2:
                            self.assertIn(value[0], workflow)

    def test_automatic_masks_keep_existing_detection_workflow(self):
        for family in ("flux", "sdxl"):
            workflow = self.build(family, manual=False).workflow
            self.assertTrue(any(node["class_type"] == "GroundingMaskDetector" for node in workflow.values()))
            self.assertNotIn("manual_composite", workflow)

    def test_manual_mask_requires_inpaint_mode(self):
        with self.assertRaises(ValidationError):
            self.request(mode="image_to_image")


class ManualMaskValidationTests(unittest.IsolatedAsyncioTestCase):
    async def test_empty_mismatched_and_unsafe_masks_never_queue(self):
        module = importlib.import_module("app.services.generation_service")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            Image.new("RGB", (64, 64), "red").save(root / "input.png")
            Image.new("L", (64, 64), 0).save(root / "empty.png")
            Image.new("L", (32, 32), 255).save(root / "mismatch.png")
            client = Mock(upload_image=AsyncMock(return_value="input.png"), queue_prompt=AsyncMock())
            with patch.object(module, "UPLOAD_DIR", root), patch.object(module, "comfy_client", client), \
                 patch.object(module.job_store, "list_jobs", return_value=[]), \
                 patch.object(module.model_service, "get_selection", AsyncMock(return_value=(None, None))):
                service = module.GenerationService()
                service._persist_job = Mock()
                for mask, message in [("empty.png", "Paint at least"), ("mismatch.png", "dimensions"), ("../mask.png", "filename")]:
                    request = GenerateRequest(prompt="blue", mode="inpaint", model_id="model", input_image="input.png", resolution_id="square", mask_image=mask)
                    with self.assertRaisesRegex(ValueError, message):
                        await service.create_job(request)
                client.queue_prompt.assert_not_called()


if __name__ == "__main__":
    unittest.main()
