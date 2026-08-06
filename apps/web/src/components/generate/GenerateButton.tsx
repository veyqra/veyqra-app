"use client";

import { LoaderCircle, Play } from "lucide-react";

import { generateModels } from "@/lib/generate-demo-data";
import { useGenerateStore } from "@/stores/generate-store";
import type { GeneratedImage, GenerationJob } from "@/types/generate";

export function GenerateButton() {
  const prompt = useGenerateStore((state) => state.prompt);
  const modelId = useGenerateStore((state) => state.modelId);
  const resolutionId = useGenerateStore(
    (state) => state.resolutionId
  );
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

  function handleGenerate() {
    if (!prompt.trim() || isGenerating) {
      return;
    }

    const request = getRequest();
    const selectedModel = generateModels.find(
      (model) => model.id === modelId
    );
    const jobId = crypto.randomUUID();

    const job: GenerationJob = {
      id: jobId,
      prompt: request.prompt,
      modelName: selectedModel?.name ?? "Unknown model",
      status: "running",
      progress: 10,
      createdAt: new Date().toISOString(),
    };

    addJob(job);
    setIsGenerating(true);

    window.setTimeout(() => {
      updateJob(jobId, { progress: 45 });
    }, 500);

    window.setTimeout(() => {
      updateJob(jobId, { progress: 80 });
    }, 1000);

    window.setTimeout(() => {
      const placeholderImage =
        "https://placehold.co/1024x1024/18181b/a78bfa?text=Vyrra+Preview";

      const image: GeneratedImage = {
        id: crypto.randomUUID(),
        prompt: request.prompt,
        imageUrl: placeholderImage,
        modelName: selectedModel?.name ?? "Unknown model",
        width: resolutionId === "landscape" ? 1152 : 1024,
        height: resolutionId === "portrait" ? 1152 : 1024,
        createdAt: new Date().toISOString(),
      };

      updateJob(jobId, {
        status: "completed",
        progress: 100,
      });

      addHistoryImage(image);
      setPreviewImageUrl(image.imageUrl);
      setIsGenerating(false);
    }, 1500);
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
