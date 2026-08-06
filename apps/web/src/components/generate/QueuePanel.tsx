"use client";

import { Clock3, Trash2, X } from "lucide-react";

import { useGenerateStore } from "@/stores/generate-store";

export function QueuePanel() {
  const queue = useGenerateStore((state) => state.queue);
  const removeJob = useGenerateStore((state) => state.removeJob);
  const clearQueue = useGenerateStore((state) => state.clearQueue);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Queue</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Generation jobs and their progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
            {queue.length} jobs
          </span>

          {queue.length > 0 && (
            <button
              type="button"
              onClick={clearQueue}
              className="text-zinc-500 transition hover:text-red-400"
              aria-label="Clear queue"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Clock3 className="h-4 w-4" />
            No active jobs
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((job) => (
            <article
              key={job.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {job.prompt}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {job.modelName} · {job.status}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeJob(job.id)}
                  className="text-zinc-600 transition hover:text-red-400"
                  aria-label="Remove job"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-zinc-600">
                <span>{job.status}</span>
                <span>{job.progress}%</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
