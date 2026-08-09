export type ModelKind = "diffusion" | "lora";

export type ModelFamily =
  | "flux"
  | "sdxl"
  | "sd15"
  | "unknown";

export type ModelItem = {
  id: string;
  name: string;
  filename: string;
  kind: ModelKind;
  family: ModelFamily;
};

export type ModelCatalog = {
  diffusionModels: ModelItem[];
  loras: ModelItem[];
};
