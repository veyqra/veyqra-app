import type {
  GenerateLora,
  GenerateModel,
  ResolutionPreset,
} from "@/types/generate";

export const generateModels: GenerateModel[] = [
  {
    id: "flux-dev",
    name: "FLUX.1 Dev",
    family: "flux",
    filename: "flux1-dev.safetensors",
  },
  {
    id: "juggernaut-xl",
    name: "Juggernaut XL",
    family: "sdxl",
    filename: "juggernautXL_v9.safetensors",
  },
];

export const generateLoras: GenerateLora[] = [
  {
    id: "none",
    name: "No LoRA",
  },
  {
    id: "example",
    name: "Example",
    triggerWord: "example",
  },
];

export const resolutionPresets: ResolutionPreset[] = [
  {
    id: "portrait",
    label: "Portrait · 768 × 1152",
    width: 768,
    height: 1152,
  },
  {
    id: "square",
    label: "Square · 1024 × 1024",
    width: 1024,
    height: 1024,
  },
  {
    id: "landscape",
    label: "Landscape · 1152 × 768",
    width: 1152,
    height: 768,
  },
];
