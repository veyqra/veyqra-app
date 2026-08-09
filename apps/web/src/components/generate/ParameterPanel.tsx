"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import { resolutionPresets } from "@/lib/generation-presets";
import { getModelCatalog } from "@/services/models-api";
import { useGenerateStore } from "@/stores/generate-store";
import type {
  ModelCatalog,
  ModelItem,
} from "@/types/models";

const inputClassName =
  "mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50";

const emptyCatalog: ModelCatalog = {
  diffusionModels: [],
  loras: [],
};

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

  const setModelId = useGenerateStore(
    (state) => state.setModelId
  );
  const setLoraId = useGenerateStore(
    (state) => state.setLoraId
  );
  const setLoraStrength = useGenerateStore(
    (state) => state.setLoraStrength
  );
  const setResolutionId = useGenerateStore(
    (state) => state.setResolutionId
  );
  const setSeed = useGenerateStore(
    (state) => state.setSeed
  );
  const setSteps = useGenerateStore(
    (state) => state.setSteps
  );
  const setGuidance = useGenerateStore(
    (state) => state.setGuidance
  );
  const setBatchSize = useGenerateStore(
    (state) => state.setBatchSize
  );
  const resetSettings = useGenerateStore(
    (state) => state.resetSettings
  );

  const [catalog, setCatalog] =
    useState<ModelCatalog>(emptyCatalog);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getModelCatalog();

      setCatalog(data);

      if (
        data.diffusionModels.length > 0 &&
        !data.diffusionModels.some(
          (model) => model.filename === modelId
        )
      ) {
        setModelId(data.diffusionModels[0].filename);
      }
    } catch (loadError) {
      console.error(
        "Unable to load ComfyUI model catalog:",
        loadError
      );

      setError("Unable to load models from ComfyUI.");
    } finally {
      setIsLoading(false);
    }
  }, [modelId, setModelId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedModel = useMemo(
    () =>
      catalog.diffusionModels.find(
        (model) => model.filename === modelId
      ),
    [catalog.diffusionModels, modelId]
  );

  const compatibleLoras = useMemo(
    () =>
      getCompatibleLoras(
        catalog.loras,
        selectedModel
      ),
    [catalog.loras, selectedModel]
  );

  useEffect(() => {
    if (loraId === "none") {
      return;
    }

    const stillAvailable = compatibleLoras.some(
      (lora) => lora.filename === loraId
    );

    if (!stillAvailable) {
      setLoraId("none");
    }
  }, [
    compatibleLoras,
    loraId,
    setLoraId,
  ]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-violet-400" />

          <h3 className="font-semibold">
            Parameters
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadCatalog()}
            disabled={isLoading}
            className="text-zinc-500 transition hover:text-violet-400 disabled:opacity-50"
            title="Refresh models"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={resetSettings}
            className="flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/20 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <label className="block text-sm font-medium text-zinc-300">
        Model

        <select
          value={modelId}
          onChange={(event) =>
            setModelId(event.target.value)
          }
          disabled={
            isLoading ||
            catalog.diffusionModels.length === 0
          }
          className={inputClassName}
        >
          {isLoading && (
            <option value="">
              Loading models...
            </option>
          )}

          {!isLoading &&
            catalog.diffusionModels.length === 0 && (
              <option value="">
                No models found
              </option>
            )}

          {catalog.diffusionModels.map((model) => (
            <option
              key={model.filename}
              value={model.filename}
            >
              {model.name} · {familyName(model.family)}
            </option>
          ))}
        </select>
      </label>

      {selectedModel && (
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">
              Selected model
            </p>

            <p
              className="truncate font-mono text-xs text-zinc-300"
              title={selectedModel.filename}
            >
              {selectedModel.filename}
            </p>
          </div>

          <span className="ml-3 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
            {familyName(selectedModel.family)}
          </span>
        </div>
      )}

      <label className="block text-sm font-medium text-zinc-300">
        LoRA

        <select
          value={loraId}
          onChange={(event) =>
            setLoraId(event.target.value)
          }
          disabled={isLoading}
          className={inputClassName}
        >
          <option value="none">
            No LoRA
          </option>

          {compatibleLoras.map((lora) => (
            <option
              key={lora.filename}
              value={lora.filename}
            >
              {lora.name}
              {lora.family === "unknown"
                ? " · Unclassified"
                : ""}
            </option>
          ))}
        </select>
      </label>

      {selectedModel &&
        !isLoading &&
        compatibleLoras.length === 0 && (
          <p className="-mt-2 text-xs text-zinc-600">
            No compatible LoRAs found for{" "}
            {familyName(selectedModel.family)}.
          </p>
        )}

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
              setLoraStrength(
                Number(event.target.value)
              )
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
            <option
              key={resolution.id}
              value={resolution.id}
            >
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
            onChange={(event) =>
              setSeed(event.target.value)
            }
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

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          Reading model catalog from ComfyUI...
        </div>
      )}
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
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className={inputClassName}
      />
    </label>
  );
}

function getCompatibleLoras(
  loras: ModelItem[],
  model: ModelItem | undefined
): ModelItem[] {
  if (!model) {
    return [];
  }

  if (model.family === "unknown") {
    return loras;
  }

  return loras.filter(
    (lora) =>
      lora.family === model.family ||
      lora.family === "unknown"
  );
}

function familyName(
  family: ModelItem["family"]
): string {
  switch (family) {
    case "flux":
      return "FLUX";

    case "sdxl":
      return "SDXL";

    case "sd15":
      return "SD 1.5";

    default:
      return "Unknown";
  }
}
