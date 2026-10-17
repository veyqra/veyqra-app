import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useGenerateStore } from "@/stores/generate-store";

const settingKeys = [
  "prompt", "negativePrompt", "modelId", "modelFamily", "loraId", "loraStrength",
  "resolutionId", "seed", "seedLocked", "steps", "guidance", "sampler", "scheduler",
  "batchSize", "denoiseStrength", "generationMode", "maskPrompt", "maskConfidence", "maskExpand",
] as const;
type Settings = Pick<ReturnType<typeof useGenerateStore.getState>, typeof settingKeys[number]>;
export type GenerationTemplate = { id: string; name: string; settings: Settings };

export function captureSettings(): Settings {
  const state = useGenerateStore.getState();
  return Object.fromEntries(settingKeys.map((key) => [key, state[key]])) as Settings;
}

export function loadTemplate(template: GenerationTemplate) {
  useGenerateStore.setState({ ...template.settings, generationError: null });
}

export const useTemplateStore = create<{
  templates: GenerationTemplate[];
  save: (name: string, settings: Settings) => void;
  remove: (id: string) => void;
}>()(persist((set) => ({
  templates: [],
  save: (name, settings) => set((state) => ({
    templates: [{ id: crypto.randomUUID(), name: name.trim(), settings }, ...state.templates],
  })),
  remove: (id) => set((state) => ({ templates: state.templates.filter((item) => item.id !== id) })),
}), { name: "veyqra-generation-templates", storage: createJSONStorage(() => localStorage) }));
