from __future__ import annotations

import re


MASK_PROMPT_ALIASES = {
    # Common typo: "brasserie" is a restaurant, not the garment.
    "brasserie": "brassiere",
    "brasseries": "brassieres",
}


def extract_mask_prompt(prompt: str) -> str:
    text = prompt.strip()
    if not text:
        return ""

    lowered = text.lower()

    patterns: list[tuple[str, tuple[str, ...]]] = [
        (
            "replace ",
            (
                " with ",
                " by ",
            ),
        ),
        (
            "change ",
            (
                " to ",
                " into ",
                " for ",
                " with ",
            ),
        ),
        (
            "switch ",
            (
                " for ",
                " to ",
                " with ",
            ),
        ),
        (
            "swap ",
            (
                " for ",
                " with ",
            ),
        ),
        (
            "remove ",
            (
                " and ",
                " then ",
            ),
        ),
        (
            "erase ",
            (
                " and ",
                " then ",
            ),
        ),
        (
            "delete ",
            (
                " and ",
                " then ",
            ),
        ),
    ]

    for start, endings in patterns:
        start_index = lowered.find(start)
        if start_index == -1:
            continue

        value_start = start_index + len(start)
        value = text[value_start:]
        value_lower = lowered[value_start:]

        end_index: int | None = None
        for ending in endings:
            candidate = value_lower.find(ending)
            if candidate == -1:
                continue
            if end_index is None or candidate < end_index:
                end_index = candidate

        sentence_end = _find_sentence_end(value)
        if sentence_end is not None and (
            end_index is None or sentence_end < end_index
        ):
            end_index = sentence_end

        if end_index is not None:
            value = value[:end_index]

        value = normalize_mask_prompt(value)

        if value:
            return value

    return ""


def normalize_mask_prompt(value: str) -> str:
    value = _clean_mask_target(value)

    return MASK_PROMPT_ALIASES.get(
        value.casefold(),
        value,
    )


def remove_mask_prompt(prompt: str, mask_prompt: str) -> str:
    """Remove a detector target from the positive generation prompt."""
    target = mask_prompt.strip()
    if not target:
        return prompt.strip()

    candidates = [target]
    candidates.extend(
        alias
        for alias, normalized in MASK_PROMPT_ALIASES.items()
        if normalized.casefold() == target.casefold()
    )

    result = prompt
    for candidate in candidates:
        pattern = re.compile(
            rf"(?<!\w)(?:(?:the|a|an|his|her|their)\s+)?"
            rf"{re.escape(candidate)}(?!\w)",
            re.IGNORECASE,
        )
        result = pattern.sub("", result)

    # Once the mask target is gone, remove the remaining edit command so the
    # image model receives the desired replacement as a clean description.
    result = re.sub(
        r"\b(?:replace|change|switch|swap)\s*"
        r"(?:(?:with|by|to|into|for)\s+)?",
        "",
        result,
        flags=re.IGNORECASE,
    )

    result = re.sub(r"[ \t]+", " ", result)
    result = re.sub(r"\s+([,.;:!?])", r"\1", result)
    return result.strip(" \t\r\n,.;:")


def _find_sentence_end(value: str) -> int | None:
    indexes = (
        value.find(separator)
        for separator in (".", "!", "?", ";", "\n", "\r")
    )
    valid_indexes = [index for index in indexes if index >= 0]

    return min(valid_indexes) if valid_indexes else None


def _clean_mask_target(value: str) -> str:
    value = value.strip(" \t\r\n,.;:!?")

    determiners = (
        "the ",
        "a ",
        "an ",
        "his ",
        "her ",
        "their ",
    )

    lowered = value.lower()
    for determiner in determiners:
        if lowered.startswith(determiner):
            value = value[len(determiner):]
            break

    return value.strip()
