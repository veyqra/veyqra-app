from __future__ import annotations

import argparse
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


API_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PACKAGES_DIR = API_ROOT / "data" / "translation-models"
DOWNLOADS_DIR = API_ROOT / "data" / "translation-downloads"
SENTENCE_MODELS_DIR = API_ROOT / "data" / "translation-runtime" / "minisbd"
DEFAULT_LANGUAGES = (
    "de",
    "fr",
    "es",
    "it",
    "pt",
)

os.environ.setdefault("ARGOS_PACKAGES_DIR", str(DEFAULT_PACKAGES_DIR))
os.environ.setdefault("ARGOS_DEVICE_TYPE", "cpu")
os.environ.setdefault("ARGOS_CHUNK_TYPE", "MINISBD")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install local Argos translation models to English.",
    )
    parser.add_argument(
        "languages",
        nargs="*",
        default=DEFAULT_LANGUAGES,
        help="ISO 639-1 source language codes (default: common UI languages)",
    )
    return parser.parse_args()


def download_model(model) -> Path:
    language = model.from_code
    url = model.links[0]
    filename = Path(urlparse(url).path).name
    destination = DOWNLOADS_DIR / filename
    partial = destination.with_suffix(f"{destination.suffix}.part")
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

    if destination.exists():
        return destination

    downloaded = partial.stat().st_size if partial.exists() else 0
    headers = {"User-Agent": "ArgosTranslate"}
    if downloaded:
        headers["Range"] = f"bytes={downloaded}-"

    with urlopen(Request(url, headers=headers)) as response:
        resumed = response.status == 206 and downloaded > 0
        if not resumed:
            downloaded = 0

        content_length = int(response.headers.get("Content-Length", "0"))
        total = downloaded + content_length if content_length else 0
        mode = "ab" if resumed else "wb"
        last_reported_megabytes = -1

        with partial.open(mode) as file:
            while chunk := response.read(1024 * 1024):
                file.write(chunk)
                downloaded += len(chunk)
                downloaded_megabytes = downloaded // (10 * 1024 * 1024)
                if downloaded_megabytes != last_reported_megabytes:
                    last_reported_megabytes = downloaded_megabytes
                    if total:
                        percent = downloaded * 100 / total
                        print(
                            f"  {language}: "
                            f"{downloaded / 1024 / 1024:.0f} MB "
                            f"of {total / 1024 / 1024:.0f} MB "
                            f"({percent:.0f}%)",
                            flush=True,
                        )
                    else:
                        print(
                            f"  {language}: "
                            f"{downloaded / 1024 / 1024:.0f} MB",
                            flush=True,
                        )

    partial.replace(destination)
    return destination


def main() -> None:
    from argostranslate import package
    from minisbd import models as minisbd_models

    args = parse_args()
    requested = tuple(dict.fromkeys(args.languages))
    DEFAULT_PACKAGES_DIR.mkdir(parents=True, exist_ok=True)

    print("Updating the Argos package index...", flush=True)
    package.update_package_index()
    available = package.get_available_packages()
    installed_pairs = {
        (item.from_code, item.to_code)
        for item in package.get_installed_packages()
    }

    unavailable: list[str] = []
    models_to_install = {}
    for language in requested:
        if language == "en" or (language, "en") in installed_pairs:
            print(
                f"Skipping {language} -> en (already available).",
                flush=True,
            )
            continue

        model = next(
            (
                item
                for item in available
                if item.from_code == language and item.to_code == "en"
            ),
            None,
        )
        if model is None:
            unavailable.append(language)
            continue

        models_to_install[language] = model

    downloaded_models: dict[str, Path] = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(download_model, model): language
            for language, model in models_to_install.items()
        }
        for future in as_completed(futures):
            language = futures[future]
            downloaded_models[language] = future.result()

    for language in requested:
        download_path = downloaded_models.get(language)
        if download_path is None:
            continue

        print(f"Installing {language} -> en...", flush=True)
        package.install_from_path(download_path)
        download_path.unlink()

    if unavailable:
        joined = ", ".join(unavailable)
        print(
            f"No direct English model was found for: {joined}",
            flush=True,
        )

    SENTENCE_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    minisbd_models.cache_dir = str(SENTENCE_MODELS_DIR)
    for language in requested:
        print(
            f"Preparing sentence model for {language}...",
            flush=True,
        )
        minisbd_models.get_model_file(language)

    print(
        f"Translation models directory: {DEFAULT_PACKAGES_DIR}",
        flush=True,
    )


if __name__ == "__main__":
    main()
