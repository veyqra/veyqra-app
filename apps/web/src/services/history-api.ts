import { apiRequest } from "@/lib/api-client";
import { toSameOriginApiUrl } from "@/lib/api-resource-url";
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
  image_filename: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  guidance: number;
  created_at: string;
  favorite: boolean;
  project: string;
  tags: string[];
  source_image_id: string | null;
  upscale_model: string | null;
  upscale_factor: number | null;
  sampler: HistoryItem["sampler"];
  scheduler: HistoryItem["scheduler"];
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
    imageUrl: toSameOriginApiUrl(item.image_url),
    imageFilename: item.image_filename,
    width: item.width,
    height: item.height,
    seed: item.seed,
    steps: item.steps,
    guidance: item.guidance,
    createdAt: item.created_at,
    favorite: item.favorite ?? false,
    project: item.project ?? "",
    tags: item.tags ?? [],
    sourceImageId: item.source_image_id ?? null,
    upscaleModel: item.upscale_model ?? null,
    upscaleFactor: item.upscale_factor ?? null,
    sampler: item.sampler ?? "dpmpp_2m",
    scheduler: item.scheduler ?? "karras",
  };
}

export async function getHistory(
  limit = 100,
  offset = 0
): Promise<HistoryResponse> {
  const response =
    await apiRequest<ApiHistoryResponse>(
      `/history?limit=${limit}&offset=${offset}`
    );

  return {
    items: response.items.map(mapHistoryItem),
    total: response.total,
  };
}

export async function getAllHistory(): Promise<HistoryResponse> {
  const items: HistoryItem[] = [];
  let total = 0;
  do {
    const page = await getHistory(500, items.length);
    total = page.total;
    items.push(...page.items);
    if (!page.items.length) break;
  } while (items.length < total);
  return { items: [...new Map(items.map((item) => [item.id, item])).values()], total };
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

export async function updateHistoryItem(id: string, favorite: boolean, project: string, tags?: string[]): Promise<HistoryItem> {
  return mapHistoryItem(await apiRequest<ApiHistoryItem>(`/history/${encodeURIComponent(id)}`, {
    method: "PATCH", body: { favorite, project, tags },
  }));
}

export type HistoryBatchChanges = {
  favorite?: boolean;
  project?: string;
  add_tags?: string[];
  remove_tags?: string[];
};

export async function updateHistorySelection(ids: string[], changes: HistoryBatchChanges): Promise<HistoryItem[]> {
  const results = await apiRequest<ApiHistoryItem[]>("/history", { method: "PATCH", body: { ids, ...changes } });
  return results.map(mapHistoryItem);
}

export async function getUpscaleModels(): Promise<string[]> {
  return apiRequest("/history/upscale-models");
}

export async function upscaleHistoryItem(id: string, model: string, factor: number): Promise<string> {
  const response = await apiRequest<{ job: { id: string } }>(`/history/${encodeURIComponent(id)}/upscale`, {
    method: "POST", body: { model, factor },
  });
  return response.job.id;
}
