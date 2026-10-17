"use client";

import { Cpu, Server, X } from "lucide-react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type SystemStatusPopoverProps = {
  open: boolean;
  onClose: () => void;
  comfyOnline: boolean;
  gpuOnline: boolean;
  gpuName?: string | null;
  vramTotal?: number | null;
  vramFree?: number | null;
  queueRunning: number;
  queuePending: number;
};

export function SystemStatusPopover({
  open,
  onClose,
  comfyOnline,
  gpuOnline,
  gpuName,
  vramTotal,
  vramFree,
  queueRunning,
  queuePending,
}: SystemStatusPopoverProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const usedVram = calculateUsed(vramTotal, vramFree);
  const vramPercent =
    usedVram !== null && vramTotal
      ? Math.min(
          100,
          Math.round((usedVram / vramTotal) * 100)
        )
      : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        !(target instanceof Node) ||
        ref.current?.contains(target)
      ) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest("#system-status-trigger")
      ) {
        return;
      }

      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={ref}
      id="system-status-popover"
      role="dialog"
      aria-label={t("Show local system status")}
      className="fixed left-4 right-4 top-[4.5rem] z-50 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[min(22rem,calc(100vw-2rem))] sm:overflow-hidden"
    >
      <div className="flex items-start justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {t("System status")}
          </p>

          <p className="mt-0.5 text-xs text-zinc-500">
            {t("Veyqra local runtime")}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
          aria-label={t("Close system status")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <Link href="/comfyui" onClick={onClose} className="block rounded-xl border border-violet-800 px-3 py-3 text-center text-sm text-violet-300 hover:bg-violet-500/10">{t("ComfyUI overview and startup")} →</Link>
        <div className="flex items-center justify-between rounded-xl bg-zinc-900/70 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950">
              <Server
                className={`h-4 w-4 ${
                  comfyOnline
                    ? "text-emerald-400"
                    : "text-zinc-600"
                }`}
              />
            </div>

            <span className="text-sm text-zinc-300">
              ComfyUI
            </span>
          </div>

          <span
            className={`text-xs font-medium ${
              comfyOnline
                ? "text-emerald-400"
                : "text-zinc-500"
            }`}
          >
            {comfyOnline ? t("Online") : t("Offline")}
          </span>
        </div>

        <div className="rounded-xl bg-zinc-900/70 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950">
              <Cpu
                className={`h-5 w-5 ${
                  gpuOnline
                    ? "text-emerald-400"
                    : "text-zinc-600"
                }`}
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">
                {gpuName || t("No GPU detected")}
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                {t("Local compute")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500">
              VRAM
            </span>

            <span className="text-xs font-medium text-zinc-300">
              {usedVram !== null
                ? `${formatBytes(usedVram)} / ${formatBytes(
                    vramTotal
                  )}`
                : "—"}
            </span>
          </div>

          {vramPercent !== null && (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${vramPercent}%` }}
                />
              </div>

              <p className="mt-2 text-right text-[11px] text-zinc-600">
                {vramPercent}% {t("used")}
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <QueueCard label={t("Running")} value={queueRunning} />
          <QueueCard label={t("Queued")} value={queuePending} />
        </div>
      </div>
    </div>
  );
}

type QueueCardProps = {
  label: string;
  value: number;
};

function QueueCard({ label, value }: QueueCardProps) {
  return (
    <div className="rounded-xl bg-zinc-900/70 p-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-zinc-200">
        {value}
      </p>
    </div>
  );
}

function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined) {
    return "—";
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function calculateUsed(
  total?: number | null,
  free?: number | null
): number | null {
  if (
    total === null ||
    total === undefined ||
    free === null ||
    free === undefined
  ) {
    return null;
  }

  return Math.max(0, total - free);
}
