import { apiRequest } from "@/lib/api-client";
import type { DashboardData } from "@/types/dashboard";
import type {
  GeneratedImage,
  GenerationJob,
} from "@/types/generate";

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
  status: GenerationJob["status"];
  progress: number;
  created_at: string;
  error: string | null;
  mask_prompt: string | null;
  mask_preview_url: string | null;
  image: ApiGeneratedImage | null;
};

type ApiDashboardResponse = {
  system: {
    comfyui_online: boolean;
    gpu_online: boolean;
    gpu: {
      name: string | null;
      type: string | null;
      vram_total: number | null;
      vram_free: number | null;
      torch_vram_total: number | null;
      torch_vram_free: number | null;
    } | null;
    queue_running: number;
    queue_pending: number;
  };

  stats: {
    diffusion_models: number;
    loras: number;
    total_models: number;
    active_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
  };

  recent_jobs: ApiGenerationJob[];
};

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

function toGenerationJob(
  job: ApiGenerationJob
): GenerationJob {
  return {
    id: job.id,
    prompt: job.prompt,
    modelName: job.model_name,
    status: job.status,
    progress: job.progress,
    createdAt: job.created_at,
    error: job.error,
    maskPrompt: job.mask_prompt ?? null,
    maskPreviewUrl: job.mask_preview_url ?? null,
    image: job.image
      ? toGeneratedImage(job.image)
      : null,
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const response =
    await apiRequest<ApiDashboardResponse>(
      "/dashboard"
    );

  return {
    system: {
      comfyuiOnline:
        response.system.comfyui_online,
      gpuOnline:
        response.system.gpu_online,
      gpu: response.system.gpu
        ? {
            name: response.system.gpu.name,
            type: response.system.gpu.type,
            vramTotal:
              response.system.gpu.vram_total,
            vramFree:
              response.system.gpu.vram_free,
            torchVramTotal:
              response.system.gpu.torch_vram_total,
            torchVramFree:
              response.system.gpu.torch_vram_free,
          }
        : null,
      queueRunning:
        response.system.queue_running,
      queuePending:
        response.system.queue_pending,
    },

    stats: {
      diffusionModels:
        response.stats.diffusion_models,
      loras:
        response.stats.loras,
      totalModels:
        response.stats.total_models,
      activeJobs:
        response.stats.active_jobs,
      completedJobs:
        response.stats.completed_jobs,
      failedJobs:
        response.stats.failed_jobs,
    },

    recentJobs:
      response.recent_jobs.map(
        toGenerationJob
      ),
  };
}
