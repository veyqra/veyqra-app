"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Clock3,
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

import type { HistoryItem } from "@/types/history";

export function HistoryWorkspace() {
  const [items, setItems] =
    useState<HistoryItem[]>([]);

  const [search, setSearch] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

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
        "Vyrra could not load generation history."
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
          "Vyrra could not load generation history."
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
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return items;
    }

    return items.filter(
      (item) =>
        item.prompt
          .toLowerCase()
          .includes(value) ||
        item.modelName
          .toLowerCase()
          .includes(value) ||
        item.loraId
          .toLowerCase()
          .includes(value)
    );
  }, [items, search]);

  async function handleDelete(
    id: string
  ) {
    try {
      await deleteHistoryItem(id);

      setItems((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );
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
    } catch (clearError) {
      console.error(
        "Unable to clear history:",
        clearError
      );
    }
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
              onClick={() =>
                void loadHistory()
              }
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm transition hover:border-violet-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoading
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                void handleClear()
              }
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

type HistoryCardProps = {
  item: HistoryItem;
  onDelete: (
    id: string
  ) => Promise<void>;
};

function HistoryCard({
  item,
  onDelete,
}: HistoryCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="aspect-square overflow-hidden bg-zinc-950">
        <img
          src={item.imageUrl}
          alt={item.prompt}
          className="h-full w-full object-cover"
        />
      </div>

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
    </article>
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

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}
