#!/usr/bin/env python3
"""Download explicitly selected model assets into a ComfyUI model tree."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


CHUNK_SIZE = 8 * 1024 * 1024


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download selected official image models for Veyqra."
    )
    parser.add_argument("--comfyui-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--models", nargs="+", required=True)
    return parser.parse_args()


def load_manifest(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        manifest = json.load(file)
    if manifest.get("schema_version") != 1:
        raise ValueError(f"Unsupported model manifest: {path}")
    return manifest


def selected_assets(
    manifest: dict[str, Any], selected_ids: list[str]
) -> list[dict[str, Any]]:
    models = {model["id"]: model for model in manifest.get("models", [])}
    unknown = sorted(set(selected_ids) - models.keys())
    if unknown:
        raise ValueError(f"Unknown model selection: {', '.join(unknown)}")
    shared_assets: list[dict[str, Any]] = []
    for original in manifest.get("shared", []):
        asset = dict(original)
        compatible_models = set(asset.pop("models", selected_ids))
        compatible_selection = [
            item for item in selected_ids if item in compatible_models
        ]
        if not compatible_selection:
            continue
        urls_by_model = asset.pop("urls_by_model", None)
        if urls_by_model:
            asset["url"] = urls_by_model[compatible_selection[0]]
        shared_assets.append(asset)
    return [*shared_assets, *(models[item] for item in selected_ids)]


def format_bytes(value: int) -> str:
    size = float(value)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if size < 1024 or unit == "TiB":
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TiB"


def required_bytes(assets: list[dict[str, Any]], comfyui_dir: Path) -> int:
    required = 0
    for asset in assets:
        target = comfyui_dir / "models" / asset["directory"] / asset["filename"]
        if target.is_file():
            continue
        estimated = int(float(asset["size_gb"]) * 1_000_000_000)
        partial = target.with_name(f"{target.name}.part")
        partial_size = partial.stat().st_size if partial.exists() else 0
        required += max(0, estimated - partial_size)
    return required


def verify_sha256(path: Path, expected: str) -> None:
    print(f"  Verifying SHA-256 for {path.name} ...", flush=True)
    digest = hashlib.sha256()
    with path.open("rb") as file:
        while chunk := file.read(CHUNK_SIZE):
            digest.update(chunk)
    actual = digest.hexdigest()
    if actual != expected:
        raise RuntimeError(
            f"Checksum mismatch for {path.name}: expected {expected}, got {actual}"
        )


def download(asset: dict[str, Any], comfyui_dir: Path, token: str | None) -> None:
    target = comfyui_dir / "models" / asset["directory"] / asset["filename"]
    target.parent.mkdir(parents=True, exist_ok=True)

    if target.is_file() and target.stat().st_size > 0:
        print(f"✓ {asset['name']} already exists: {target}")
        return

    partial = target.with_name(f"{target.name}.part")
    offset = partial.stat().st_size if partial.exists() else 0
    headers = {"User-Agent": "Veyqra-model-installer/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if offset:
        headers["Range"] = f"bytes={offset}-"

    print(
        f"↓ {asset['name']} ({asset['size_gb']} GB) -> {target}",
        flush=True,
    )
    request = urllib.request.Request(asset["url"], headers=headers)

    try:
        response = urllib.request.urlopen(request, timeout=60)
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            raise RuntimeError(
                f"Access denied for {asset['name']}. Sign in to Hugging Face, "
                "accept the model agreement, and provide a valid HF_TOKEN."
            ) from error
        raise RuntimeError(
            f"Download failed for {asset['name']} (HTTP {error.code})."
        ) from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Download failed for {asset['name']}: {error.reason}") from error

    status = getattr(response, "status", 200)
    if offset and status != 206:
        offset = 0
    mode = "ab" if offset and status == 206 else "wb"
    content_length = response.headers.get("Content-Length")
    total = offset + int(content_length) if content_length else None
    downloaded = offset
    last_update = 0.0

    with response, partial.open(mode) as file:
        while chunk := response.read(CHUNK_SIZE):
            file.write(chunk)
            downloaded += len(chunk)
            now = time.monotonic()
            if now - last_update >= 1:
                total_text = f" / {format_bytes(total)}" if total else ""
                print(
                    f"\r  {format_bytes(downloaded)}{total_text}",
                    end="",
                    flush=True,
                )
                last_update = now
    print()

    verify_sha256(partial, asset["sha256"])
    os.replace(partial, target)
    print(f"✓ Installed {asset['name']}")


def main() -> int:
    args = parse_args()
    try:
        manifest = load_manifest(args.manifest)
        assets = selected_assets(manifest, args.models)
        token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
        if any(asset.get("gated") for asset in assets) and not token:
            raise RuntimeError(
                "HF_TOKEN is required for the selected gated model files."
            )

        required = required_bytes(assets, args.comfyui_dir)
        free = shutil.disk_usage(args.comfyui_dir).free
        if required > free:
            raise RuntimeError(
                f"Not enough free disk space: approximately {format_bytes(required)} "
                f"required, {format_bytes(free)} available."
            )

        print(
            f"Approximately {format_bytes(required)} will be downloaded; "
            f"{format_bytes(free)} is available."
        )
        for asset in assets:
            download(asset, args.comfyui_dir, token)
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Model download failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
