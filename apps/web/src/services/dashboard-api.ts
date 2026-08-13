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
  image: ApiGeneratedImage | null;
};

type ApiDashboardResponse = {
  system: {
    comfyui_online: boolean;
    gpu_online: boolean;
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
