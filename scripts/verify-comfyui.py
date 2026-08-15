#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_REQUIRED_NODES = (
    "GroundingMaskModelLoader",
    "GroundingMaskDetector",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify the ComfyUI endpoints required by Veyqra.",
    )
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8188",
        help="ComfyUI base URL (default: %(default)s)",
    )
    parser.add_argument(
        "--wait",
        type=float,
        default=0,
        metavar="SECONDS",
        help="Wait up to this many seconds for ComfyUI to start.",
    )
    parser.add_argument(
        "--request-timeout",
        type=float,
        default=5,
        metavar="SECONDS",
        help="Timeout for each HTTP request (default: %(default)s).",
    )
    parser.add_argument(
        "--required-node",
        action="append",
        dest="required_nodes",
        help=(
            "Required ComfyUI class type. Repeat to override the default "
            "Veyqra node list."
        ),
    )
    return parser.parse_args()


def get_json(
    base_url: str,
    path: str,
    timeout: float,
) -> dict[str, Any]:
    request = Request(
        f"{base_url.rstrip('/')}{path}",
        headers={"Accept": "application/json"},
    )

    with urlopen(request, timeout=timeout) as response:
        payload = json.load(response)

    if not isinstance(payload, dict):
        raise ValueError(f"{path} did not return a JSON object")

    return payload


def wait_for_comfyui(
    base_url: str,
    wait_seconds: float,
    request_timeout: float,
) -> dict[str, Any]:
    deadline = time.monotonic() + max(0, wait_seconds)
    last_error: Exception | None = None

    while True:
        try:
            return get_json(base_url, "/system_stats", request_timeout)
        except (HTTPError, URLError, TimeoutError, ValueError) as error:
            last_error = error

        if time.monotonic() >= deadline:
            assert last_error is not None
            raise last_error

        time.sleep(1)


def main() -> int:
    args = parse_args()
    required_nodes = tuple(args.required_nodes or DEFAULT_REQUIRED_NODES)

    try:
        stats = wait_for_comfyui(
            args.url,
            args.wait,
            args.request_timeout,
        )
        queue = get_json(args.url, "/queue", args.request_timeout)
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        print(f"[FAIL] ComfyUI is not reachable: {error}", file=sys.stderr)
        return 1

    devices = stats.get("devices") or []
    running = queue.get("queue_running") or []
    pending = queue.get("queue_pending") or []

    print("[ OK ] ComfyUI system endpoint is reachable")
    print("[ OK ] ComfyUI queue endpoint is reachable")

    if devices and isinstance(devices[0], dict):
        name = devices[0].get("name") or "Unnamed device"
        print(f"[ OK ] Compute device detected: {name}")
    else:
        print("[WARN] ComfyUI reported no compute device")

    print(
        f"[INFO] Queue state: {len(running)} running, "
        f"{len(pending)} pending"
    )

    missing_nodes: list[str] = []
    for node_name in required_nodes:
        try:
            node_info = get_json(
                args.url,
                f"/object_info/{node_name}",
                args.request_timeout,
            )
        except (HTTPError, URLError, TimeoutError, ValueError):
            missing_nodes.append(node_name)
            continue

        if node_name not in node_info:
            missing_nodes.append(node_name)
            continue

        print(f"[ OK ] Required node available: {node_name}")

    if missing_nodes:
        joined = ", ".join(missing_nodes)
        print(f"[FAIL] Missing required nodes: {joined}", file=sys.stderr)
        return 2

    print("[ OK ] ComfyUI is ready for Veyqra")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
