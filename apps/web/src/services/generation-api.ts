import { apiRequest } from "@/lib/api-client";
import type {
  GeneratedImage,
  GenerationJob,
  GenerationStatus,
  GenerateRequest,
} from "@/types/generate";

type ApiGenerateRequest = {
  prompt: string;
  negative_prompt: string;
  mode?: string;
  input_image?: string | null;
  model_id: string;
  lora_id: string;
  lora_strength: number;
  resolution_id: string;
  seed: number;
  denoise_strength: number;
  mask_prompt?: string;
  mask_confidence?: number;
  mask_expand?: number;
  steps: number;
  guidance: number;
  sampler: GenerateRequest["sampler"];
  scheduler: GenerateRequest["scheduler"];
  batch_size: number;
};

type ApiGeneratedImage = {
  id: string;
  prompt: string;
  image_url: string;
  mask_preview_url: string | null;
  model_name: string;
  width: number;
  height: number;
  created_at: string;
};

type ApiGenerationJob = {
  id: string;
  prompt: string;
  model_name: string;
  status: GenerationStatus;
  progress: number;
  created_at: string;
  error: string | null;
  mask_prompt: string | null;
  mask_preview_url: string | null;
  image: ApiGeneratedImage | null;
};

type ApiGenerationCreatedResponse = {
  job: ApiGenerationJob;
};

function toApiRequest(request: GenerateRequest): ApiGenerateRequest {
  return {
    prompt: request.prompt,
    negative_prompt: request.negativePrompt,
    mode: request.mode,
    input_image: request.inputImage,
    mask_prompt: request.maskPrompt,
    mask_confidence: request.maskConfidence,
    mask_expand: request.maskExpand,
    model_id: request.modelId,
    lora_id: request.loraId,
    lora_strength: request.loraStrength,
    resolution_id: request.resolutionId,
    seed: request.seed,
    denoise_strength: request.denoiseStrength,
    steps: request.steps,
    guidance: request.guidance,
    sampler: request.sampler,
    scheduler: request.scheduler,
    batch_size: request.batchSize,
  };
}

function toGeneratedImage(
  image: ApiGeneratedImage
): GeneratedImage {
  return {
    id: image.id,
    prompt: image.prompt,
    imageUrl: image.image_url,
    maskPreviewUrl: image.mask_preview_url ?? null,
    modelName: image.model_name,
    width: image.width,
    height: image.height,
    createdAt: image.created_at,
  };
}

function toGenerationJob(job: ApiGenerationJob): GenerationJob {
  return {
    id: job.id,
    prompt: job.prompt,
    modelName: job.model_name,
    status: job.status,
    progress: job.progress,
    createdAt: job.created_at,
    error: job.error ?? undefined,
    maskPrompt: job.mask_prompt ?? null,
    maskPreviewUrl: job.mask_preview_url ?? null,
    image: job.image ? toGeneratedImage(job.image) : undefined,
  };
}

export async function createGeneration(
  request: GenerateRequest
): Promise<GenerationJob> {
  const response =
    await apiRequest<ApiGenerationCreatedResponse>("/generations", {
      method: "POST",
      body: toApiRequest(request),
    });

  return toGenerationJob(response.job);
}

export async function getGeneration(
  jobId: string
): Promise<GenerationJob> {
  const response = await apiRequest<ApiGenerationJob>(
    `/generations/${jobId}`
  );

  return toGenerationJob(response);
}

export async function cancelGeneration(
  jobId: string
): Promise<GenerationJob> {
  const response = await apiRequest<ApiGenerationJob>(
    `/generations/${jobId}`,
    {
      method: "DELETE",
    }
  );

  return toGenerationJob(response);
}

export async function listGenerations(): Promise<GenerationJob[]> {
  const response = await apiRequest<ApiGenerationJob[]>(
    "/generations"
  );

  return response.map(toGenerationJob);
}
