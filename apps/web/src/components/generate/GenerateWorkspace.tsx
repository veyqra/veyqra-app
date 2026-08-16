"use client";

import { Sparkles, CircleAlert, X } from "lucide-react";
import { useGenerateStore } from "@/stores/generate-store";
import { useI18n } from "@/lib/i18n";

import { GenerateButton } from "./GenerateButton";
import { HistoryPanel } from "./HistoryPanel";
import { ParameterPanel } from "./ParameterPanel";
import { PreviewPanel } from "./PreviewPanel";
import { PromptEditor } from "./PromptEditor";
import { GenerationModePanel } from "./GenerationModePanel";
import { InputImagePanel } from "./InputImagePanel";
import { QueuePanel } from "./QueuePanel";

export function GenerateWorkspace() {
  const { t } = useI18n();
  const generationError = useGenerateStore(
    (state) => state.generationError
  );
  const setGenerationError = useGenerateStore(
    (state) => state.setGenerationError
  );
  const queue = useGenerateStore((state) => state.queue);
  const activeJobs = queue.filter(
    (job) =>
      job.status === "queued" ||
      job.status === "running"
  );
  const currentJob = activeJobs[0];
  return (
    <div className="space-y-6">
      {generationError && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 break-words">
              {generationError}
            </div>
            <button
              type="button"
              onClick={() => setGenerationError(null)}
              className="shrink-0 text-red-400/70 transition hover:text-red-200"
              title={t("Dismiss error")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {currentJob && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-violet-300">
              {activeJobs.length === 1
                ? currentJob.status === "queued"
                  ? t("1 job waiting in ComfyUI...")
                  : t("1 job generating...")
                : `${activeJobs.length} jobs active in ComfyUI`}
            </span>
            <span className="font-mono text-xs text-zinc-400">
              {currentJob.progress ?? 0}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{
                width: `${currentJob.progress ?? 0}%`,
              }}
            />
          </div>
        </div>
      )}
      <div className="grid items-start gap-4 lg:gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 lg:space-y-7 lg:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <h2 className="text-xl font-semibold">
                {t("Generation settings")}
              </h2>
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              {t("Configure the prompt, model and output parameters.")}
            </p>
          </div>

          <GenerationModePanel />
          <InputImagePanel />
          <PromptEditor />

          <div className="border-t border-zinc-800" />

          <ParameterPanel />

          <GenerateButton />
        </aside>

        <div className="space-y-6">
          <PreviewPanel />
          <QueuePanel />
        </div>
      </div>

      <HistoryPanel />
    </div>
  );
}
