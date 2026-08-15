"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Clock3,
  Copy,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import {
  clearHistory,
  deleteHistoryItem,
  getHistory,
} from "@/services/history-api";
import { useGenerateStore } from "@/stores/generate-store";
import type { HistoryItem } from "@/types/history";

export function HistoryWorkspace() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] =
    useState<HistoryItem | null>(null);

  const router = useRouter();

  const applySettings = useGenerateStore(
    (state) => state.applySettings
  );

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getHistory();
      setItems(response.items);
    } catch (loadError) {
      console.error(
        "Unable to load history:",
        loadError
      );

      setError(
        "Veyqra could not load generation history."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeHistory() {
      try {
        const response = await getHistory();

        if (cancelled) {
          return;
        }

        setItems(response.items);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Unable to load history:",
          loadError
        );

        setError(
          "Veyqra could not load generation history."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initializeHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return items;
    }

    return items.filter(
      (item) =>
        item.prompt.toLowerCase().includes(value) ||
        item.modelName.toLowerCase().includes(value) ||
        item.loraId.toLowerCase().includes(value)
    );
  }, [items, search]);

  async function handleDelete(id: string) {
    try {
      await deleteHistoryItem(id);

      setItems((current) =>
        current.filter((item) => item.id !== id)
      );

      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (deleteError) {
      console.error(
        "Unable to delete history item:",
        deleteError
      );
    }
  }

  async function handleClear() {
    if (items.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Delete the complete generation history?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await clearHistory();
      setItems([]);
      setSelectedItem(null);
    } catch (clearError) {
      console.error(
        "Unable to clear history:",
        clearError
      );
    }
  }

  function handleReuse(item: HistoryItem) {
    applySettings({
      prompt: item.prompt,
      negativePrompt: item.negativePrompt,
      modelId: item.modelId,
      loraId: item.loraId,
      loraStrength: item.loraStrength,
      seed: item.seed,
      steps: item.steps,
      guidance: item.guidance,
      resolutionId: resolutionIdFromSize(
        item.width,
        item.height
      ),
    });

    router.push("/generate");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search history..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm transition hover:border-violet-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={items.length === 0}
              className="flex items-center gap-2 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300 transition hover:bg-red-950/40 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <div className="text-center text-zinc-500">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-violet-400" />
            <p className="mt-4">
              Loading generation history...
            </p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900">
          <div className="text-center text-zinc-600">
            <Clock3 className="mx-auto h-8 w-8" />

            <p className="mt-3 text-sm">
              No generation history found.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredItems.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onReuse={handleReuse}
              onOpen={setSelectedItem}
            />
          ))}
        </div>
      )}

      {selectedItem && (
        <HistoryDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onReuse={handleReuse}
        />
      )}
    </div>
  );
}

type HistoryCardProps = {
  item: HistoryItem;
  onDelete: (id: string) => Promise<void>;
  onReuse: (item: HistoryItem) => void;
  onOpen: (item: HistoryItem) => void;
};

function HistoryCard({
  item,
  onDelete,
  onReuse,
  onOpen,
}: HistoryCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="block aspect-square w-full overflow-hidden bg-zinc-950"
      >
        <img
          src={item.imageUrl}
          alt={item.prompt}
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
        />
      </button>

      <div className="space-y-4 p-4">
        <div>
          <p
            className="line-clamp-2 text-sm font-medium text-white"
            title={item.prompt}
          >
            {item.prompt}
          </p>

          <p className="mt-2 truncate font-mono text-xs text-zinc-500">
            {item.modelName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <HistoryDetail
            label="Resolution"
            value={`${item.width} × ${item.height}`}
          />

          <HistoryDetail
            label="Steps"
            value={String(item.steps)}
          />

          <HistoryDetail
            label="Guidance"
            value={String(item.guidance)}
          />

          <HistoryDetail
            label="Seed"
            value={String(item.seed)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <span className="text-xs text-zinc-600">
            {formatDate(item.createdAt)}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onReuse(item)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-violet-300 transition hover:bg-violet-500/10"
            >
              <Copy className="h-4 w-4" />
              Reuse
            </button>

            <button
              type="button"
              onClick={() =>
                void onDelete(item.id)
              }
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-950/30 hover:text-red-400"
              aria-label="Delete history item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function HistoryDetailModal({
  item,
  onClose,
  onReuse,
}: {
  item: HistoryItem;
  onClose: () => void;
  onReuse: (item: HistoryItem) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-h-[500px] items-center justify-center bg-black p-6">
            <img
              src={item.imageUrl}
              alt={item.prompt}
              className="max-h-[80vh] max-w-full object-contain"
            />
          </div>

          <aside className="space-y-6 border-l border-zinc-800 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Generation details
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  {formatDate(item.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-600">
                Prompt
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {item.prompt}
              </p>
            </div>

            {item.negativePrompt && (
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-600">
                  Negative prompt
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {item.negativePrompt}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <HistoryDetail
                label="Model"
                value={item.modelName}
              />

              <HistoryDetail
                label="LoRA"
                value={
                  item.loraId === "none"
                    ? "None"
                    : item.loraId
                }
              />

              <HistoryDetail
                label="Strength"
                value={item.loraStrength.toFixed(2)}
              />

              <HistoryDetail
                label="Resolution"
                value={`${item.width} × ${item.height}`}
              />

              <HistoryDetail
                label="Steps"
                value={String(item.steps)}
              />

              <HistoryDetail
                label="Guidance"
                value={String(item.guidance)}
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-600">
                Seed
              </p>

              <p className="mt-2 break-all rounded-lg bg-zinc-900 p-3 font-mono text-xs text-zinc-300">
                {item.seed}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onReuse(item)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <ExternalLink className="h-4 w-4" />
              Send to Generate
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function HistoryDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-950 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p
        title={value}
        className="mt-1 truncate text-zinc-300"
      >
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

function resolutionIdFromSize(
  width: number,
  height: number
): string {
  if (width === 768 && height === 1152) {
    return "portrait";
  }

  if (width === 1152 && height === 768) {
    return "landscape";
  }

  return "square";
}
