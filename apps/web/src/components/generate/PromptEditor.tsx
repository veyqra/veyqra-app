"use client";

import { useState } from "react";
import { Bookmark, MessageSquareText, Palette, Plus, Trash2 } from "lucide-react";

import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { useGenerateStore } from "@/stores/generate-store";
import { useI18n } from "@/lib/i18n";

const textareaClassName =
  "mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10";

const stylePresets = [
  { name: "Cinematic", prompt: "cinematic lighting, dramatic composition, film still, rich details", negativePrompt: "flat lighting, washed out, amateur composition" },
  { name: "Editorial", prompt: "editorial photography, clean composition, soft studio light, premium magazine aesthetic", negativePrompt: "cluttered, low quality, oversaturated" },
  { name: "Anime", prompt: "anime illustration, expressive character design, detailed background, vibrant colors", negativePrompt: "photorealistic, 3d render, blurry" },
  { name: "Product", prompt: "premium product photography, seamless background, softbox lighting, sharp focus", negativePrompt: "text, watermark, cluttered background" },
] as const;

export function PromptEditor() {
  const { t } = useI18n();
  const manualMask = useGenerateStore((state) => state.manualMask);
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
  const savedPrompts = useGenerateStore((state) => state.savedPrompts);
  const savePrompt = useGenerateStore((state) => state.savePrompt);
  const deleteSavedPrompt = useGenerateStore((state) => state.deleteSavedPrompt);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");

  function handleVoiceTranscript(transcript: string) {
    const current = prompt.trim();

    setPrompt(
      current
        ? `${current} ${transcript}`
        : transcript
    );
  }

  function appendStyle(style: (typeof stylePresets)[number]) {
    setPrompt(prompt.trim() ? `${prompt.trim()}, ${style.prompt}` : style.prompt);
    if (modelFamily === "sdxl" && style.negativePrompt) {
      setNegativePrompt(
        negativePrompt.trim()
          ? `${negativePrompt.trim()}, ${style.negativePrompt}`
          : style.negativePrompt
      );
    }
  }

  function saveCurrentPrompt() {
    const name = newPromptName.trim() || prompt.trim().slice(0, 42);
    if (!name || !prompt.trim()) return;

    savePrompt({ name, prompt: prompt.trim(), negativePrompt: negativePrompt.trim() });
    setNewPromptName("");
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-violet-400" />

        <h3 className="font-semibold">{t("Prompt")}</h3>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setLibraryOpen((open) => !open)}
            aria-expanded={libraryOpen}
            className="flex items-center gap-2 text-sm font-medium text-zinc-200 transition hover:text-white"
          >
            <Bookmark className="h-4 w-4 text-violet-400" />
            {t("Prompt library")}
          </button>
          <span className="text-xs text-zinc-500">{savedPrompts.length} {t("saved")}</span>
        </div>

        {libraryOpen && (
          <div className="mt-3 space-y-4 border-t border-zinc-800 pt-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <Palette className="h-3.5 w-3.5" />
                {t("Style presets")}
              </div>
              <div className="flex flex-wrap gap-2">
                {stylePresets.map((style) => (
                  <button
                    key={style.name}
                    type="button"
                    onClick={() => appendStyle(style)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-violet-500/70 hover:text-white"
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{t("Saved prompts")}</div>
              {savedPrompts.length ? (
                <div className="space-y-1.5">
                  {savedPrompts.map((savedPrompt) => (
                    <div key={savedPrompt.id} className="flex items-center gap-2 rounded-lg bg-zinc-900 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPrompt(savedPrompt.prompt);
                          setNegativePrompt(savedPrompt.negativePrompt);
                        }}
                        className="min-w-0 flex-1 truncate text-left text-sm text-zinc-300 hover:text-white"
                        title={savedPrompt.prompt}
                      >
                        {savedPrompt.name}
                      </button>
                      <button type="button" onClick={() => deleteSavedPrompt(savedPrompt.id)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-300" title={t("Delete saved prompt")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-zinc-500">{t("No saved prompts yet.")}</p>}
            </div>

            <div className="flex gap-2">
              <input
                value={newPromptName}
                onChange={(event) => setNewPromptName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && saveCurrentPrompt()}
                placeholder={t("Name this prompt...")}
                className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500"
              />
              <button type="button" onClick={saveCurrentPrompt} disabled={!prompt.trim()} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" /> {t("Save")}
              </button>
            </div>
          </div>
        )}
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

      {generationMode === "inpaint" && !manualMask && (
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
