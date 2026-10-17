import type { HistoryItem } from "@/types/history";

export type HistorySort = "newest" | "oldest" | "model" | "largest";
export type HistoryFilters = {
  search: string;
  favoritesOnly: boolean;
  project: string;
  unassignedOnly: boolean;
  tag: string;
  model: string;
  sort: HistorySort;
};

export function parseTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

export function organizeHistory(items: HistoryItem[], filters: HistoryFilters): HistoryItem[] {
  const words = filters.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const result = items.filter((item) => {
    const searchable = [item.prompt, item.negativePrompt, item.modelName, item.loraId, item.project, ...item.tags].join(" ").toLocaleLowerCase();
    return (!filters.favoritesOnly || item.favorite)
      && (!filters.project || item.project === filters.project)
      && (!filters.unassignedOnly || !item.project)
      && (!filters.tag || item.tags.includes(filters.tag))
      && (!filters.model || item.modelId === filters.model)
      && words.every((word) => searchable.includes(word));
  });
  return result.sort((a, b) => {
    const newest = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || a.id.localeCompare(b.id);
    switch (filters.sort) {
      case "oldest": return -newest;
      case "model": return a.modelName.localeCompare(b.modelName) || newest;
      case "largest": return b.width * b.height - a.width * a.height || newest;
      default: return newest;
    }
  });
}
