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
      aria-label="AWS cloud status"
      className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="font-medium text-white">
            My AWS
          </p>

          <p className="mt-0.5 text-xs text-zinc-500">
            Bring your own AWS account
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
          aria-label="Close cloud status"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <CloudStatusRow
          icon={Cloud}
          label="AWS account"
          value={connected ? "Connected" : "Not connected"}
          online={connected}
        />

        <CloudStatusRow
          icon={KeyRound}
          label="Credentials"
          value={connected ? "Available" : "Not configured"}
          online={connected}
        />

        <CloudStatusRow
          icon={Server}
          label="EC2 instances"
          value="Not available"
          online={false}
        />
      </div>

      <p className="border-t border-zinc-800 px-4 py-3 text-xs leading-5 text-zinc-600">
        AWS connection and instance management will be added with the
        backend integration.
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
