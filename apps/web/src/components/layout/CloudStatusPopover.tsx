"use client";

import {
  Cloud,
  KeyRound,
  Server,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";
import { useI18n } from "@/lib/i18n";

type CloudStatusPopoverProps = {
  open: boolean;
  onClose: () => void;
  connected: boolean;
};

export function CloudStatusPopover({
  open,
  onClose,
  connected,
}: CloudStatusPopoverProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        !(target instanceof Node) ||
        ref.current?.contains(target)
      ) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest("#cloud-status-trigger")
      ) {
        return;
      }

      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={ref}
      id="cloud-status-popover"
      role="dialog"
      aria-label={t("AWS cloud status")}
      className="fixed left-4 right-4 top-[4.5rem] z-50 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[min(20rem,calc(100vw-2rem))] sm:overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="font-medium text-white">
            My AWS
          </p>

          <p className="mt-0.5 text-xs text-zinc-500">
            {t("Bring your own AWS account")}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
          aria-label={t("Close cloud status")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <CloudStatusRow
          icon={Cloud}
          label={t("AWS account")}
          value={connected ? t("Connected") : t("Not connected")}
          online={connected}
        />

        <CloudStatusRow
          icon={KeyRound}
          label={t("Credentials")}
          value={connected ? t("Available") : t("Not configured")}
          online={connected}
        />

        <CloudStatusRow
          icon={Server}
          label={t("EC2 instances")}
          value={t("Not available")}
          online={false}
        />
      </div>

      <p className="border-t border-zinc-800 px-4 py-3 text-xs leading-5 text-zinc-600">
        {t("AWS connection and instance management will be added with the backend integration.")}
      </p>
    </div>
  );
}

type CloudStatusRowProps = {
  icon: typeof Cloud;
  label: string;
  value: string;
  online: boolean;
};

function CloudStatusRow({
  icon: Icon,
  label,
  value,
  online,
}: CloudStatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900/70 px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950">
          <Icon
            className={`h-4 w-4 ${
              online ? "text-sky-400" : "text-zinc-600"
            }`}
          />
        </div>

        <span className="truncate text-sm text-zinc-300">
          {label}
        </span>
      </div>

      <span
        className={`shrink-0 text-xs font-medium ${
          online ? "text-sky-400" : "text-zinc-500"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
