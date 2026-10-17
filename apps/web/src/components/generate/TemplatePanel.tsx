"use client";

import { useState } from "react";
import { captureSettings, loadTemplate, useTemplateStore } from "@/stores/template-store";
import { useI18n } from "@/lib/i18n";

export function TemplatePanel() {
  const { t } = useI18n();
  const templates = useTemplateStore((state) => state.templates);
  const save = useTemplateStore((state) => state.save);
  const remove = useTemplateStore((state) => state.remove);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const active = templates.find((item) => item.id === selected);
  const inputClass = "min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm";
  const buttonClass = "rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-violet-500 disabled:opacity-40";
  return <section className="space-y-3 rounded-xl border border-zinc-800 p-3" aria-label={t("Generation templates")}>
    <h3 className="text-sm font-semibold">{t("Generation templates")}</h3>
    <form className="flex gap-2" onSubmit={(event) => {
      event.preventDefault();
      if (!name.trim()) return;
      save(name, captureSettings());
      setName("");
      setMessage(t("Template saved in this browser."));
    }}>
      <input aria-label={t("Template name")} placeholder={t("Template name")} className={inputClass} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
      <button className={buttonClass} disabled={!name.trim()}>{t("Save")}</button>
    </form>
    <div className="flex flex-wrap gap-2">
      <select aria-label={t("Choose template")} value={selected} onChange={(e) => setSelected(e.target.value)} className={inputClass}>
        <option value="">{t("Choose template")}</option>
        {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <button type="button" className={buttonClass} disabled={!active} onClick={() => {
        if (!active) return;
        loadTemplate(active);
        setMessage(t("Template loaded. Image modes require an input image."));
      }}>{t("Load")}</button>
      <button type="button" className={buttonClass} disabled={!active} onClick={() => {
        if (active && window.confirm(t("Delete this template?"))) { remove(active.id); setSelected(""); }
      }}>{t("Delete")}</button>
    </div>
    <p role="status" className="text-xs text-zinc-400">{message || t("Save prompts, models and all generation parameters in this browser.")}</p>
  </section>;
}
