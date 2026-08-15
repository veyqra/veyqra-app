from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


logger = logging.getLogger(__name__)

API_ROOT = Path(__file__).resolve().parents[2]
TRANSLATION_PACKAGES_DIR = API_ROOT / "data" / "translation-models"
SENTENCE_MODELS_DIR = API_ROOT / "data" / "translation-runtime" / "minisbd"

# Keep downloaded Argos models inside the project data directory instead of
# relying on a user-specific home directory.
os.environ.setdefault("ARGOS_PACKAGES_DIR", str(TRANSLATION_PACKAGES_DIR))
os.environ.setdefault("ARGOS_DEVICE_TYPE", "cpu")
os.environ.setdefault("ARGOS_CHUNK_TYPE", "MINISBD")


@dataclass(frozen=True)
class TranslationResult:
    text: str
    source_language: str | None
    translated: bool


@lru_cache(maxsize=256)
def translate_to_english(
    text: str,
    source_language: str | None = None,
) -> TranslationResult:
    value = text.strip()
    if not value:
        return TranslationResult(value, source_language, False)

    detected_language = source_language or _detect_language(value)
    if not detected_language or detected_language == "en":
        return TranslationResult(value, detected_language, False)

    try:
        from argostranslate import translate as argos_translate
        from minisbd import models as minisbd_models

        SENTENCE_MODELS_DIR.mkdir(parents=True, exist_ok=True)
        minisbd_models.cache_dir = str(SENTENCE_MODELS_DIR)

        installed_languages = {
            language.code: language
            for language in argos_translate.get_installed_languages()
        }
        source = installed_languages.get(detected_language)
        target = installed_languages.get("en")

        if source is None or target is None:
            _log_missing_model_once(detected_language)
            return TranslationResult(value, detected_language, False)

        translation = source.get_translation(target)
        if translation is None:
            _log_missing_model_once(detected_language)
            return TranslationResult(value, detected_language, False)

        translated = translation.translate(value).strip()
        if not translated:
            return TranslationResult(value, detected_language, False)

        return TranslationResult(
            translated,
            detected_language,
            translated != value,
        )
    except Exception:
        logger.exception(
            "Unable to translate prompt from '%s'; using original text.",
            detected_language,
        )
        return TranslationResult(value, detected_language, False)


def _detect_language(text: str) -> str | None:
    try:
        from langdetect import DetectorFactory, LangDetectException, detect

        DetectorFactory.seed = 0
        return detect(text)
    except (ImportError, LangDetectException):
        return None


@lru_cache(maxsize=None)
def _log_missing_model_once(language: str) -> None:
    logger.warning(
        "No Argos translation model for '%s' -> 'en' is installed; "
        "using original prompt.",
        language,
    )
