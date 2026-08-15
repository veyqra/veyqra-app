import type { ResolutionPreset } from "@/types/generate";

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

export const sdxlResolutionPresets: ResolutionPreset[] = [
  {
    id: "1024x1024",
    label: "1024 × 1024",
    width: 1024,
    height: 1024,
  },
  {
    id: "832x1216",
    label: "832 × 1216",
    width: 832,
    height: 1216,
  },
  {
    id: "1216x832",
    label: "1216 × 832",
    width: 1216,
    height: 832,
  },
  {
    id: "896x1152",
    label: "896 × 1152",
    width: 896,
    height: 1152,
  },
  {
    id: "1152x896",
    label: "1152 × 896",
    width: 1152,
    height: 896,
  },
];
