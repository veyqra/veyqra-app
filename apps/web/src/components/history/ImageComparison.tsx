"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { HistoryItem } from "@/types/history";
import { useI18n } from "@/lib/i18n";

export function ImageComparison({ items, onClose }: { items: HistoryItem[]; onClose: () => void }) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const rows: [string, (item: HistoryItem) => string][] = [
    [t("Model"), (i) => i.modelName], ["LoRA", (i) => `${i.loraId} (${i.loraStrength})`],
    [t("Seed"), (i) => String(i.seed)], [t("Steps"), (i) => String(i.steps)],
    [t("Guidance"), (i) => String(i.guidance)], [t("Resolution"), (i) => `${i.width} × ${i.height}`],
    [t("Sampler"), (i) => i.sampler], [t("Scheduler"), (i) => i.scheduler],
    [t("Prompt"), (i) => i.prompt], [t("Negative prompt"), (i) => i.negativePrompt],
  ];
  return <Modal label={t("Image comparison")} onClose={onClose}>
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{t("Image comparison")}</h2>
        <label className="flex items-center gap-3">{t("Zoom")} {Math.round(zoom * 100)}%
          <input type="range" min="1" max="4" step="0.25" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        <button autoFocus type="button" onClick={onClose} className="rounded-lg border border-zinc-600 px-4 py-2">{t("Close")}</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, index) => <div key={item.id}>
          <p className="mb-2 text-sm text-violet-300">{index === 0 ? "A" : "B"}</p>
          <div className="h-[55vh] overflow-auto rounded-xl border border-zinc-700 bg-zinc-950">
            <img src={item.imageUrl} alt={item.prompt} className="max-w-none object-contain" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} />
          </div>
        </div>)}
      </div>
      <table className="w-full table-fixed text-left text-xs sm:text-sm">
        <thead><tr><th className="w-24 p-2">{t("Parameters")}</th><th className="p-2">A</th><th className="p-2">B</th></tr></thead>
        <tbody>{rows.map(([label, value]) => <tr key={label} className={`border-t border-zinc-800 ${value(items[0]) !== value(items[1]) ? "bg-violet-500/10" : ""}`}>
          <th className="p-2 align-top font-medium text-zinc-400">{label}</th>
          {items.map((item) => <td key={item.id} className="break-words p-2 align-top">{value(item) || "—"}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </Modal>;
}
