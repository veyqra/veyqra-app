import { apiRequest } from "@/lib/api-client";
import type { CreateTrainingRequest, TrainingDataset, TrainingDatasetImage, TrainingJob } from "@/types/training";

type ApiDataset = { id: string; name: string; image_count: number; created_at: string };
type ApiDatasetImage = { filename: string; image_url: string };
type ApiJob = { id: string; name: string; dataset_id: string; base_model: string; status: TrainingJob["status"]; progress: number; created_at: string; started_at: string | null; completed_at: string | null; error: string | null; output_filename: string | null; logs: string[] };

const mapDataset = (item: ApiDataset): TrainingDataset => ({ id: item.id, name: item.name, imageCount: item.image_count, createdAt: item.created_at });
const mapJob = (item: ApiJob): TrainingJob => ({ id: item.id, name: item.name, datasetId: item.dataset_id, baseModel: item.base_model, status: item.status, progress: item.progress, createdAt: item.created_at, startedAt: item.started_at, completedAt: item.completed_at, error: item.error, outputFilename: item.output_filename, logs: item.logs });

export async function listTrainingDatasets() { return (await apiRequest<ApiDataset[]>("/training/datasets")).map(mapDataset); }
export async function listTrainingDatasetImages(datasetId: string): Promise<TrainingDatasetImage[]> {
  const images = await apiRequest<ApiDatasetImage[]>(`/training/datasets/${datasetId}/images`);
  return images.map((image) => ({ filename: image.filename, imageUrl: image.image_url }));
}
export async function createTrainingDataset(name: string, files: File[]) {
  const body = new FormData();
  body.append("name", name);
  files.forEach((file) => body.append("files", file));
  return mapDataset(await apiRequest<ApiDataset>("/training/datasets", { method: "POST", body }));
}
export async function listTrainingJobs() { return (await apiRequest<ApiJob[]>("/training/jobs")).map(mapJob); }
export async function createTrainingJob(request: CreateTrainingRequest) {
  const response = await apiRequest<{ job: ApiJob }>("/training/jobs", { method: "POST", body: { name: request.name, dataset_id: request.datasetId, base_model: request.baseModel, network_rank: request.networkRank, learning_rate: request.learningRate, max_train_steps: request.maxTrainSteps, batch_size: request.batchSize } });
  return mapJob(response.job);
}
export async function cancelTrainingJob(id: string) { return mapJob(await apiRequest<ApiJob>(`/training/jobs/${id}`, { method: "DELETE" })); }
