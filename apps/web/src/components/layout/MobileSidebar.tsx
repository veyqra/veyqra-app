"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

import { Sidebar } from "./Sidebar";
import { useI18n } from "@/lib/i18n";

type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileSidebar({
  open,
  onClose,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      id="mobile-navigation"
      className="fixed inset-0 z-50 lg:hidden"
    >
      <button
        type="button"
        aria-label={t("Close navigation")}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Navigation")}
        className="relative h-full w-[86vw] max-w-[320px] border-r border-zinc-800 bg-zinc-950 shadow-2xl shadow-black"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-violet-500 hover:text-white"
          aria-label={t("Close navigation")}
        >
          <X className="h-5 w-5" />
        </button>

        <div
          onClick={(event) => {
            const target = event.target as HTMLElement;

            if (target.closest("a")) {
              onClose();
            }
          }}
          className="h-full"
        >
          <Sidebar key={pathname} />
        </div>
      </div>
    </div>
  );
}
