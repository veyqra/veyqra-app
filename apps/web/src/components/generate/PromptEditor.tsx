"use client";

import { MessageSquareText } from "lucide-react";

import { useGenerateStore } from "@/stores/generate-store";

const textareaClassName =
  "mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10";

export function PromptEditor() {
  const prompt = useGenerateStore((state) => state.prompt);
  const negativePrompt = useGenerateStore(
    (state) => state.negativePrompt
  );
  const setPrompt = useGenerateStore((state) => state.setPrompt);
  const setNegativePrompt = useGenerateStore(
    (state) => state.setNegativePrompt
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-violet-400" />

        <h3 className="font-semibold">Prompt</h3>
      </div>

      <label className="block text-sm font-medium text-zinc-300">
        Positive prompt

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={7}
          placeholder="Describe the image you want to generate..."
          className={textareaClassName}
        />

        <span className="mt-2 block text-right text-xs text-zinc-600">
          {prompt.length} characters
        </span>
      </label>

      <label className="block text-sm font-medium text-zinc-300">
        Negative prompt

        <textarea
          value={negativePrompt}
          onChange={(event) =>
            setNegativePrompt(event.target.value)
          }
          rows={4}
          placeholder="Elements that should not appear..."
          className={textareaClassName}
        />
      </label>
    </section>
  );
}
