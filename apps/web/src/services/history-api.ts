import { apiRequest } from "@/lib/api-client";
import type {
  HistoryItem,
  HistoryResponse,
} from "@/types/history";

type ApiHistoryItem = {
  id: string;
  prompt: string;
  negative_prompt: string;
  model_id: string;
  model_name: string;
  lora_id: string;
  lora_strength: number;
  image_url: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  guidance: number;
  created_at: string;
};

type ApiHistoryResponse = {
  items: ApiHistoryItem[];
  total: number;
};

function mapHistoryItem(
  item: ApiHistoryItem
): HistoryItem {
  return {
    id: item.id,
    prompt: item.prompt,
    negativePrompt: item.negative_prompt,
    modelId: item.model_id,
    modelName: item.model_name,
    loraId: item.lora_id,
    loraStrength: item.lora_strength,
    imageUrl: item.image_url,
    width: item.width,
    height: item.height,
    seed: item.seed,
    steps: item.steps,
    guidance: item.guidance,
    createdAt: item.created_at,
  };
}

export async function getHistory(
  limit = 100
): Promise<HistoryResponse> {
  const response =
    await apiRequest<ApiHistoryResponse>(
      `/history?limit=${limit}`
    );

  return {
    items: response.items.map(mapHistoryItem),
    total: response.total,
  };
}

export async function deleteHistoryItem(
  id: string
): Promise<void> {
  await apiRequest(
    `/history/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

export async function clearHistory(): Promise<void> {
  await apiRequest(
    "/history",
    {
      method: "DELETE",
    }
  );
}
