"use client";

import { Check, Languages, X } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  useI18n,
  type LanguagePreference,
} from "@/lib/i18n";

export function AccountMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { preference, setPreference, t } = useI18n();

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || ref.current?.contains(target)) return;
      if (target instanceof Element && target.closest("#account-menu-trigger")) return;
      onClose();
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  const options: Array<{
    value: LanguagePreference;
    label: string;
    detail?: string;
  }> = [
    { value: "system", label: t("System"), detail: t("Follow browser language") },
    { value: "de", label: t("German") },
    { value: "en", label: t("English") },
  ];

  return (
    <div
      ref={ref}
      id="account-menu"
      role="dialog"
      aria-label={t("Language")}
      className="fixed left-4 right-4 top-[4.5rem] z-50 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[min(19rem,calc(100vw-2rem))] sm:overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-violet-400" />
          <p className="text-sm font-semibold">{t("Language")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Close navigation")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1 p-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-900"
          >
            <span>
              <span className="block text-sm text-zinc-200">{option.label}</span>
              {option.detail && (
                <span className="mt-0.5 block text-xs text-zinc-600">{option.detail}</span>
              )}
            </span>
            {preference === option.value && (
              <Check className="h-4 w-4 shrink-0 text-violet-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
