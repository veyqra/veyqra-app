"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUpscaleModels, upscaleHistoryItem } from "@/services/history-api";
import { useI18n } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import type { HistoryItem } from "@/types/history";

export type UpscaleSource = Pick<HistoryItem, "id" | "width" | "height">;

export function UpscaleDialog({ item, onClose, onSubmitted }: {
  item: UpscaleSource;
  onClose: () => void;
  onSubmitted?: (jobId: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [factor, setFactor] = useState(2);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    getUpscaleModels().then((data) => {
      if (!cancelled) { setModels(data); setModel(data[0] ?? ""); }
    }).catch((error) => { if (!cancelled) setError(String(error)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const tooLarge = item.width * item.height * factor * factor > 40_000_000;
  return <Modal label={t("Upscale")} onClose={onClose} closeDisabled={busy}>
    <div className="flex min-h-full items-center justify-center">
    <form className="w-full max-w-lg space-y-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-6" onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      setBusy(true); setError("");
      try {
        const jobId = await upscaleHistoryItem(item.id, model, factor);
        if (onSubmitted) onSubmitted(jobId);
        else router.push("/jobs");
        onClose();
      } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
      finally { setBusy(false); }
    }}>
      <h2 className="text-xl font-semibold">{t("Upscale")}</h2>
      <p className="text-sm text-zinc-400">{t("AI upscaling runs in ComfyUI. The result is saved as a new history image.")}</p>
      {loading ? <p role="status">{t("Loading models...")}</p> : models.length === 0 ? <p className="text-sm text-amber-300">{t("No upscale models found. Add a compatible model to ComfyUI/models/upscale_models, then reopen this dialog.")}</p> : <label className="block text-sm">{t("Model")}
        <select className="mt-2 w-full rounded-lg bg-zinc-950 p-3" value={model} onChange={(e) => setModel(e.target.value)}>{models.map((name) => <option key={name}>{name}</option>)}</select>
      </label>}
      <label className="block text-sm">{t("Scale factor")}
        <select className="ml-3 rounded-lg bg-zinc-950 p-2" value={factor} onChange={(e) => setFactor(Number(e.target.value))}>{[2, 3, 4].map((scale) => <option key={scale} value={scale}>{scale}×</option>)}</select>
      </label>
      <p className="text-sm">{item.width} × {item.height} → {item.width * factor} × {item.height * factor}</p>
      {tooLarge && <p role="alert" className="text-sm text-amber-300">{t("Output exceeds 40 megapixels. Choose a smaller factor.")}</p>}
      {error && <p role="alert" className="break-words text-sm text-red-300">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" autoFocus disabled={busy} onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-40">{t("Close")}</button>
        <button disabled={loading || busy || !model || tooLarge} className="rounded-lg bg-violet-600 px-4 py-2 disabled:opacity-40">{busy ? t("Submitting...") : t("Start upscale")}</button>
      </div>
    </form>
    </div>
  </Modal>;
}
