"use client";

import {
  ChevronLeft,
  ChevronRight,
  History,
  ImageIcon,
} from "lucide-react";

import { useGenerateStore } from "@/stores/generate-store";
import { ImageReuseActions } from "./ImageReuseActions";

export function HistoryPanel() {
  const history = useGenerateStore((state) => state.history);
  const previewImageUrl = useGenerateStore(
    (state) => state.previewImageUrl
  );
  const setPreviewImageUrl = useGenerateStore(
    (state) => state.setPreviewImageUrl
  );

  const currentHistoryIndex = history.findIndex(
    (image) => image.imageUrl === previewImageUrl
  );

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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-violet-400" />

          <div>
            <h2 className="text-xl font-semibold">
              Generation history
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Recently generated images in this session.
            </p>
          </div>
        </div>

        {history.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => showHistoryImage(-1)}
              aria-label="Show previous history image"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 transition hover:border-violet-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <span className="min-w-12 text-center text-xs text-zinc-500">
              {currentHistoryIndex === -1
                ? `– / ${history.length}`
                : `${currentHistoryIndex + 1} / ${history.length}`}
            </span>

            <button
              type="button"
              onClick={() => showHistoryImage(1)}
              aria-label="Show next history image"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 transition hover:border-violet-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950">
          <div className="text-center text-zinc-600">
            <ImageIcon className="mx-auto h-6 w-6" />
            <p className="mt-2 text-sm">No images yet</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {history.map((image) => (
            <article
              key={image.id}
              className={`overflow-hidden rounded-xl border bg-zinc-950 transition hover:border-violet-500 ${
                image.imageUrl === previewImageUrl
                  ? "border-violet-500 ring-2 ring-violet-500/30"
                  : "border-zinc-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setPreviewImageUrl(image.imageUrl)}
                aria-pressed={image.imageUrl === previewImageUrl}
                className="group block w-full text-left"
              >
                <div className="aspect-square overflow-hidden bg-zinc-900">
                  <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="p-3">
                  <p className="truncate text-sm font-medium">
                    {image.prompt}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {image.modelName}
                  </p>
                </div>
              </button>

              <ImageReuseActions
                imageId={image.id}
                imageUrl={image.imageUrl}
                className="border-t border-zinc-800 p-2"
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
