import { apiRequest } from "@/lib/api-client";
import type {
  ModelCatalog,
  ModelFamily,
  ModelItem,
  ModelKind,
} from "@/types/models";

type LoraListResponse = {
  loras: string[];
};

type ModelListResponse = {
  models: string[];
};

type ApiModelItem = {
  id: string;
  name: string;
  filename: string;
  kind: ModelKind;
  family: ModelFamily;
};

type ApiModelCatalog = {
  diffusion_models: ApiModelItem[];
  loras: ApiModelItem[];
};

function mapModel(item: ApiModelItem): ModelItem {
  return {
    id: item.id,
    name: item.name,
    filename: item.filename,
    kind: item.kind,
    family: item.family,
  };
}

export async function getModelCatalog(): Promise<ModelCatalog> {
  const response =
    await apiRequest<ApiModelCatalog>("/models/catalog");

  return {
    diffusionModels: response.diffusion_models.map(mapModel),
    loras: response.loras.map(mapModel),
  };
}

export async function getAvailableLoras(): Promise<string[]> {
  const response =
    await apiRequest<LoraListResponse>("/models/loras");

  return response.loras;
}

export async function getAvailableModels(): Promise<string[]> {
  const response =
    await apiRequest<ModelListResponse>("/models/unets");

  return response.models;
}
