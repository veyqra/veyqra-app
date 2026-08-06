"use client";

import { Download, ImageIcon, Upload } from "lucide-react";

import { useGenerateStore } from "@/stores/generate-store";

export function PreviewPanel() {
  const previewImageUrl = useGenerateStore(
    (state) => state.previewImageUrl
  );
  const setInputImageUrl = useGenerateStore(
    (state) => state.setInputImageUrl
  );

  function handleInputImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setInputImageUrl(URL.createObjectURL(file));
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Preview</h2>

          <p className="mt-1 text-sm text-zinc-500">
            The latest generated image appears here.
          </p>
        </div>

        <div className="flex gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm transition hover:border-violet-500">
            <Upload className="h-4 w-4" />
            Input image

            <input
              type="file"
              accept="image/*"
              onChange={handleInputImage}
              className="hidden"
            />
          </label>

          {previewImageUrl && (
            <a
              href={previewImageUrl}
              download
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm transition hover:border-violet-500"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          )}
        </div>
      </div>

      <div className="flex min-h-[620px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-700 bg-zinc-950">
        {previewImageUrl ? (
          <img
            src={previewImageUrl}
            alt="Generated preview"
            className="max-h-[760px] w-full object-contain"
          />
        ) : (
          <div className="max-w-sm p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <ImageIcon className="h-8 w-8 text-violet-400" />
            </div>

            <h3 className="mt-5 text-lg font-semibold">
              No image generated
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Configure your settings, enter a prompt and start a
              generation.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
