"use client";

import { LoaderCircle, Play } from "lucide-react";
import { useState } from "react";

import {
  cancelGeneration,
  createGeneration,
} from "@/services/generation-api";
import { uploadGenerationImage } from "@/services/uploads-api";
import { useGenerateStore } from "@/stores/generate-store";
import { pollGeneration } from "@/services/generation-monitor";
import { useI18n } from "@/lib/i18n";


export function GenerateButton() {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prompt = useGenerateStore((state) => state.prompt);

  const generationMode = useGenerateStore(
    (state) => state.generationMode
  );
  const inputImageFile = useGenerateStore(
    (state) => state.inputImageFile
  );
  const uploadedInputFilename = useGenerateStore(
    (state) => state.uploadedInputFilename
  );
  const setUploadedInputFilename = useGenerateStore(
    (state) => state.setUploadedInputFilename
  );

  const setPreviewImageUrl = useGenerateStore(
    (state) => state.setPreviewImageUrl
  );
  const addJob = useGenerateStore((state) => state.addJob);
  const updateJob = useGenerateStore((state) => state.updateJob);
  const addHistoryImage = useGenerateStore(
    (state) => state.addHistoryImage
  );
  const setGenerationError = useGenerateStore(
    (state) => state.setGenerationError
  );
  const getRequest = useGenerateStore((state) => state.getRequest);
  const queue = useGenerateStore((state) => state.queue);
  const currentJob = queue.find(
    (job) => job.status === "queued" || job.status === "running"
  );

  const inputImageRequired =
    generationMode !== "text_to_image";
  const inputImageMissing =
    inputImageRequired && !inputImageFile && !uploadedInputFilename;

  async function handleGenerate() {
    setGenerationError(null);
    if (!prompt.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (
        generationMode !== "text_to_image" &&
        !inputImageFile &&
        !uploadedInputFilename
      ) {
        throw new Error(
          t("Select an input image before generating.")
        );
      }

      let inputFilename = uploadedInputFilename;

      if (
        generationMode !== "text_to_image" &&
        inputImageFile &&
        !inputFilename
      ) {
        const uploaded = await uploadGenerationImage(
          inputImageFile
        );
        inputFilename = uploaded.filename;
        setUploadedInputFilename(uploaded.filename);
      }

      const request = getRequest();
      let maskImage: string | null = null;
      const manualMask = useGenerateStore.getState().manualMask;
      if (generationMode === "inpaint" && manualMask) {
        const blob = await (await fetch(manualMask)).blob();
        maskImage = (await uploadGenerationImage(new File([blob], "mask.png", { type: "image/png" }))).filename;
      }

      const createdJob = await createGeneration({
        ...request,
        maskImage,
        inputImage:
          generationMode === "text_to_image"
            ? null
            : inputFilename,
      });

      addJob(createdJob);
      void monitorGeneration(createdJob.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("Generation failed");
      setGenerationError(message);
      console.error(
        "Unable to generate image:",
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function monitorGeneration(jobId: string) {
    try {
      const finishedJob = await pollGeneration(
        jobId,
        (job) => updateJob(job.id, job),
        t("Generation polling timed out")
      );

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
          finishedJob.error ?? t("Generation failed");
        setGenerationError(message);
        console.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("Unable to monitor generation.");
      setGenerationError(message);
      console.error(
        `Unable to monitor generation ${jobId}:`,
        error
      );
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
          : t("Unable to cancel generation.");
      setGenerationError(message);
      console.error("Unable to cancel generation:", error);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={
          !prompt.trim() ||
          isSubmitting ||
          inputImageMissing
        }
        onClick={handleGenerate}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" />
            {t("Adding to queue...")}
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            {t("Generate")}
          </>
        )}
      </button>
      {currentJob && (
        <button
          type="button"
          onClick={() => void handleCancel()}
          className="w-full rounded-xl border border-red-900/60 bg-red-950/20 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/40"
        >
          {t("Cancel latest job")}
        </button>
      )}
    </div>
  );
}
