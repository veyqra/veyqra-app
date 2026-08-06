"use client";

import { History, ImageIcon } from "lucide-react";

import { useGenerateStore } from "@/stores/generate-store";

export function HistoryPanel() {
  const history = useGenerateStore((state) => state.history);
  const setPreviewImageUrl = useGenerateStore(
    (state) => state.setPreviewImageUrl
  );

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-5 flex items-center gap-2">
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
            <button
              key={image.id}
              type="button"
              onClick={() => setPreviewImageUrl(image.imageUrl)}
              className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-left transition hover:border-violet-500"
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
          ))}
        </div>
      )}
    </section>
  );
}
