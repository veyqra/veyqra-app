"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  BrainCircuit,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

import { getModelCatalog } from "@/services/models-api";
import type {
  ModelCatalog,
  ModelFamily,
  ModelItem,
} from "@/types/models";
import { useI18n } from "@/lib/i18n";

const emptyCatalog: ModelCatalog = {
  diffusionModels: [],
  loras: [],
};

export function ModelsWorkspace() {
  const { t } = useI18n();
  const [catalog, setCatalog] =
    useState<ModelCatalog>(emptyCatalog);

  const [search, setSearch] = useState("");
  const [family, setFamily] =
    useState<ModelFamily | "all">("all");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getModelCatalog();
      setCatalog(data);
    } catch (loadError) {
      console.error(
        "Unable to load model catalog:",
        loadError
      );

      setError(
        "Veyqra could not load the model catalog from ComfyUI."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
      let cancelled = false;

      async function initializeModels() {
        try {
          const data = await getModelCatalog();

          if (cancelled) {
            return;
          }

          setCatalog(data);
        } catch (loadError) {
          if (cancelled) {
            return;
          }

          console.error(
            "Unable to load model catalog:",
            loadError
          );

          setError(
            "Veyqra could not load the model catalog from ComfyUI."
          );
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      }

      void initializeModels();

      return () => {
        cancelled = true;
      };
    }, []);

  const filteredModels = useMemo(
    () =>
      filterItems(
        catalog.diffusionModels,
        search,
        family
      ),
    [catalog.diffusionModels, search, family]
  );

  const filteredLoras = useMemo(
    () =>
      filterItems(
        catalog.loras,
        search,
        family
      ),
    [catalog.loras, search, family]
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <Stat
          label={t("Diffusion models")}
          value={catalog.diffusionModels.length}
          icon={BrainCircuit}
        />

        <Stat
          label={t("LoRAs")}
          value={catalog.loras.length}
          icon={Sparkles}
        />

        <Stat
          label={t("Total")}
          value={
            catalog.diffusionModels.length +
            catalog.loras.length
          }
          icon={Boxes}
        />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={t("Search models and LoRAs...")}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <select
            value={family}
            onChange={(event) =>
              setFamily(
                event.target.value as ModelFamily | "all"
              )
            }
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
          >
            <option value="all">{t("All families")}</option>
            <option value="flux">FLUX</option>
            <option value="sdxl">SDXL</option>
            <option value="sd15">SD 1.5</option>
            <option value="unknown">{t("Unknown")}</option>
          </select>

          <button
            type="button"
            onClick={() => void loadModels()}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-medium transition hover:border-violet-500 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />

            {t("Refresh")}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <div className="text-center text-zinc-500">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-violet-400" />
            <p className="mt-4">
              {t("Loading ComfyUI models...")}
            </p>
          </div>
        </div>
      ) : (
        <>
          <ModelSection
            title={t("Diffusion Models")}
            description={t("Base diffusion models available to ComfyUI.")}
            items={filteredModels}
          />

          <ModelSection
            title={t("LoRAs")}
            description={t("LoRA adapters available to ComfyUI.")}
            items={filteredLoras}
          />
        </>
      )}
    </div>
  );
}

type ModelSectionProps = {
  title: string;
  description: string;
  items: ModelItem[];
};

function ModelSection({
  title,
  description,
  items,
}: ModelSectionProps) {
  const { t } = useI18n();

  return (
    <section className="space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {title}
          </h2>

          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
            {items.length}
          </span>
        </div>

        <p className="mt-1 text-sm text-zinc-500">
          {description}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900">
          <p className="text-sm text-zinc-600">
            {t("No matching models found.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <ModelCard
              key={`${item.kind}-${item.filename}`}
              item={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ModelCard({
  item,
}: {
  item: ModelItem;
}) {
  const { t } = useI18n();
  const Icon =
    item.kind === "lora"
      ? Sparkles
      : BrainCircuit;

  return (
    <article className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-violet-500/70 hover:bg-zinc-900/80">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-violet-500/10 p-3">
          <Icon className="h-6 w-6 text-violet-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate font-semibold text-white">
              {item.name}
            </h3>

            <FamilyBadge family={item.family} />
          </div>

          <p
            title={item.filename}
            className="mt-2 truncate font-mono text-xs text-zinc-500"
          >
            {item.filename}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs capitalize text-zinc-400">
              {item.kind}
            </span>

            {item.capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-400"
              >
                {t(capabilityName(capability))}
              </span>
            ))}

            {item.kind === "diffusion" &&
              !item.selectableForGenerate && (
                <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                  {t("Specialized")}
                </span>
              )}

            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {t("Available")}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function FamilyBadge({
  family,
}: {
  family: ModelFamily;
}) {
  const { t } = useI18n();
  const names: Record<ModelFamily, string> = {
    flux: "FLUX",
    sdxl: "SDXL",
    sd15: "SD 1.5",
    unknown: "Unknown",
  };

  return (
    <span className="whitespace-nowrap rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
      {t(names[family])}
    </span>
  );
}

type StatProps = {
  label: string;
  value: number;
  icon: typeof Boxes;
};

function Stat({
  label,
  value,
  icon: Icon,
}: StatProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-violet-500/10 p-3">
          <Icon className="h-6 w-6 text-violet-400" />
        </div>
      </div>
    </div>
  );
}

function filterItems(
  items: ModelItem[],
  search: string,
  family: ModelFamily | "all"
): ModelItem[] {
  const normalizedSearch =
    search.trim().toLowerCase();

  return items.filter((item) => {
    const matchesFamily =
      family === "all" ||
      item.family === family;

    const matchesSearch =
      normalizedSearch.length === 0 ||
      item.name
        .toLowerCase()
        .includes(normalizedSearch) ||
      item.filename
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesFamily && matchesSearch;
  });
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
