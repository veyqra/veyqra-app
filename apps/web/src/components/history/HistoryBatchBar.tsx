"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { parseTags } from "@/lib/history-organization";
import type { HistoryBatchChanges } from "@/services/history-api";

export function HistoryBatchBar({ count, visibleSelected, visibleCount, busy, projects, onSelectVisible, onClear, onUpdate }: {
  count: number; visibleSelected: number; visibleCount: number; busy: boolean; projects: string[];
  onSelectVisible: () => void; onClear: () => void;
  onUpdate: (changes: HistoryBatchChanges) => Promise<void>;
}) {
  const { t } = useI18n();
  const [project, setProject] = useState("");
  const [tags, setTags] = useState("");
  const button = "rounded-lg border border-zinc-700 px-3 py-2 text-xs hover:border-violet-500 disabled:opacity-40";
  const input = "min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm";
  return <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-label={t("Organize selection")}>
    <div className="flex flex-wrap items-center gap-3">
      <strong className="text-sm" role="status">{t("{count} selected", { count })}</strong>
      <button type="button" className={button} disabled={busy || !visibleCount} onClick={onSelectVisible}>{visibleSelected === visibleCount && visibleCount ? t("Deselect page") : t("Select page")}</button>
      <button type="button" className={button} disabled={busy || !count} onClick={onClear}>{t("Clear selection")}</button>
      <span className="text-xs text-zinc-500">{t("Selection is kept across pages and filters.")}</span>
    </div>
    {count > 0 && <fieldset disabled={busy} className="space-y-3 disabled:opacity-50">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => void onUpdate({ favorite: true })}>★ {t("Mark as favorites")}</button>
        <button type="button" className={button} onClick={() => void onUpdate({ favorite: false })}>☆ {t("Remove favorites")}</button>
        <button type="button" className={button} onClick={() => void onUpdate({ project: "" })}>{t("Remove project assignment")}</button>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); if (project.trim()) void onUpdate({ project: project.trim() }); }}>
          <input className={input} aria-label={t("Project for selection")} placeholder={t("Project for selection")} list="batch-projects" value={project} maxLength={100} onChange={(event) => setProject(event.target.value)} />
          <datalist id="batch-projects">{projects.map((name) => <option key={name} value={name} />)}</datalist>
          <button className={button} disabled={!project.trim()}>{t("Assign project")}</button>
        </form>
        <div className="flex flex-wrap gap-2">
          <input className={input} aria-label={t("Tags for selection")} placeholder={t("Tags separated by commas")} value={tags} maxLength={1500} onChange={(event) => setTags(event.target.value)} />
          <button type="button" className={button} disabled={!parseTags(tags).length} onClick={() => void onUpdate({ add_tags: parseTags(tags) })}>{t("Add tags")}</button>
          <button type="button" className={button} disabled={!parseTags(tags).length} onClick={() => void onUpdate({ remove_tags: parseTags(tags) })}>{t("Remove tags")}</button>
        </div>
      </div>
    </fieldset>}
  </section>;
}
