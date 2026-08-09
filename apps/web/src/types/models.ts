export type ModelKind = "diffusion" | "lora";

export type ModelFamily =
  | "flux"
  | "sdxl"
  | "sd15"
  | "unknown";

export type ModelCapability =
  | "text_to_image"
  | "image_to_image"
  | "inpaint";

export type ModelItem = {
  id: string;
  name: string;
  filename: string;
  kind: ModelKind;
  family: ModelFamily;

  capabilities: ModelCapability[];

  selectableForGenerate: boolean;
};

export type ModelCatalog = {
  diffusionModels: ModelItem[];
  loras: ModelItem[];
};
