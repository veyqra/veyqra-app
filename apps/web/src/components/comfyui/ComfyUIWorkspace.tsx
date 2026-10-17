"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cpu, ExternalLink, LoaderCircle, Play, RefreshCw, Server, Terminal } from "lucide-react";
import { getComfyUIOverview, startComfyUI, type ComfyUIOverview } from "@/services/comfyui-api";
import { useI18n } from "@/lib/i18n";

const panel = "rounded-2xl border border-zinc-800 bg-zinc-900 p-5";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm transition hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-40";

function bytes(value?: number | null): string {
  return typeof value === "number" ? `${(value / 1024 ** 3).toFixed(1)} GB` : "—";
}

export function ComfyUIWorkspace() {
  const { t } = useI18n();
  const [overview, setOverview] = useState<ComfyUIOverview | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [updated, setUpdated] = useState<Date | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const result = await getComfyUIOverview(controller.signal);
      if (!controller.signal.aborted) {
        setOverview(result);
        setUpdated(new Date());
        setError("");
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [refresh]);

  async function handleStart() {
    setStarting(true);
    setError("");
    try {
      const response = await startComfyUI();
      setOverview((current) => current ? { ...current, state: response.state, can_start: false, error: null } : current);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally { setStarting(false); }
  }

  const state = overview?.state;
  const stateLabel = !overview ? t("Checking connection...") : {
    online: t("Online"), offline: t("Offline"), starting: t("Starting ComfyUI..."), failed: t("Start failed"),
  }[overview.state];

  return <div className="space-y-5">
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-zinc-950 p-3"><Server className={state === "online" ? "text-emerald-400" : state === "starting" ? "text-amber-400" : "text-zinc-500"} /></div>
          <div>
            <h2 className="text-xl font-semibold">ComfyUI</h2>
            <p role="status" className={`mt-1 text-sm ${state === "online" ? "text-emerald-400" : state === "starting" ? "text-amber-300" : "text-zinc-400"}`}>{stateLabel}</p>
            <p className="mt-2 break-all font-mono text-xs text-zinc-500">{overview?.url || "—"}</p>
            {updated && <p className="mt-2 text-xs text-zinc-500">{t("Last checked")}: {updated.toLocaleTimeString()}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={refreshing} onClick={() => { setRefreshing(true); void refresh(); }}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{t("Refresh")}</button>
          <button type="button" className={`${button} bg-violet-600 text-white`} disabled={!overview?.can_start || starting} onClick={() => void handleStart()}>
            {starting || state === "starting" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{t("Start ComfyUI")}
          </button>
          {overview?.connected && overview.url && <a href={overview.url} target="_blank" rel="noreferrer" className={button}><ExternalLink className="h-4 w-4" />{t("Open ComfyUI")}</a>}
        </div>
      </div>
      {overview?.start_blocked_reason && <p className="mt-4 text-sm text-amber-300">{t(overview.start_blocked_reason)}</p>}
      {overview?.state === "starting" && <p className="mt-4 text-sm text-zinc-400">{t("ComfyUI is loading models and extensions. Status updates automatically.")}</p>}
      {(error || overview?.error) && <p role="alert" className="mt-4 break-words rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error || t(overview?.error ?? "")}</p>}
    </section>

    <div className="grid gap-5 lg:grid-cols-3">
      <section className={panel}>
        <h3 className="flex items-center gap-2 font-semibold"><Cpu className="h-4 w-4 text-violet-400" />{t("Compute and memory")}</h3>
        {!overview?.connected ? <p className="mt-4 text-sm text-zinc-500">{t("Available when ComfyUI is online.")}</p> : <>
          {overview.devices.length === 0 && <p className="mt-4 text-sm text-zinc-400">{t("No GPU detected")}</p>}
          {overview.devices.map((device, index) => {
            const used = Math.max(0, (device.vram_total ?? 0) - (device.vram_free ?? 0));
            const percent = device.vram_total && device.vram_free != null ? Math.min(100, Math.round(used / device.vram_total * 100)) : null;
            return <div key={`${device.name}-${index}`} className="mt-4 space-y-2">
              <p className="break-words text-sm text-zinc-200">{device.name || t("Local compute")}</p>
              <p className="text-xs text-zinc-400">VRAM: {device.vram_free != null ? bytes(used) : "—"} / {bytes(device.vram_total)}</p>
              {percent !== null && <div role="progressbar" aria-label={`${device.name} VRAM`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-violet-500" style={{ width: `${percent}%` }} /></div>}
            </div>;
          })}
          <p className="mt-4 text-xs text-zinc-400">RAM: {bytes(overview.system.ram_free)} {t("free")} / {bytes(overview.system.ram_total)}</p>
        </>}
      </section>
      <section className={panel}>
        <h3 className="font-semibold">{t("ComfyUI queue")}</h3>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label={t("Running")} value={overview?.connected && !overview.queue_error ? overview.queue_running : "—"} />
          <Metric label={t("Queued")} value={overview?.connected && !overview.queue_error ? overview.queue_pending : "—"} />
        </div>
        <p className="mt-4 text-xs text-zinc-500">{t("Includes workflows submitted outside Veyqra.")}</p>
        <Link href="/jobs" className="mt-4 inline-block text-sm text-violet-300 hover:underline">{t("View Veyqra jobs")} →</Link>
        {overview?.queue_error && <p className="mt-3 break-words text-xs text-amber-300">{overview.queue_error}</p>}
      </section>
      <section className={panel}>
        <h3 className="font-semibold">{t("Runtime versions")}</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <Detail label="ComfyUI" value={overview?.system.comfyui_version} />
          <Detail label="Python" value={overview?.system.python_version?.split("\n")[0]} />
          <Detail label="PyTorch" value={overview?.system.pytorch_version} />
          <Detail label={t("Operating system")} value={overview?.system.os} />
        </dl>
      </section>
    </div>

    <section className={panel}>
      <h3 className="font-semibold">{t("Installation and extensions")}</h3>
      <dl className="mt-4 grid gap-4 text-sm lg:grid-cols-2">
        <Detail label={t("Installation directory")} value={overview?.directory} />
        <Detail label={t("Python executable")} value={overview?.python} />
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        {overview?.node_checks.map((node) => <span key={node.name} className={`rounded-lg border px-3 py-2 text-xs ${node.available ? "border-emerald-900 text-emerald-300" : "border-amber-900 text-amber-300"}`}>{node.name}: {node.available ? t("Available") : t("Missing")}</span>)}
      </div>
      {overview?.connected && overview.node_checks.length === 0 && <p className="mt-3 text-xs text-zinc-500">{t("Extension checks are currently unavailable.")}</p>}
      <p className="mt-4 text-xs text-zinc-500">{overview?.managed ? t("Started through Veyqra.") : t("Already running installations are detected automatically.")}{overview?.pid ? ` PID ${overview.pid}` : ""}</p>
    </section>

    <section className={panel}>
      <h3 className="flex items-center gap-2 font-semibold"><Terminal className="h-4 w-4 text-violet-400" />{t("ComfyUI startup log")}</h3>
      <p className="mb-4 mt-2 text-xs text-zinc-500">{t("Shows the latest output from ComfyUI started through Veyqra.")}</p>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-zinc-950 p-4 text-xs leading-5 text-zinc-300">{overview?.logs.length ? overview.logs.join("\n") : t("No startup log yet.")}</pre>
      {overview?.connection_error && <details className="mt-4 text-xs text-zinc-500"><summary className="cursor-pointer">{t("Connection details")}</summary><p className="mt-2 break-all">{overview.connection_error}</p></details>}
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-zinc-950 p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 break-all text-zinc-300">{value || "—"}</dd></div>;
}
