"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Dice5,
  LoaderCircle,
  Lock,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Unlock,
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
  const seedLocked = useGenerateStore((state) => state.seedLocked);

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
  const setSeedLocked = useGenerateStore(
  (state) => state.setSeedLocked
  );

  const randomizeSeed = useGenerateStore(
  (state) => state.randomizeSeed
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

      const selectableModels =
          data.diffusionModels.filter(
            (model) => model.selectableForGenerate
          );

        if (
          selectableModels.length > 0 &&
          !selectableModels.some(
            (model) => model.filename === modelId
          )
        ) {
          setModelId(selectableModels[0].filename);
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
  let cancelled = false;

  async function initializeCatalog() {
    try {
      const data = await getModelCatalog();

      if (cancelled) {
        return;
      }

      setCatalog(data);

      const selectableModels =
        data.diffusionModels.filter(
          (model) => model.selectableForGenerate
        );

      if (
        selectableModels.length > 0 &&
        !selectableModels.some(
          (model) => model.filename === modelId
        )
      ) {
        setModelId(selectableModels[0].filename);
      }
    } catch (loadError) {
      if (cancelled) {
        return;
      }

      console.error(
        "Unable to load ComfyUI model catalog:",
        loadError
      );

      setError(
        "Unable to load models from ComfyUI."
      );
    } finally {
      if (!cancelled) {
        setIsLoading(false);
      }
    }
  }

  void initializeCatalog();

  return () => {
    cancelled = true;
  };
}, [modelId, setModelId]);

  const selectedModel = useMemo(
    () =>
      catalog.diffusionModels.find(
        (model) => model.filename === modelId
      ),
    [catalog.diffusionModels, modelId]
  );
  const selectedLora = useMemo(
    () =>
      catalog.loras.find((lora) => lora.filename === loraId),
    [catalog.loras, loraId]
  );
  
  const generateModels = useMemo(
      () =>
        catalog.diffusionModels.filter(
          (model) => model.selectableForGenerate
        ),
      [catalog.diffusionModels]
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
            generateModels.length === 0
          }
          className={inputClassName}
        >
          {isLoading && (
            <option value="">
              Loading models...
            </option>
          )}

          {!isLoading &&
            generateModels.length === 0 && (
              <option value="">
                No models found
              </option>
            )}

          {generateModels.map((model) => (
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
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Selected model</p>

              <p
                className="mt-1 truncate font-mono text-xs text-zinc-300"
                title={selectedModel.filename}
              >
                {selectedModel.filename}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
              {familyName(selectedModel.family)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedModel.capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400"
              >
                {capabilityName(capability)}
              </span>
            ))}
          </div>
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
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-300">LoRA strength</p>
              <p className="mt-1 text-xs text-zinc-600">Controls how strongly the LoRA influences the model.</p>
            </div>
            <span className="rounded-lg bg-zinc-900 px-2.5 py-1 font-mono text-xs text-violet-300">
              {loraStrength.toFixed(2)}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={loraStrength}
            onChange={(event) => setLoraStrength(Number(event.target.value))}
            className="mt-4 w-full accent-violet-600"
          />

          <div className="mt-1 flex justify-between text-[10px] text-zinc-700">
            <span>0</span>
            <span>1</span>
            <span>2</span>
          </div>
        </div>
      )}

      {selectedLora && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 mt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Active LoRA</p>
              <p className="mt-1 truncate font-mono text-xs text-zinc-300" title={selectedLora.filename}>
                {selectedLora.filename}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300">
              {familyName(selectedLora.family)}
            </span>
          </div>
        </div>
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

        <div className="block text-sm font-medium text-zinc-300">
          <div className="flex items-center justify-between">
            <span>Seed</span>

             <span className="text-xs font-normal text-zinc-500">
              {seed === "-1"
               ? "Random"
               : seedLocked
               ? "Locked"
               : "Fixed"}
             </span>
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={seed}
                onChange={(event) =>
                  setSeed(event.target.value)
                 }
                 disabled={seedLocked}
                 inputMode="numeric"
                 className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <button
              type="button"
              onClick={randomizeSeed}
              disabled={seedLocked}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-400 transition hover:border-violet-500 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
              title="Generate random seed"
            >
              <Dice5 className="h-4 w-4" />
            </button>

    <button
      type="button"
      onClick={() =>
        setSeedLocked(!seedLocked)
      }
      className={`rounded-xl border px-3 transition ${
        seedLocked
          ? "border-violet-500 bg-violet-500/10 text-violet-300"
          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-violet-500 hover:text-violet-300"
      }`}
      title={
        seedLocked
          ? "Unlock seed"
          : "Lock seed"
      }
    >
      {seedLocked ? (
        <Lock className="h-4 w-4" />
      ) : (
        <Unlock className="h-4 w-4" />
      )}
    </button>
  </div>

  <div className="mt-2 flex items-center justify-between text-xs font-normal text-zinc-600">
    <button
      type="button"
      onClick={() => setSeed("-1")}
      disabled={seedLocked}
      className="transition hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Use random seed
    </button>

    {seed !== "-1" && (
      <span
        className="max-w-[150px] truncate font-mono"
        title={seed}
      >
        {seed}
      </span>
    )}
  </div>
</div> 

        <NumberField
          label="Batch size"
          value={batchSize}
          min={1}
          max={8}
          onChange={setBatchSize}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-600">Generation summary</p>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <SummaryItem label="Model" value={selectedModel?.name ?? "None"} />
          <SummaryItem label="LoRA" value={selectedLora?.name ?? "None"} />
          <SummaryItem
            label="Resolution"
            value={
              resolutionPresets.find((item) => item.id === resolutionId)?.label ?? resolutionId
            }
          />
          <SummaryItem label="Seed" value={seed === "-1" ? "Random" : seed} />
        </div>
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

function capabilityName(
  capability: ModelItem["capabilities"][number]
): string {
  switch (capability) {
    case "text_to_image":
      return "Text → Image";
    case "image_to_image":
      return "Image → Image";
    case "inpaint":
      return "Inpaint";
    default:
      return capability;
  }
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-zinc-600">{label}</p>
      <p className="mt-1 truncate text-zinc-300" title={value}>
        {value}
      </p>
    </div>
  );
}
