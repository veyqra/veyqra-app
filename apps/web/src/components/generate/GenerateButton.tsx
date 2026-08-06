"use client";

import { LoaderCircle, Play } from "lucide-react";

import {
  createGeneration,
  getGeneration,
} from "@/services/generation-api";
import { useGenerateStore } from "@/stores/generate-store";
import type { GenerationJob } from "@/types/generate";

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 60_000;

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
  const getRequest = useGenerateStore((state) => state.getRequest);

  async function handleGenerate() {
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
        addHistoryImage(finishedJob.image);
        setPreviewImageUrl(finishedJob.image.imageUrl);
      }

      if (finishedJob.status === "failed") {
        console.error(
          finishedJob.error ?? "Generation failed"
        );
      }
    } catch (error) {
      console.error("Unable to generate image:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      disabled={!prompt.trim() || isGenerating}
      onClick={handleGenerate}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Generating
        </>
      ) : (
        <>
          <Play className="h-5 w-5" />
          Generate image
        </>
      )}
    </button>
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
