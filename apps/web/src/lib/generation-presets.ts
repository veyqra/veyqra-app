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
