export type ModelFamily = "flux" | "sdxl";

export type GenerateModel = {
  id: string;
  name: string;
  family: ModelFamily;
  filename: string;
};

export type GenerateLora = {
  id: string;
  name: string;
  filename?: string;
  triggerWord?: string;
};

export type ResolutionPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export type GenerationStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type GenerationJob = {
  id: string;
  prompt: string;
  modelName: string;
  status:
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  progress: number;
  createdAt: string;
  error?: string | null;
  image?: GeneratedImage | null;
};

export type GeneratedImage = {
  id: string;
  prompt: string;
  imageUrl: string;
  modelName: string;
  width: number;
  height: number;
  createdAt: string;
};

export type GenerateRequest = {
  prompt: string;
  negativePrompt: string;
  modelId: string;
  loraId: string;
  loraStrength: number;
  resolutionId: string;
  seed: number;
  steps: number;
  guidance: number;
  batchSize: number;
};
