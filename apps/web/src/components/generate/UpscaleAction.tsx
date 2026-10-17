"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { UpscaleDialog, type UpscaleSource } from "@/components/history/UpscaleDialog";
import { useGenerateStore } from "@/stores/generate-store";
import { useI18n } from "@/lib/i18n";
import { pollGeneration } from "@/services/generation-monitor";

export function UpscaleAction({ image, inGenerator = false, className = "" }: {
  image: UpscaleSource;
  inGenerator?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  async function monitor(jobId: string) {
    const store = useGenerateStore.getState;
    store().setGenerationError(null);
    try {
      const result = await pollGeneration(jobId, (job) => {
        if (store().queue.some((existing) => existing.id === job.id)) store().updateJob(job.id, job);
        else store().addJob(job);
      }, t("Generation polling timed out"));
      if (result.status === "completed" && result.image) {
        if (!store().history.some((existing) => existing.id === result.image?.id)) store().addHistoryImage(result.image);
        store().setPreviewImageUrl(result.image.imageUrl);
      }
      if (result.status === "failed") store().setGenerationError(result.error ?? t("Upscaling failed."));
    } catch (error) {
      store().setGenerationError(error instanceof Error ? error.message : t("Unable to monitor generation."));
    }
  }

  return <>
    <button type="button" className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border border-violet-700 bg-violet-500/10 px-3 py-2 text-xs text-violet-200 transition hover:bg-violet-500/20 ${className}`} onClick={() => setOpen(true)}>
      <Maximize2 className="h-4 w-4" />{t("Upscale")}
    </button>
    {open && <UpscaleDialog item={image} onClose={() => setOpen(false)} onSubmitted={inGenerator ? (id) => { void monitor(id); } : undefined} />}
  </>;
}
