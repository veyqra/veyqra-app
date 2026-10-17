import { apiRequest } from "@/lib/api-client";

export type ComfyUIOverview = {
  state: "offline" | "starting" | "online" | "failed";
  connected: boolean;
  url: string;
  can_start: boolean;
  start_blocked_reason: string | null;
  error: string | null;
  connection_error: string | null;
  directory: string | null;
  python: string | null;
  managed: boolean;
  pid: number | null;
  devices: { name?: string; type?: string; vram_total?: number; vram_free?: number }[];
  system: {
    comfyui_version?: string | null;
    python_version?: string | null;
    pytorch_version?: string | null;
    os?: string | null;
    ram_total?: number | null;
    ram_free?: number | null;
  };
  queue_running: number;
  queue_pending: number;
  queue_error: string | null;
  node_checks: { name: string; available: boolean }[];
  logs: string[];
};

export function getComfyUIOverview(signal?: AbortSignal): Promise<ComfyUIOverview> {
  return apiRequest("/comfyui/overview", { signal });
}

export function startComfyUI(): Promise<{ state: ComfyUIOverview["state"] }> {
  return apiRequest("/comfyui/start", { method: "POST" });
}
