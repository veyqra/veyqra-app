import type { GenerationJob } from "@/types/generate";

export type DashboardGpu = {
  name: string | null;
  type: string | null;
  vramTotal: number | null;
  vramFree: number | null;
  torchVramTotal: number | null;
  torchVramFree: number | null;
};

export type DashboardSystem = {
  comfyuiOnline: boolean;
  gpuOnline: boolean;
  gpu: DashboardGpu | null;
  queueRunning: number;
  queuePending: number;
};

export type DashboardData = {
  system: DashboardSystem;

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
