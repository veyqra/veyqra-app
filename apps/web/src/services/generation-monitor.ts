import { getGeneration } from "@/services/generation-api";
import type { GenerationJob } from "@/types/generate";

export async function pollGeneration(
  jobId: string,
  onUpdate: (job: GenerationJob) => void,
  timeoutMessage: string,
): Promise<GenerationJob> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15 * 60_000) {
    const job = await getGeneration(jobId);
    onUpdate(job);
    if (["completed", "failed", "cancelled"].includes(job.status)) return job;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1_000));
  }
  throw new Error(timeoutMessage);
}
