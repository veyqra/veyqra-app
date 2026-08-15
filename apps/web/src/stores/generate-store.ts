import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { resolutionPresets } from "@/lib/generation-presets";
import { copyHistoryImageToInputs } from "@/services/uploads-api";

import type {
  GeneratedImage,
  GenerationMode,
  GenerationJob,
  GenerateRequest,
} from "@/types/generate";

type GenerateStore = {
  prompt: string;
  negativePrompt: string;
  modelId: string;
  loraId: string;
  loraStrength: number;
  resolutionId: string;
  seed: string;
  seedLocked: boolean;
  steps: number;
  guidance: number;
  batchSize: number;
  denoiseStrength: number;
  inputImageUrl: string | null;
  generationMode: "text_to_image" | "image_to_image" | "inpaint";
  maskPrompt: string;
  maskConfidence: number;
  maskExpand: number;
  inputImageFile: File | null;
  uploadedInputFilename: string | null;
  previewImageUrl: string | null;
  generationError: string | null;
  isGenerating: boolean;
  queue: GenerationJob[];
  history: GeneratedImage[];

  setPrompt: (value: string) => void;
  setNegativePrompt: (value: string) => void;
  setModelId: (value: string) => void;
  setLoraId: (value: string) => void;
  setLoraStrength: (value: number) => void;
  setResolutionId: (value: string) => void;
  setSeed: (value: string) => void;
  setSeedLocked: (value: boolean) => void;
  randomizeSeed: () => void;
  setSteps: (value: number) => void;
  setGuidance: (value: number) => void;
  setBatchSize: (value: number) => void;
  setDenoiseStrength: (value: number) => void;
  setInputImageUrl: (value: string | null) => void;
  setGenerationMode: (  value: "text_to_image" | "image_to_image" | "inpaint") => void;
  prepareHistoryImage: (
    imageId: string,
    imageUrl: string,
    mode: Exclude<GenerationMode, "text_to_image">
  ) => Promise<void>;
  setInputImageFile: (value: File | null) => void;
  setMaskPrompt: (value: string) => void;
  setMaskConfidence: (value: number) => void;
  setMaskExpand: (value: number) => void;
  setUploadedInputFilename: (  value: string | null) => void;
  setPreviewImageUrl: (value: string | null) => void;
  setGenerationError: (  value: string | null) => void;
  setIsGenerating: (value: boolean) => void;
  addJob: (job: GenerationJob) => void;
  updateJob: (
    id: string,
    changes: Partial<GenerationJob>
  ) => void;
  removeJob: (id: string) => void;
  addHistoryImage: (image: GeneratedImage) => void;
  clearQueue: () => void;
  resetSettings: () => void;
  getRequest: () => GenerateRequest;
  applySettings: (settings: {
      prompt: string;
      negativePrompt: string;
      modelId: string;
      loraId: string;
      loraStrength: number;
      seed: number;
      steps: number;
      guidance: number;
      resolutionId: string;
  }) => void;
};

const initialSettings = {
  prompt: "",
  negativePrompt: "",
  modelId: "",
  loraId: "none",
  loraStrength: 1,
  resolutionId: resolutionPresets[0]?.id ?? "",
  seed: "-1",
  seedLocked: false,
  steps: 28,
  guidance: 3.5,
  batchSize: 1,
  denoiseStrength: 0.65,
  inputImageUrl: null,
  generationMode: "text_to_image" as const,
  inputImageFile: null,
  maskPrompt: "",
  maskConfidence: 0.3,
  maskExpand: 40,
  uploadedInputFilename: null,
  previewImageUrl: null,
  generationError: null,
  isGenerating: false,
};

export const useGenerateStore = create<GenerateStore>()(
  persist(
    (set, get) => ({
      ...initialSettings,

      queue: [],
      history: [],

      setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setModelId: (modelId) => set({ modelId }),
  setLoraId: (loraId) => set({ loraId }),
  setLoraStrength: (loraStrength) => set({ loraStrength }),
  setResolutionId: (resolutionId) => set({ resolutionId }),
  setSeed: (seed) => set({ seed }),
  setSeedLocked: (seedLocked) =>
  set({ seedLocked }),

  randomizeSeed: () =>
  set({
    seed: String(
      Math.floor(
        Math.random() * Number.MAX_SAFE_INTEGER
      )
    ),
  }),
  setSteps: (steps) => set({ steps }),
  setGuidance: (guidance) => set({ guidance }),
  setBatchSize: (batchSize) => set({ batchSize }),
  setDenoiseStrength: (denoiseStrength) =>  set({ denoiseStrength }),
  setInputImageUrl: (inputImageUrl) => set({ inputImageUrl }),
  setMaskPrompt: (maskPrompt) => set({ maskPrompt }),
  setMaskConfidence: (maskConfidence) => set({ maskConfidence }),
  setMaskExpand: (maskExpand) => set({ maskExpand }),
  setGenerationMode: (generationMode) =>  set({ generationMode }),
  prepareHistoryImage: async (imageId, imageUrl, generationMode) => {
    const uploaded = await copyHistoryImageToInputs(imageId);
    const previousUrl = get().inputImageUrl;

    if (previousUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previousUrl);
    }

    set({
      generationMode,
      inputImageFile: null,
      inputImageUrl: imageUrl,
      uploadedInputFilename: uploaded.filename,
      maskPrompt:
        generationMode === "inpaint"
          ? ""
          : get().maskPrompt,
      generationError: null,
    });
  },
  setInputImageFile: (inputImageFile) =>  set({ inputImageFile }),
  setPreviewImageUrl: (previewImageUrl) =>
    set({ previewImageUrl }),
  setUploadedInputFilename: (uploadedInputFilename) =>  set({ uploadedInputFilename }),
  setGenerationError: (generationError) =>  set({ generationError }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  addJob: (job) =>
    set((state) => ({
      queue: [job, ...state.queue],
    })),

  updateJob: (id, changes) =>
    set((state) => ({
      queue: state.queue.map((job) =>
        job.id === id ? { ...job, ...changes } : job
      ),
    })),

  removeJob: (id) =>
    set((state) => ({
      queue: state.queue.filter((job) => job.id !== id),
    })),

  addHistoryImage: (image) =>
    set((state) => ({
      history: [image, ...state.history],
    })),

  clearQueue: () => set({ queue: [] }),

  resetSettings: () =>
    set({
      ...initialSettings,
      queue: get().queue,
      history: get().history,
    }),
    
  applySettings: (settings) =>
    set({
        prompt: settings.prompt,
        negativePrompt: settings.negativePrompt,
        modelId: settings.modelId,
        loraId: settings.loraId,
        loraStrength: settings.loraStrength,
        seed: String(settings.seed),
        steps: settings.steps,
        guidance: settings.guidance,
        resolutionId: settings.resolutionId,
    }),  

      getRequest: () => {
        const state = get();
        const parsedSeed = Number.parseInt(state.seed, 10);

        return {
          prompt: state.prompt.trim(),
          negativePrompt: "",
          mode: state.generationMode,
          inputImage:
            state.generationMode === "text_to_image"
              ? null
              : state.uploadedInputFilename,
          maskPrompt: state.maskPrompt.trim(),
          maskConfidence: state.maskConfidence,
          maskExpand: state.maskExpand,
          modelId: state.modelId,
          loraId: state.loraId,
          loraStrength: state.loraStrength,
          resolutionId: state.resolutionId,
          seed: Number.isNaN(parsedSeed) ? -1 : parsedSeed,
          steps: state.steps,
          guidance: state.guidance,
          denoiseStrength:
            state.generationMode === "inpaint"
              ? 1
              : state.denoiseStrength,
          batchSize: state.batchSize,
        };
      },
    }),
    {
      name: "veyqra-generate-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        prompt: state.prompt,
        negativePrompt: state.negativePrompt,
        modelId: state.modelId,
        loraId: state.loraId,
        loraStrength: state.loraStrength,
        resolutionId: state.resolutionId,
        seed: state.seed,
        seedLocked: state.seedLocked,
        steps: state.steps,
        guidance: state.guidance,
        batchSize: state.batchSize,
        generationMode: state.generationMode,
        uploadedInputFilename: state.uploadedInputFilename,
        maskPrompt: state.maskPrompt,
        maskConfidence: state.maskConfidence,
        maskExpand: state.maskExpand,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        state.isGenerating = false;
        state.generationError = null;
        state.inputImageUrl = null;
        state.previewImageUrl = null;
        state.queue = [];
      },
    }
  )
);
