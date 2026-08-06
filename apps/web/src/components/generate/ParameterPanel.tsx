"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";

import {
  generateLoras,
  generateModels,
  resolutionPresets,
} from "@/lib/generate-demo-data";
import { useGenerateStore } from "@/stores/generate-store";

const inputClassName =
  "mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10";

export function ParameterPanel() {
  const modelId = useGenerateStore((state) => state.modelId);
  const loraId = useGenerateStore((state) => state.loraId);
  const loraStrength = useGenerateStore(
    (state) => state.loraStrength
  );
  const resolutionId = useGenerateStore(
    (state) => state.resolutionId
  );
  const seed = useGenerateStore((state) => state.seed);
  const steps = useGenerateStore((state) => state.steps);
  const guidance = useGenerateStore((state) => state.guidance);
  const batchSize = useGenerateStore((state) => state.batchSize);

  const setModelId = useGenerateStore((state) => state.setModelId);
  const setLoraId = useGenerateStore((state) => state.setLoraId);
  const setLoraStrength = useGenerateStore(
    (state) => state.setLoraStrength
  );
  const setResolutionId = useGenerateStore(
    (state) => state.setResolutionId
  );
  const setSeed = useGenerateStore((state) => state.setSeed);
  const setSteps = useGenerateStore((state) => state.setSteps);
  const setGuidance = useGenerateStore(
    (state) => state.setGuidance
  );
  const setBatchSize = useGenerateStore(
    (state) => state.setBatchSize
  );
  const resetSettings = useGenerateStore(
    (state) => state.resetSettings
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-violet-400" />

          <h3 className="font-semibold">Parameters</h3>
        </div>

        <button
          type="button"
          onClick={resetSettings}
          className="flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <label className="block text-sm font-medium text-zinc-300">
        Model

        <select
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
          className={inputClassName}
        >
          {generateModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-zinc-300">
        LoRA

        <select
          value={loraId}
          onChange={(event) => setLoraId(event.target.value)}
          className={inputClassName}
        >
          {generateLoras.map((lora) => (
            <option key={lora.id} value={lora.id}>
              {lora.name}
            </option>
          ))}
        </select>
      </label>

      {loraId !== "none" && (
        <label className="block text-sm font-medium text-zinc-300">
          <span className="flex justify-between">
            <span>LoRA strength</span>
            <span className="text-zinc-500">
              {loraStrength.toFixed(2)}
            </span>
          </span>

          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={loraStrength}
            onChange={(event) =>
              setLoraStrength(Number(event.target.value))
            }
            className="mt-3 w-full accent-violet-600"
          />
        </label>
      )}

      <label className="block text-sm font-medium text-zinc-300">
        Resolution

        <select
          value={resolutionId}
          onChange={(event) =>
            setResolutionId(event.target.value)
          }
          className={inputClassName}
        >
          {resolutionPresets.map((resolution) => (
            <option key={resolution.id} value={resolution.id}>
              {resolution.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Steps"
          value={steps}
          min={1}
          max={100}
          onChange={setSteps}
        />

        <NumberField
          label="Guidance"
          value={guidance}
          min={0}
          max={30}
          step={0.1}
          onChange={setGuidance}
        />

        <label className="block text-sm font-medium text-zinc-300">
          Seed

          <input
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            inputMode="numeric"
            className={inputClassName}
          />
        </label>

        <NumberField
          label="Batch size"
          value={batchSize}
          min={1}
          max={8}
          onChange={setBatchSize}
        />
      </div>
    </section>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="block text-sm font-medium text-zinc-300">
      {label}

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClassName}
      />
    </label>
  );
}
