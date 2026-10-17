export type TrainingStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type TrainingDataset = {
  id: string;
  name: string;
  imageCount: number;
  createdAt: string;
};

export type TrainingDatasetImage = {
  filename: string;
  imageUrl: string;
};

export type TrainingJob = {
  id: string;
  name: string;
  datasetId: string;
  baseModel: string;
  status: TrainingStatus;
  progress: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  outputFilename: string | null;
  logs: string[];
};

export type CreateTrainingRequest = {
  name: string;
  datasetId: string;
  baseModel: string;
  networkRank: number;
  learningRate: number;
  maxTrainSteps: number;
  batchSize: number;
};
