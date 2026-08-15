RESOLUTION_BY_ID = {
    "portrait": (768, 1152),
    "square": (1024, 1024),
    "landscape": (1152, 768),
    "1024x1024": (1024, 1024),
    "832x1216": (832, 1216),
    "1216x832": (1216, 832),
    "896x1152": (896, 1152),
    "1152x896": (1152, 896),
}


def resolve_resolution(
    resolution_id: str,
) -> tuple[int, int]:
    try:
        return RESOLUTION_BY_ID[resolution_id]
    except KeyError as exc:
        raise ValueError(
            f"Unsupported resolution: {resolution_id}"
        ) from exc
