"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
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
  getAllHistory,
  updateHistorySelection,
  type HistoryBatchChanges,
} from "@/services/history-api";
import { HistoryImageTools } from "./HistoryImageTools";
import { ImageComparison } from "./ImageComparison";
import { UpscaleDialog } from "./UpscaleDialog";
import { HistoryBatchBar } from "./HistoryBatchBar";
import { organizeHistory, type HistorySort } from "@/lib/history-organization";
import { ImageReuseActions } from "@/components/generate/ImageReuseActions";
import { UpscaleAction } from "@/components/generate/UpscaleAction";
import { useGenerateStore } from "@/stores/generate-store";
import type { HistoryItem } from "@/types/history";
import { useI18n } from "@/lib/i18n";

export function HistoryWorkspace() {
  const { t } = useI18n();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [sort, setSort] = useState<HistorySort>("newest");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<string[]>([]);
  const [organizationBusy, setOrganizationBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [upscaleItem, setUpscaleItem] = useState<HistoryItem | null>(null);
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
      const response = await getAllHistory();
      setItems(response.items);
      setSelection((current) => current.filter((id) => response.items.some((item) => item.id === id)));
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
        const response = await getAllHistory();

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

  const filteredItems = useMemo(() => organizeHistory(items, {
    search, favoritesOnly, project: projectFilter, unassignedOnly, tag: tagFilter, model: modelFilter, sort,
  }), [items, search, favoritesOnly, projectFilter, unassignedOnly, tagFilter, modelFilter, sort]);

  const projects = [...new Set(items.map((item) => item.project).filter(Boolean))].sort();
  const tags = [...new Set(items.flatMap((item) => item.tags))].sort();
  const models = [...new Map(items.map((item) => [item.modelId, item.modelName])).entries()];
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / 24));
  const activePage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((activePage - 1) * 24, activePage * 24);
  const visibleSelected = visibleItems.filter((item) => selection.includes(item.id)).length;
  const comparisonItems = comparisonIds.flatMap((id) => items.filter((item) => item.id === id));

  function resetFilters() {
    setSearch(""); setFavoritesOnly(false); setProjectFilter(""); setUnassignedOnly(false);
    setTagFilter(""); setModelFilter(""); setSort("newest"); setPage(1);
  }

  function toggleSelection(id: string) {
    setMessage("");
    setSelection((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function selectVisible() {
    setSelection((current) => visibleSelected === visibleItems.length
      ? current.filter((id) => !visibleItems.some((item) => item.id === id))
      : [...new Set([...current, ...visibleItems.map((item) => item.id)])]);
  }

  async function organizeSelection(changes: HistoryBatchChanges) {
    if (!selection.length || organizationBusy) return;
    if (selection.length > 500) { setError(t("Select at most 500 images per action.")); return; }
    setOrganizationBusy(true); setError(null); setMessage("");
    try {
      const updated = await updateHistorySelection(selection, changes);
      const byId = new Map(updated.map((item) => [item.id, item]));
      setItems((current) => current.map((item) => byId.get(item.id) ?? item));
      setSelectedItem((current) => current ? byId.get(current.id) ?? current : current);
      setMessage(t("Updated {count} images.", { count: updated.length }));
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setOrganizationBusy(false); }
  }

  function updateItem(updated: HistoryItem) {
    setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedItem((current) => current?.id === updated.id ? updated : current);
  }

  function toggleComparison(id: string) {
    setComparisonIds((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 2 ? [...current, id] : [current[1], id]);
  }

  const selectedItemIndex = selectedItem
    ? filteredItems.findIndex(
        (item) => item.id === selectedItem.id
      )
    : -1;

  function showSelectedItem(offset: number) {
    if (filteredItems.length === 0) {
      return;
    }

    const activeIndex =
      selectedItemIndex === -1 ? 0 : selectedItemIndex;
    const nextIndex =
      (activeIndex + offset + filteredItems.length) %
      filteredItems.length;

    setSelectedItem(filteredItems[nextIndex]);
  }

  async function handleDelete(id: string) {
    try {
      await deleteHistoryItem(id);
      setSelection((current) => current.filter((value) => value !== id));
      setComparisonIds((current) => current.filter((value) => value !== id));

      setItems((current) =>
        current.filter((item) => item.id !== id)
      );

      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
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
      t("Delete the complete generation history?")
    );

    if (!confirmed) {
      return;
    }

    try {
      await clearHistory();
      setItems([]);
      setSelection([]);
      setComparisonIds([]);
      setSelectedItem(null);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : String(clearError));
      console.error(
        "Unable to clear history:",
        clearError
      );
    }
  }

  function applyItemSettings(item: HistoryItem) {
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
    useGenerateStore.setState({ sampler: item.sampler, scheduler: item.scheduler, generationMode: "text_to_image", modelFamily: null });
  }

  function handleReuse(item: HistoryItem) {
    applyItemSettings(item);

    router.push("/generate");
  }

  function handleImagePrepared() {
    setSelectedItem(null);
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
                { setSearch(event.target.value); setPage(1); }
              }
              placeholder={t("Search history...")}
              aria-label={t("Search history...")}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={isLoading || organizationBusy}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm transition hover:border-violet-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoading ? "animate-spin" : ""
                }`}
              />
              {t("Refresh")}
            </button>

            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={items.length === 0 || organizationBusy}
              className="flex items-center gap-2 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300 transition hover:bg-red-950/40 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              {t("Clear")}
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-label={t("History filters")}>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={favoritesOnly} onChange={(e) => { setFavoritesOnly(e.target.checked); setPage(1); }} />{t("Favorites only")} ({items.filter((item) => item.favorite).length})</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unassignedOnly} onChange={(e) => { setUnassignedOnly(e.target.checked); setProjectFilter(""); setPage(1); }} />{t("Without project")}</label>
        <select aria-label={t("Filter by project")} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm" value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setUnassignedOnly(false); setPage(1); }}>
          <option value="">{t("All projects")}</option>
          {projects.map((name) => <option key={name} value={name}>{name} ({items.filter((item) => item.project === name).length})</option>)}
        </select>
        <select aria-label={t("Filter by tag")} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm" value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}>
          <option value="">{t("All tags")}</option>{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <select aria-label={t("Filter by model")} className="max-w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm" value={modelFilter} onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}>
          <option value="">{t("All models")}</option>{models.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label={t("Sort history")} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm" value={sort} onChange={(e) => { setSort(e.target.value as HistorySort); setPage(1); }}>
          <option value="newest">{t("Newest first")}</option><option value="oldest">{t("Oldest first")}</option><option value="model">{t("Model name")}</option><option value="largest">{t("Largest images")}</option>
        </select>
        <button type="button" className="text-xs text-zinc-400 hover:text-white" onClick={resetFilters}>{t("Reset filters")}</button>
        <button type="button" className="rounded-lg border border-violet-700 px-3 py-2 text-sm disabled:opacity-40" disabled={comparisonItems.length !== 2} onClick={() => setComparing(true)}>{t("Compare selected")} ({comparisonItems.length}/2)</button>
        {comparisonIds.length > 0 && <button type="button" onClick={() => setComparisonIds([])} className="text-xs text-zinc-400">{t("Clear selection")}</button>}
        <span className="text-xs text-zinc-400">{filteredItems.length} / {items.length}</span>
      </section>

      <HistoryBatchBar count={selection.length} visibleSelected={visibleSelected} visibleCount={visibleItems.length} busy={organizationBusy || isLoading} projects={projects} onSelectVisible={selectVisible} onClear={() => setSelection([])} onUpdate={organizeSelection} />
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}

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
              {t("Loading generation history...")}
            </p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900">
          <div className="text-center text-zinc-600">
            <Clock3 className="mx-auto h-8 w-8" />

            <p className="mt-3 text-sm">
              {t("No generation history found.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleItems.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              selected={selection.includes(item.id)}
              selectionDisabled={organizationBusy}
              onSelect={() => toggleSelection(item.id)}
              onDelete={handleDelete}
              onReuse={handleReuse}
              onImagePrepared={handleImagePrepared}
              onError={setError}
              onOpen={setSelectedItem}
              tools={<fieldset disabled={organizationBusy}><HistoryImageTools key={`${item.id}-${item.project}-${JSON.stringify(item.tags)}`} item={item} projects={projects} onUpdated={updateItem} onError={setError} compareSelected={comparisonIds.includes(item.id)} onCompare={() => toggleComparison(item.id)} onUpscale={() => setUpscaleItem(item)} /></fieldset>}
            />
          ))}
        </div>
      )}

      {pageCount > 1 && <nav aria-label={t("History pages")} className="flex items-center justify-center gap-4">
        <button type="button" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)} className="rounded-lg border border-zinc-700 p-2 disabled:opacity-40" aria-label={t("Previous page")}><ChevronLeft /></button>
        <span className="text-sm">{t("Page {page} of {count}", { page: activePage, count: pageCount })}</span>
        <button type="button" disabled={activePage >= pageCount} onClick={() => setPage(activePage + 1)} className="rounded-lg border border-zinc-700 p-2 disabled:opacity-40" aria-label={t("Next page")}><ChevronRight /></button>
      </nav>}

      {selectedItem && (
        <HistoryDetailModal
          item={selectedItem}
          itemIndex={selectedItemIndex}
          itemCount={filteredItems.length}
          onClose={() => setSelectedItem(null)}
          onPrevious={() => showSelectedItem(-1)}
          onNext={() => showSelectedItem(1)}
          onReuse={handleReuse}
          onImagePrepared={handleImagePrepared}
          onError={setError}
        />
      )}
      {comparing && comparisonItems.length === 2 && <ImageComparison items={comparisonItems} onClose={() => setComparing(false)} />}
      {upscaleItem && <UpscaleDialog item={upscaleItem} onClose={() => setUpscaleItem(null)} />}
    </div>
  );
}

type HistoryCardProps = {
  selected: boolean;
  selectionDisabled: boolean;
  onSelect: () => void;
  tools: ReactNode;
  item: HistoryItem;
  onDelete: (id: string) => Promise<void>;
  onReuse: (item: HistoryItem) => void;
  onImagePrepared: () => void;
  onError: (message: string) => void;
  onOpen: (item: HistoryItem) => void;
};

function HistoryCard({
  selected,
  selectionDisabled,
  onSelect,
  tools,
  item,
  onDelete,
  onReuse,
  onImagePrepared,
  onError,
  onOpen,
}: HistoryCardProps) {
  const { t } = useI18n();
  return (
    <article className={`overflow-hidden rounded-2xl border bg-zinc-900 ${selected ? "border-violet-400 ring-1 ring-violet-400" : "border-zinc-800"}`}>
      <label className="flex cursor-pointer items-center gap-2 px-4 py-3 text-xs text-zinc-300"><input type="checkbox" checked={selected} disabled={selectionDisabled} onChange={onSelect} aria-label={t("Select image: {prompt}", { prompt: item.prompt.slice(0, 80) })} />{t("Select image")}{item.favorite && <span className="ml-auto text-amber-300" aria-label={t("Favorite")}>★</span>}</label>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="block aspect-square w-full overflow-hidden bg-zinc-950"
      >
        <img
          src={item.imageUrl}
          alt={item.prompt}
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
          loading="lazy"
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

        <div className="flex flex-wrap gap-2 text-xs">
          {item.project && <span className="rounded-md bg-violet-500/15 px-2 py-1 text-violet-300">{item.project}</span>}
          {item.tags.map((tag) => <span key={tag} className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-300">#{tag}</span>)}
        </div>
        <details className="space-y-4">
          <summary className="cursor-pointer text-xs text-violet-300">{t("Actions and details")}</summary>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <HistoryDetail
            label={t("Resolution")}
            value={`${item.width} × ${item.height}`}
          />

          <HistoryDetail
            label={t("Steps")}
            value={String(item.steps)}
          />

          <HistoryDetail
            label={t("Guidance")}
            value={String(item.guidance)}
          />

          <HistoryDetail
            label={t("Seed")}
            value={String(item.seed)}
          />
        </div>

        {tools}
        {item.upscaleModel && <p className="text-xs text-zinc-400">{t("Upscale")}: {item.upscaleFactor}× · {item.upscaleModel}</p>}
        <ImageReuseActions
          imageId={item.id}
          imageUrl={item.imageUrl}
          onPrepared={onImagePrepared}
          onError={onError}
        />

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
              {t("Reuse")}
            </button>

            <button
              type="button"
              onClick={() =>
                void onDelete(item.id)
              }
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-950/30 hover:text-red-400"
              aria-label={t("Delete history item")}
              disabled={selectionDisabled}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        </details>
      </div>
    </article>
  );
}

function HistoryDetailModal({
  item,
  itemIndex,
  itemCount,
  onClose,
  onPrevious,
  onNext,
  onReuse,
  onImagePrepared,
  onError,
}: {
  item: HistoryItem;
  itemIndex: number;
  itemCount: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReuse: (item: HistoryItem) => void;
  onImagePrepared: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative flex min-h-[500px] items-center justify-center bg-black p-6">
            <img
              src={item.imageUrl}
              alt={item.prompt}
              className="max-h-[80vh] max-w-full object-contain"
            />

            {itemCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={onPrevious}
                  aria-label={t("Show previous history image")}
                  className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 text-white shadow-xl backdrop-blur transition hover:border-violet-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  aria-label={t("Show next history image")}
                  className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 text-white shadow-xl backdrop-blur transition hover:border-violet-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>

                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-1 text-xs text-zinc-300 shadow-lg backdrop-blur">
                  {itemIndex + 1} / {itemCount}
                </span>
              </>
            )}
          </div>

          <aside className="space-y-6 border-l border-zinc-800 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {t("Generation details")}
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
                {t("Close")}
              </button>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-600">
                {t("Prompt")}
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {item.prompt}
              </p>
            </div>

            {item.negativePrompt && (
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-600">
                  {t("Negative prompt")}
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {item.negativePrompt}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <HistoryDetail
                label={t("Model")}
                value={item.modelName}
              />

              <HistoryDetail
                label="LoRA"
                value={
                  item.loraId === "none"
                    ? t("None")
                    : item.loraId
                }
              />

              <HistoryDetail
                label={t("Strength")}
                value={item.loraStrength.toFixed(2)}
              />

              <HistoryDetail
                label={t("Resolution")}
                value={`${item.width} × ${item.height}`}
              />

              <HistoryDetail
                label={t("Steps")}
                value={String(item.steps)}
              />

              <HistoryDetail
                label={t("Guidance")}
                value={String(item.guidance)}
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-600">
                {t("Seed")}
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
              {t("Send to Generate")}
            </button>

            <ImageReuseActions
              imageId={item.id}
              imageUrl={item.imageUrl}
              onPrepared={onImagePrepared}
              onError={onError}
            />
            <UpscaleAction image={item} className="w-full" />
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

  if (width === 1024 && height === 1024) return "square";
  if (["832x1216", "1216x832", "896x1152", "1152x896"].includes(`${width}x${height}`)) return `${width}x${height}`;
  return "square";
}
