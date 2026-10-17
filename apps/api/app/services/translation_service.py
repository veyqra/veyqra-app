from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


logger = logging.getLogger(__name__)

API_ROOT = Path(__file__).resolve().parents[2]
TRANSLATION_PACKAGES_DIR = API_ROOT / "data" / "translation-models"
SENTENCE_MODELS_DIR = API_ROOT / "data" / "translation-runtime" / "minisbd"

SUPPORTED_SOURCE_LANGUAGES = frozenset({
    "de",
    "es",
    "fr",
    "it",
    "pt",
})

# langdetect is deliberately lightweight, but short image prompts containing
# English product or style words can be classified as an unrelated language.
# These hints provide a deterministic fallback for the languages whose local
# Argos models Veyqra installs.
LANGUAGE_HINT_WORDS: dict[str, frozenset[str]] = {
    "de": frozenset({
        "ändere",
        "ändern",
        "das",
        "den",
        "der",
        "die",
        "entferne",
        "ersetze",
        "ersetzen",
        "haar",
        "haare",
        "hemd",
        "jacke",
        "lösche",
        "mit",
        "schwarz",
        "schwarze",
    }),
    "es": frozenset({
        "camisa",
        "cambia",
        "cambiar",
        "chaqueta",
        "con",
        "elimina",
        "pelo",
        "reemplaza",
        "reemplazar",
        "roja",
        "rojo",
    }),
    "fr": frozenset({
        "avec",
        "change",
        "changer",
        "cheveux",
        "chemise",
        "enlever",
        "noir",
        "noire",
        "remplace",
        "remplacer",
        "supprime",
        "veste",
    }),
    "it": frozenset({
        "capelli",
        "camicia",
        "cambia",
        "cambiare",
        "con",
        "elimina",
        "giacca",
        "nera",
        "nero",
        "rimuovi",
        "sostituisci",
        "sostituire",
    }),
    "pt": frozenset({
        "cabelo",
        "camisa",
        "com",
        "elimine",
        "jaqueta",
        "mude",
        "mudar",
        "preta",
        "preto",
        "remova",
        "substitua",
        "substituir",
        "troque",
    }),
}

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

    # Short English prompts can be classified as an unsupported language.
    # Do not initialize the heavyweight Argos runtime when no supported
    # translation can be performed in the first place.
    if detected_language not in SUPPORTED_SOURCE_LANGUAGES:
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
        detected_language = detect(text)
    except (ImportError, LangDetectException):
        detected_language = None

    if detected_language in SUPPORTED_SOURCE_LANGUAGES:
        return detected_language

    hinted_language = _detect_language_from_hints(text)
    return hinted_language or detected_language


def _detect_language_from_hints(text: str) -> str | None:
    words = {
        word.casefold()
        for word in re.findall(r"[^\W\d_]+", text, flags=re.UNICODE)
    }
    scores = {
        language: len(words & hints)
        for language, hints in LANGUAGE_HINT_WORDS.items()
    }
    highest_score = max(scores.values(), default=0)

    # Two matching words are enough to recover a short, mixed-language prompt
    # while avoiding a guess based on a single shared word such as "con".
    if highest_score < 2:
        return None

    matches = [
        language
        for language, score in scores.items()
        if score == highest_score
    ]
    return matches[0] if len(matches) == 1 else None


@lru_cache(maxsize=None)
def _log_missing_model_once(language: str) -> None:
    logger.warning(
        "No Argos translation model for '%s' -> 'en' is installed; "
        "using original prompt.",
        language,
    )
