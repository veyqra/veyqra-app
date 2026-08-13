"use client";

import { LoaderCircle, Play } from "lucide-react";

import {
  cancelGeneration,
  createGeneration,
  getGeneration,
} from "@/services/generation-api";
import { useGenerateStore } from "@/stores/generate-store";
import type { GenerationJob } from "@/types/generate";

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 15 * 60_000;

export function GenerateButton() {
  const prompt = useGenerateStore((state) => state.prompt);
  const isGenerating = useGenerateStore(
    (state) => state.isGenerating
  );

  const setIsGenerating = useGenerateStore(
    (state) => state.setIsGenerating
  );
  const setPreviewImageUrl = useGenerateStore(
    (state) => state.setPreviewImageUrl
  );
  const addJob = useGenerateStore((state) => state.addJob);
  const updateJob = useGenerateStore((state) => state.updateJob);
  const addHistoryImage = useGenerateStore(
    (state) => state.addHistoryImage
  );
  const setGenerationError = useGenerateStore(  (state) => state.setGenerationError);
  const getRequest = useGenerateStore((state) => state.getRequest);
  const queue = useGenerateStore((state) => state.queue);
  const currentJob = queue.find(
    (job) => job.status === "queued" || job.status === "running"
  );
  const statusLabel =
    currentJob?.status === "queued"
      ? "Queued..."
      : currentJob?.status === "running"
      ? `Generating ${currentJob.progress ?? 0}%`
      : "Generate";

  async function handleGenerate() {
    setGenerationError(null);
    if (!prompt.trim() || isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      const createdJob = await createGeneration(getRequest());

      addJob(createdJob);

      const finishedJob = await pollGeneration(createdJob.id, (job) => {
        updateJob(job.id, job);
      });

      updateJob(finishedJob.id, finishedJob);

      if (
        finishedJob.status === "completed" &&
        finishedJob.image
      ) {
        setGenerationError(null);
        addHistoryImage(finishedJob.image);
        setPreviewImageUrl(finishedJob.image.imageUrl);
      }

      if (finishedJob.status === "failed") {
        const message =
          finishedJob.error ??
          "Generation failed.";
        setGenerationError(message);
        console.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Generation failed.";
      setGenerationError(message);
      console.error(
        "Unable to generate image:",
        error
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCancel() {
    if (!currentJob) {
      return;
    }

    try {
      const cancelledJob = await cancelGeneration(currentJob.id);
      updateJob(cancelledJob.id, cancelledJob);
      setGenerationError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to cancel generation.";
      setGenerationError(message);
      console.error("Unable to cancel generation:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={!prompt.trim() || isGenerating}
        onClick={handleGenerate}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" />
            {statusLabel}
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            Generate
          </>
        )}
      </button>
      {isGenerating && currentJob && (
        <button
          type="button"
          onClick={() => void handleCancel()}
          className="w-full rounded-xl border border-red-900/60 bg-red-950/20 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/40"
        >
          Cancel generation
        </button>
      )}
    </div>
  );
}

async function pollGeneration(
  jobId: string,
  onUpdate: (job: GenerationJob) => void
): Promise<GenerationJob> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const job = await getGeneration(jobId);

    onUpdate(job);

    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled"
    ) {
      return job;
    }

    await wait(POLL_INTERVAL_MS);
  }

  throw new Error("Generation polling timed out");
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
