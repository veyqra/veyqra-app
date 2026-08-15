"use client";

import {
  Bell,
  CheckCheck,
  CircleCheck,
  CircleX,
  Info,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";

import {
  type AppNotification,
  useNotificationStore,
} from "@/stores/notification-store";

type NotificationPopoverProps = {
  open: boolean;
  onClose: () => void;
};

export function NotificationPopover({
  open,
  onClose,
}: NotificationPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useNotificationStore(
    (state) => state.notifications
  );
  const markAsRead = useNotificationStore(
    (state) => state.markAsRead
  );
  const markAllAsRead = useNotificationStore(
    (state) => state.markAllAsRead
  );
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification
  );
  const clearNotifications = useNotificationStore(
    (state) => state.clearNotifications
  );
  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

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
        target.closest("#notifications-trigger")
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

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={ref}
      id="notifications-popover"
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50"
    >
      <div className="flex items-start justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">
            Notifications
          </p>

          <p className="mt-0.5 text-xs text-zinc-500">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You are all caught up"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
          aria-label="Close notifications"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {notifications.length > 0 && (
        <div className="flex items-center justify-end gap-1 border-b border-zinc-800 px-3 py-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}

          <button
            type="button"
            onClick={clearNotifications}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-zinc-500 transition hover:bg-zinc-900 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-zinc-600">
            <Bell className="h-5 w-5" />
          </div>

          <p className="mt-3 text-sm font-medium text-zinc-300">
            No notifications
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-600">
            Job updates will appear here.
          </p>
        </div>
      ) : (
        <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() =>
                markAsRead(notification.id)
              }
              onRemove={() =>
                removeNotification(notification.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

type NotificationItemProps = {
  notification: AppNotification;
  onRead: () => void;
  onRemove: () => void;
};

function NotificationItem({
  notification,
  onRead,
  onRemove,
}: NotificationItemProps) {
  const Icon =
    notification.kind === "success"
      ? CircleCheck
      : notification.kind === "error"
        ? CircleX
        : Info;
  const iconClassName =
    notification.kind === "success"
      ? "text-emerald-400"
      : notification.kind === "error"
        ? "text-red-400"
        : "text-sky-400";

  return (
    <div
      className={`group relative mb-1 overflow-hidden rounded-xl border transition last:mb-0 ${
        notification.read
          ? "border-transparent bg-zinc-900/40"
          : "border-zinc-800 bg-zinc-900/80"
      }`}
    >
      <button
        type="button"
        onClick={onRead}
        className="flex w-full gap-3 px-3 py-3 pr-11 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950">
          <Icon className={`h-4 w-4 ${iconClassName}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-zinc-200">
              {notification.title}
            </p>

            {!notification.read && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
            )}
          </div>

          <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-zinc-500">
            {notification.message}
          </p>

          <p className="mt-1 text-[11px] text-zinc-700">
            {formatNotificationTime(
              notification.createdAt
            )}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-zinc-600 transition hover:text-red-300 sm:hidden sm:group-hover:flex"
        aria-label="Remove notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function formatNotificationTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
