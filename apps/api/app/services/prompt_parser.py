from __future__ import annotations


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


def _find_sentence_end(value: str) -> int | None:
    indexes = (
        value.find(separator)
        for separator in (".", "!", "?", ";", "\n", "\r")
    )
    valid_indexes = [index for index in indexes if index >= 0]

    return min(valid_indexes) if valid_indexes else None


def _clean_mask_target(value: str) -> str:
    value = value.strip(" \t\r\n,.;:!?")

    articles = (
        "the ",
        "a ",
        "an ",
    )

    lowered = value.lower()
    for article in articles:
        if lowered.startswith(article):
            value = value[len(article):]
            break

    return value.strip()
