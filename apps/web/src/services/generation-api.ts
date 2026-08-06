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
  model_id: string;
  lora_id: string;
  lora_strength: number;
  resolution_id: string;
  seed: number;
  steps: number;
  guidance: number;
  batch_size: number;
};

type ApiGeneratedImage = {
  id: string;
  prompt: string;
  image_url: string;
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
  image: ApiGeneratedImage | null;
};

type ApiGenerationCreatedResponse = {
  job: ApiGenerationJob;
};

function toApiRequest(request: GenerateRequest): ApiGenerateRequest {
  return {
    prompt: request.prompt,
    negative_prompt: request.negativePrompt,
    model_id: request.modelId,
    lora_id: request.loraId,
    lora_strength: request.loraStrength,
    resolution_id: request.resolutionId,
    seed: request.seed,
    steps: request.steps,
    guidance: request.guidance,
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
