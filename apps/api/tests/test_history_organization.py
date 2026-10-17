import importlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from pydantic import ValidationError
from app.schemas.history import HistoryBatchUpdate, HistoryUpdate
from test_creative_tools import image_item

history_module = importlib.import_module("app.services.history_service")


class OrganizationTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        patcher = patch.object(history_module, "HISTORY_PATH", Path(directory.name) / "history.json")
        patcher.start()
        self.addCleanup(patcher.stop)
        self.service = history_module.HistoryService()
        self.service.add_item(image_item(id="one", project="Old", tags=["portrait"]))
        self.service.add_item(image_item(id="two", favorite=True, tags=["landscape"]))

    def test_single_tags_normalize_and_survive_reload(self):
        request = HistoryUpdate(favorite=True, project="  Portfolio  ", tags=[" Portrait ", "portrait", "Studio", ""])
        self.service.update_item("one", request.favorite, request.project, request.tags)
        item = history_module.HistoryService().get_item("one")
        self.assertEqual(item.tags, ["portrait", "studio"])
        self.assertEqual(item.project, "Portfolio")
        self.service.update_item("one", False, "Portfolio")
        self.assertEqual(self.service.get_item("one").tags, ["portrait", "studio"])

    def test_batch_preserves_unmodified_metadata_and_deduplicates_ids(self):
        updated = self.service.update_many(HistoryBatchUpdate(ids=["one", "two", "one"], project=" Gallery ", add_tags=["Studio"]))
        self.assertEqual(len(updated), 2)
        self.assertEqual(self.service.get_item("one").tags, ["portrait", "studio"])
        second = self.service.get_item("two")
        self.assertTrue(second.favorite)
        self.assertEqual(second.project, "Gallery")
        self.assertEqual(second.tags, ["landscape", "studio"])
        self.assertEqual(second.seed, 1234)
        self.service.update_many(HistoryBatchUpdate(ids=["one"], project="", remove_tags=["PORTRAIT"]))
        self.assertEqual(self.service.get_item("one").tags, ["studio"])
        self.assertEqual(self.service.get_item("one").project, "")
        self.assertEqual(self.service.get_item("two").project, "Gallery")

    def test_missing_images_leave_whole_selection_unchanged(self):
        before = history_module.HISTORY_PATH.read_bytes()
        with self.assertRaises(KeyError):
            self.service.update_many(HistoryBatchUpdate(ids=["one", "missing"], favorite=True))
        self.assertEqual(history_module.HISTORY_PATH.read_bytes(), before)

    def test_tag_limit_failure_does_not_save_partial_batch(self):
        self.service.update_item("two", True, "", [f"tag-{index}" for index in range(30)])
        before = history_module.HISTORY_PATH.read_bytes()
        with self.assertRaises(ValueError):
            self.service.update_many(HistoryBatchUpdate(ids=["one", "two"], project="New", add_tags=["extra"]))
        self.assertEqual(history_module.HISTORY_PATH.read_bytes(), before)

    def test_validation_limits_tags_and_selection_size(self):
        with self.assertRaises(ValidationError):
            HistoryBatchUpdate(ids=[])
        with self.assertRaises(ValidationError):
            HistoryBatchUpdate(ids=[str(i) for i in range(501)])
        with self.assertRaises(ValidationError):
            HistoryUpdate(favorite=True, tags=["x" * 51])


if __name__ == "__main__":
    unittest.main()
