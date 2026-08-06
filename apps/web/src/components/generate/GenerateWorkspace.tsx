"use client";

import { Sparkles } from "lucide-react";

import { GenerateButton } from "./GenerateButton";
import { HistoryPanel } from "./HistoryPanel";
import { ParameterPanel } from "./ParameterPanel";
import { PreviewPanel } from "./PreviewPanel";
import { PromptEditor } from "./PromptEditor";
import { QueuePanel } from "./QueuePanel";

export function GenerateWorkspace() {
  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-7 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />

              <h2 className="text-xl font-semibold">
                Generation settings
              </h2>
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              Configure the prompt, model and output parameters.
            </p>
          </div>

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
