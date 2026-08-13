import type { GenerationJob } from "@/types/generate";

export type DashboardData = {
  system: {
    comfyuiOnline: boolean;
    gpuOnline: boolean;
  };

  stats: {
    diffusionModels: number;
    loras: number;
    totalModels: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
  };

  recentJobs: GenerationJob[];
};
