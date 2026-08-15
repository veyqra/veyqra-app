"use client";
import {  Brush,  ImageIcon,  Sparkles,} from "lucide-react";
import { useGenerateStore } from "@/stores/generate-store";

type GenerationMode =  | "text_to_image"  | "image_to_image"  | "inpaint";
const modes: {  id: GenerationMode;  label: string;  description: string;  icon: typeof Sparkles;}[] = [  {    id: "text_to_image",    label: "Text to Image",    description: "Generate an image from a prompt.",    icon: Sparkles,  },  {    id: "image_to_image",    label: "Image to Image",    description: "Transform an existing image.",    icon: ImageIcon,  },  {    id: "inpaint",    label: "Inpaint",    description: "Replace selected areas of an image.",    icon: Brush,  },];

export function GenerationModePanel() {
  const generationMode = useGenerateStore(
    (state) => state.generationMode
  );
  const setGenerationMode = useGenerateStore(
    (state) => state.setGenerationMode
  );
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-zinc-300">
        Generation mode
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const active = generationMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() =>
                setGenerationMode(mode.id)
              }
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-violet-500 bg-violet-500/10 text-white"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  active
                    ? "text-violet-400"
                    : "text-zinc-500"
                }`}
              />
              <p className="mt-2 text-xs font-medium">
                {mode.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
