"use client";

import { MessageSquareText } from "lucide-react";

import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { useGenerateStore } from "@/stores/generate-store";
import { useI18n } from "@/lib/i18n";

const textareaClassName =
  "mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10";

export function PromptEditor() {
  const { t } = useI18n();
  const prompt = useGenerateStore((state) => state.prompt);
  const negativePrompt = useGenerateStore(
    (state) => state.negativePrompt
  );
  const modelFamily = useGenerateStore(
    (state) => state.modelFamily
  );
  const generationMode = useGenerateStore(
    (state) => state.generationMode
  );
  const maskPrompt = useGenerateStore(
    (state) => state.maskPrompt
  );
  const setPrompt = useGenerateStore((state) => state.setPrompt);
  const setNegativePrompt = useGenerateStore(
    (state) => state.setNegativePrompt
  );
  const setMaskPrompt = useGenerateStore(
    (state) => state.setMaskPrompt
  );

  function handleVoiceTranscript(transcript: string) {
    const current = prompt.trim();

    setPrompt(
      current
        ? `${current} ${transcript}`
        : transcript
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-violet-400" />

        <h3 className="font-semibold">{t("Prompt")}</h3>
      </div>

      <div className="text-sm font-medium text-zinc-300">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="positive-prompt">
            {t("Positive prompt")}
          </label>

          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
          />
        </div>

        <textarea
          id="positive-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={7}
          placeholder={
            generationMode === "inpaint"
              ? t("Describe how the selected area should change...")
              : t("Describe the image you want to generate...")
          }
          className={textareaClassName}
        />

        <span className="mt-2 block text-right text-xs text-zinc-600">
          {prompt.length} {t("characters")}
        </span>
      </div>

      {modelFamily === "sdxl" && (
        <label className="block text-sm font-medium text-zinc-300">
          {t("Negative prompt")}
          <span className="ml-2 text-xs font-normal text-zinc-600">
            {t("Optional")}
          </span>

          <textarea
            value={negativePrompt}
            onChange={(event) => setNegativePrompt(event.target.value)}
            rows={4}
            placeholder={t("Describe elements that should not appear...")}
            className={textareaClassName}
          />

          <span className="mt-2 block text-right text-xs font-normal text-zinc-600">
            {negativePrompt.length} {t("characters")}
          </span>
        </label>
      )}

      {generationMode === "inpaint" && (
        <label className="block text-sm font-medium text-zinc-300">
          {t("Mask prompt")}
          <span className="ml-2 text-xs font-normal text-zinc-600">
            {t("Optional")}
          </span>

          <input
            value={maskPrompt}
            onChange={(event) => setMaskPrompt(event.target.value)}
            placeholder={t("e.g. red shirt, face, background")}
            className={textareaClassName}
          />

          <span className="mt-2 block text-xs font-normal leading-5 text-zinc-600">
            {t("Leave empty to detect the mask area automatically from the positive prompt.")}
          </span>
        </label>
      )}
    </section>
  );
}
