"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { updateHistoryItem } from "@/services/history-api";
import { captureSettings, useTemplateStore } from "@/stores/template-store";
import { resolutionPresets, sdxlResolutionPresets } from "@/lib/generation-presets";
import type { HistoryItem } from "@/types/history";
import { parseTags } from "@/lib/history-organization";

export function HistoryImageTools({ item, projects, onUpdated, onError, compareSelected, onCompare, onUpscale }: {
  item: HistoryItem; projects: string[]; onUpdated: (item: HistoryItem) => void;
  onError: (message: string) => void; compareSelected: boolean;
  onCompare: () => void; onUpscale: () => void;
}) {
  const { t } = useI18n();
  const [project, setProject] = useState(item.project);
  const [tags, setTags] = useState(item.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const saveTemplate = useTemplateStore((state) => state.save);
  const buttonClass = "rounded-lg border border-zinc-700 px-2 py-2 text-xs hover:border-violet-500 disabled:opacity-40";
  async function update(favorite: boolean, projectName: string, newTags?: string[]) {
    setBusy(true);
    try { onUpdated(await updateHistoryItem(item.id, favorite, projectName, newTags)); }
    catch (error) { onError(error instanceof Error ? error.message : t("Could not save image details.")); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} aria-pressed={item.favorite} className={buttonClass} onClick={() => void update(!item.favorite, item.project)}>{item.favorite ? "★" : "☆"} {t("Favorite")}</button>
      <button type="button" aria-pressed={compareSelected} className={`${buttonClass} ${compareSelected ? "border-violet-400 text-violet-300" : ""}`} onClick={onCompare}>{t("Compare")}</button>
      <button type="button" className={buttonClass} onClick={() => {
        const name = window.prompt(t("Template name"), item.prompt.slice(0, 60));
        if (!name?.trim()) return;
        const resolution = [...resolutionPresets, ...sdxlResolutionPresets].find((r) => r.width === item.width && r.height === item.height);
        saveTemplate(name.slice(0, 100), {
          ...captureSettings(), prompt: item.prompt, negativePrompt: item.negativePrompt,
          modelId: item.modelId, modelFamily: null, loraId: item.loraId, loraStrength: item.loraStrength,
          seed: String(item.seed), seedLocked: true, steps: item.steps, guidance: item.guidance,
          sampler: item.sampler, scheduler: item.scheduler, resolutionId: resolution?.id ?? "square",
          generationMode: "text_to_image", batchSize: 1, denoiseStrength: 0.65,
          maskPrompt: "", maskConfidence: 0.3, maskExpand: 40,
        });
      }}>{t("Save template")}</button>
      <button type="button" className={buttonClass} onClick={onUpscale}>{t("Upscale")}</button>
    </div>
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void update(item.favorite, project, parseTags(tags)); }}>
      <div className="flex gap-2">
      <input aria-label={t("Project")} placeholder={t("Project (optional)")} list={`projects-${item.id}`} maxLength={100} value={project} onChange={(e) => setProject(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs" />
      <datalist id={`projects-${item.id}`}>{projects.map((name) => <option key={name} value={name} />)}</datalist>
      <button className={buttonClass} disabled={busy || (project.trim() === item.project && JSON.stringify(parseTags(tags)) === JSON.stringify(item.tags))}>{t("Save")}</button>
      </div>
      <input aria-label={t("Tags separated by commas")} placeholder={t("Tags separated by commas")} value={tags} maxLength={1500} onChange={(e) => setTags(e.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs" />
    </form>
  </div>;
}
