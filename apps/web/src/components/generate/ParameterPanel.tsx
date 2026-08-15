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

import {
  resolutionPresets,
  sdxlResolutionPresets,
} from "@/lib/generation-presets";
import { getModelCatalog } from "@/services/models-api";
import { useGenerateStore } from "@/stores/generate-store";
import type {
  SamplerName,
  SchedulerName,
} from "@/types/generate";
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
  const sampler = useGenerateStore((state) => state.sampler);
  const scheduler = useGenerateStore((state) => state.scheduler);
  const batchSize = useGenerateStore((state) => state.batchSize);
  const seedLocked = useGenerateStore((state) => state.seedLocked);
  const generationMode = useGenerateStore((state) => state.generationMode);
  const preservesInputResolution =
    generationMode !== "text_to_image";
  const denoiseStrength = useGenerateStore((state) => state.denoiseStrength);
  const setDenoiseStrength = useGenerateStore((state) => state.setDenoiseStrength);
  const maskExpand = useGenerateStore((state) => state.maskExpand);
  const setMaskExpand = useGenerateStore((state) => state.setMaskExpand);

  const setModelId = useGenerateStore(
    (state) => state.setModelId
  );
  const setModelFamily = useGenerateStore(
    (state) => state.setModelFamily
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
  const setSampler = useGenerateStore(
    (state) => state.setSampler
  );
  const setScheduler = useGenerateStore(
    (state) => state.setScheduler
  );
  const setBatchSize = useGenerateStore(
    (state) => state.setBatchSize
  );
  const resetSettings = useGenerateStore(
    (state) => state.resetSettings
  );

  const applyFamilyDefaults = useCallback(
    (family: ModelItem["family"]) => {
      if (family === "sdxl") {
        setSteps(30);
        setGuidance(6.0);
        setSampler("dpmpp_2m");
        setScheduler("karras");
        setResolutionId("1024x1024");
      } else if (family === "flux") {
        setSteps(28);
        setGuidance(3.5);
        setResolutionId(resolutionPresets[0]?.id ?? "square");
      }
    },
    [
      setGuidance,
      setResolutionId,
      setSampler,
      setScheduler,
      setSteps,
    ]
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

      const selectableModels = getSelectableModels(
        data.diffusionModels,
        generationMode
      );

      if (
        selectableModels.length > 0 &&
        !selectableModels.some(
          (model) => model.filename === modelId
        )
      ) {
        const fallbackModel = selectableModels[0];
        setModelId(fallbackModel.filename);
        applyFamilyDefaults(fallbackModel.family);
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
  }, [
    applyFamilyDefaults,
    modelId,
    generationMode,
    setModelId,
  ]);

useEffect(() => {
  let cancelled = false;

  async function initializeCatalog() {
    try {
      const data = await getModelCatalog();

      if (cancelled) {
        return;
      }

      setCatalog(data);

      const selectableModels = getSelectableModels(
        data.diffusionModels,
        generationMode
      );

      if (
        selectableModels.length > 0 &&
        !selectableModels.some(
          (model) => model.filename === modelId
        )
      ) {
        const fallbackModel = selectableModels[0];
        setModelId(fallbackModel.filename);
        applyFamilyDefaults(fallbackModel.family);
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
}, [applyFamilyDefaults, modelId, generationMode, setModelId]);

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
  const isSdxl = selectedModel?.family === "sdxl";
  const availableResolutionPresets = isSdxl
    ? sdxlResolutionPresets
    : resolutionPresets;

  useEffect(() => {
    setModelFamily(selectedModel?.family ?? null);
  }, [selectedModel?.family, setModelFamily]);

  useEffect(() => {
    if (
      preservesInputResolution ||
      !selectedModel ||
      availableResolutionPresets.some(
        (preset) => preset.id === resolutionId
      )
    ) {
      return;
    }

    setResolutionId(
      isSdxl
        ? "1024x1024"
        : resolutionPresets[0]?.id ?? "square"
    );
  }, [
    availableResolutionPresets,
    isSdxl,
    preservesInputResolution,
    resolutionId,
    selectedModel,
    setResolutionId,
  ]);
  
  const generateModels = useMemo(
      () =>
        getSelectableModels(
          catalog.diffusionModels,
          generationMode
        ),
      [catalog.diffusionModels, generationMode]
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
    if (
      isLoading ||
      !selectedModel ||
      loraId === "none" ||
      catalog.loras.length === 0
    ) {
      return;
    }

    const stillAvailable = compatibleLoras.some(
      (lora) => lora.filename === loraId
    );

    if (!stillAvailable) {
      setLoraId("none");
    }
  }, [
    isLoading,
    selectedModel,
    catalog.loras.length,
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
          onChange={(event) => {
            const filename = event.target.value;
            const nextModel = catalog.diffusionModels.find(
              (model) => model.filename === filename
            );

            setModelId(filename);

            if (
              nextModel &&
              nextModel.family !== selectedModel?.family
            ) {
              setLoraId("none");
              applyFamilyDefaults(nextModel.family);
            }
          }}
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
              {generationMode === "inpaint" &&
              isRecommendedInpaintModel(model)
                ? " · Recommended"
                : ""}
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
          value={
            preservesInputResolution
              ? "original"
              : resolutionId
          }
          onChange={(event) =>
            setResolutionId(event.target.value)
          }
          disabled={preservesInputResolution}
          className={inputClassName}
        >
          {preservesInputResolution ? (
            <option value="original">
              Original image size
            </option>
          ) : (
            availableResolutionPresets.map((resolution) => (
              <option
                key={resolution.id}
                value={resolution.id}
              >
                {resolution.label}
              </option>
            ))
          )}
        </select>
      </label>

      {generationMode === "image_to_image" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-300">Denoise strength</p>
              <p className="mt-1 text-xs text-zinc-600">
                Lower values preserve more of the input image.
              </p>
            </div>

            <span className="rounded-lg bg-zinc-900 px-2.5 py-1 font-mono text-xs text-violet-300">
              {denoiseStrength.toFixed(2)}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={denoiseStrength}
            onChange={(event) => setDenoiseStrength(Number(event.target.value))}
            className="mt-4 w-full accent-violet-600"
          />

          <div className="mt-1 flex justify-between text-[10px] text-zinc-700">
            <span>Preserve</span>
            <span>Transform</span>
          </div>
        </div>
      )}

      {generationMode === "inpaint" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-300">Grow mask</p>
              <p className="mt-1 text-xs text-zinc-600">
                Expands the detected mask to blend the edited edges.
              </p>
            </div>

            <span className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1 font-mono text-xs text-violet-300">
              {maskExpand} px
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="128"
            step="1"
            value={maskExpand}
            onChange={(event) => setMaskExpand(Number(event.target.value))}
            className="mt-4 w-full accent-violet-600"
          />

          <div className="mt-1 flex justify-between text-[10px] text-zinc-700">
            <span>0 px</span>
            <span>64 px</span>
            <span>128 px</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Steps"
          value={steps}
          min={1}
          max={100}
          onChange={setSteps}
        />

        <NumberField
          label={isSdxl ? "CFG" : "Guidance"}
          value={guidance}
          min={1}
          max={isSdxl ? 12 : 10}
          step={isSdxl ? 0.5 : 0.1}
          onChange={setGuidance}
        />

        {isSdxl && (
          <>
            <label className="block text-sm font-medium text-zinc-300">
              Sampler

              <select
                value={sampler}
                onChange={(event) =>
                  setSampler(event.target.value as SamplerName)
                }
                className={inputClassName}
              >
                <option value="dpmpp_2m">DPM++ 2M</option>
                <option value="dpmpp_2m_sde">DPM++ 2M SDE</option>
                <option value="euler">Euler</option>
                <option value="euler_ancestral">Euler Ancestral</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-zinc-300">
              Scheduler

              <select
                value={scheduler}
                onChange={(event) =>
                  setScheduler(event.target.value as SchedulerName)
                }
                className={inputClassName}
              >
                <option value="karras">Karras</option>
                <option value="normal">Normal</option>
                <option value="exponential">Exponential</option>
              </select>
            </label>
          </>
        )}

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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 transition hover:border-violet-500 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
              title="Generate random seed"
            >
              <Dice5 className="h-4 w-4" />
            </button>

    <button
      type="button"
      onClick={() =>
        setSeedLocked(!seedLocked)
      }
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
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
              preservesInputResolution
                ? "Original image size"
                : availableResolutionPresets.find(
                    (item) => item.id === resolutionId
                  )?.label ?? resolutionId
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

function getSelectableModels(
  models: ModelItem[],
  generationMode: "text_to_image" | "image_to_image" | "inpaint"
): ModelItem[] {
  if (generationMode === "inpaint") {
    return models
      .filter(
        (model) =>
          model.family === "sdxl" ||
          model.family === "flux"
      )
      .sort(
        (a, b) =>
          Number(isRecommendedInpaintModel(b)) -
          Number(isRecommendedInpaintModel(a))
      );
  }

  if (generationMode === "image_to_image") {
    return models.filter(
      (model) =>
        (model.family === "flux" || model.family === "sdxl") &&
        model.selectableForGenerate
    );
  }

  return models.filter((model) => model.selectableForGenerate);
}

function isRecommendedInpaintModel(
  model: ModelItem
): boolean {
  const filename = model.filename.toLowerCase();

  return (
    filename.includes("fill") ||
    filename.includes("inpaint")
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
