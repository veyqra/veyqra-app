"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  Upload,
} from "lucide-react";

import { useGenerateStore } from "@/stores/generate-store";
import { ImageReuseActions } from "./ImageReuseActions";

export function PreviewPanel() {
  const previewImageUrl = useGenerateStore(
    (state) => state.previewImageUrl
  );
  const queue = useGenerateStore(
    (state) => state.queue
  );
  const history = useGenerateStore(
    (state) => state.history
  );
  const setInputImageUrl = useGenerateStore(
    (state) => state.setInputImageUrl
  );
  const setPreviewImageUrl = useGenerateStore(
    (state) => state.setPreviewImageUrl
  );

  const currentHistoryIndex = history.findIndex(
    (image) => image.imageUrl === previewImageUrl
  );

  const currentMaskJob = queue.find(
    (job) => job.maskPreviewUrl
  );

  const maskPreviewUrl =
    currentMaskJob?.maskPreviewUrl ?? null;
  const maskPrompt =
    currentMaskJob?.maskPrompt ?? null;

  function handleInputImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setInputImageUrl(URL.createObjectURL(file));
  }

  function showHistoryImage(offset: number) {
    if (history.length === 0) {
      return;
    }

    const activeIndex =
      currentHistoryIndex === -1 ? 0 : currentHistoryIndex;
    const nextIndex =
      (activeIndex + offset + history.length) % history.length;

    setPreviewImageUrl(history[nextIndex].imageUrl);
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Preview</h2>

          <p className="mt-1 text-sm text-zinc-500">
            The latest generated image appears here.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm transition hover:border-violet-500 sm:flex-none">
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
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm transition hover:border-violet-500 sm:flex-none"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          )}
        </div>
      </div>

      {previewImageUrl && currentHistoryIndex !== -1 && (
        <ImageReuseActions
          imageId={history[currentHistoryIndex].id}
          imageUrl={previewImageUrl}
          className="mb-4 sm:ml-auto sm:max-w-md"
        />
      )}

      <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 sm:min-h-[420px] lg:min-h-[620px]">
        {previewImageUrl ? (
          <>
            <img
              src={previewImageUrl}
              alt="Generated preview"
              className="max-h-[70vh] w-full object-contain lg:max-h-[760px]"
            />

            {history.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => showHistoryImage(-1)}
                  aria-label="Show previous history image"
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 text-zinc-200 shadow-lg backdrop-blur transition hover:border-violet-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={() => showHistoryImage(1)}
                  aria-label="Show next history image"
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 text-zinc-200 shadow-lg backdrop-blur transition hover:border-violet-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {currentHistoryIndex !== -1 && (
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-1 text-xs text-zinc-300 shadow-lg backdrop-blur">
                    {currentHistoryIndex + 1} / {history.length}
                  </span>
                )}
              </>
            )}
          </>
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

      {maskPreviewUrl && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-300">
              Detected mask
            </p>

            <span className="text-xs text-zinc-600">
              Auto segmentation
            </span>
          </div>

          {maskPrompt && (
            <p className="mb-3 text-sm text-zinc-500">
              Detected area:{" "}
              <span className="font-medium text-zinc-300">
                {maskPrompt}
              </span>
            </p>
          )}

          <div className="overflow-hidden rounded-lg bg-black">
            <img
              src={maskPreviewUrl}
              alt="Detected inpaint mask"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
