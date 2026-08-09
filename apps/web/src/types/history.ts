export type HistoryItem = {
  id: string;
  prompt: string;
  negativePrompt: string;
  modelId: string;
  modelName: string;
  loraId: string;
  loraStrength: number;
  imageUrl: string;
  imageFilename: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  guidance: number;
  createdAt: string;
};

export type HistoryResponse = {
  items: HistoryItem[];
  total: number;
};
