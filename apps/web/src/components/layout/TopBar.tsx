"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bell,
  Cloud,
  Cpu,
  Menu,
} from "lucide-react";

import { getDashboard } from "@/services/dashboard-api";
import { useNotificationStore } from "@/stores/notification-store";
import type { DashboardData } from "@/types/dashboard";
import { useI18n } from "@/lib/i18n";
import { AccountMenu } from "./AccountMenu";
import { CloudStatusPopover } from "./CloudStatusPopover";
import { NotificationPopover } from "./NotificationPopover";
import { SystemStatusPopover } from "./SystemStatusPopover";

const routeInfo = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Welcome back to Veyqra",
  },
  "/generate": {
    title: "Generate",
    subtitle: "Create images with Veyqra",
  },
  "/train": {
    title: "Train",
    subtitle: "Train and manage LoRAs",
  },
  "/models": {
    title: "Models",
    subtitle: "Manage models and LoRAs",
  },
  "/history": {
    title: "History",
    subtitle: "Browse previous generations",
  },
  "/jobs": {
    title: "Jobs",
    subtitle: "Monitor generation jobs",
  },
  "/cloud": {
    title: "Cloud",
    subtitle: "Manage cloud compute",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Configure your Veyqra workstation",
  },
} as const;

type TopBarProps = {
  onOpenMobileMenu?: () => void;
};

export function TopBar({
  onOpenMobileMenu,
}: TopBarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);
  const [systemOpen, setSystemOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] =
    useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );
  const notifications = useNotificationStore(
    (state) => state.notifications
  );
  const previousJobStatusRef = useRef<
    Map<string, string> | null
  >(null);
  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error(
        "Unable to load top bar status:",
        error
      );
    }
  }, []);

  const closeSystemStatus = useCallback(() => {
    setSystemOpen(false);
  }, []);

  const closeCloudStatus = useCallback(() => {
    setCloudOpen(false);
  }, []);

  const closeNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeDashboard() {
      try {
        const data = await getDashboard();

        if (!cancelled) {
          setDashboard(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Unable to load initial top bar status:",
            error
          );
        }
      }
    }

    void initializeDashboard();

    const interval = window.setInterval(() => {
      void loadDashboard();
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (!dashboard) {
      return;
    }

    const currentStatuses = new Map<string, string>();

    for (const job of dashboard.recentJobs) {
      currentStatuses.set(job.id, job.status);
    }

    if (previousJobStatusRef.current === null) {
      previousJobStatusRef.current = currentStatuses;
      return;
    }

    const previousStatuses = previousJobStatusRef.current;

    for (const job of dashboard.recentJobs) {
      const previousStatus = previousStatuses.get(job.id);

      if (previousStatus === job.status) {
        continue;
      }

      if (job.status === "completed") {
        addNotification({
          kind: "success",
          title: t("Generation completed"),
          message: job.prompt || t("Your image is ready."),
          jobId: job.id,
        });
      }

      if (job.status === "failed") {
        addNotification({
          kind: "error",
          title: t("Generation failed"),
          message:
            job.error ||
            job.prompt ||
            t("The generation could not be completed."),
          jobId: job.id,
        });
      }

      if (job.status === "cancelled") {
        addNotification({
          kind: "info",
          title: t("Generation cancelled"),
          message:
            job.prompt ||
            t("The generation was cancelled."),
          jobId: job.id,
        });
      }
    }

    previousJobStatusRef.current = currentStatuses;
  }, [addNotification, dashboard, t]);

  const currentRoute =
    Object.entries(routeInfo).find(
      ([route]) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    )?.[1] ?? {
      title: "Veyqra",
      subtitle: "Create. Train. Deploy.",
    };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-xl sm:h-20 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label={t("Open navigation")}
          aria-controls="mobile-navigation"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-violet-500 hover:bg-zinc-800 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
        <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
          {t(currentRoute.title)}
        </h2>

        <p className="mt-1 hidden truncate text-sm text-zinc-400 sm:block">
          {t(currentRoute.subtitle)}
        </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
        <div className="relative">
          <button
            id="system-status-trigger"
            type="button"
            onClick={() => {
              setCloudOpen(false);
              setNotificationsOpen(false);
              setSystemOpen((value) => !value);
            }}
            aria-expanded={systemOpen}
            aria-controls="system-status-popover"
            aria-label={t("Show local system status")}
            className="flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            <Cpu
              className={`h-4 w-4 ${
                dashboard?.system.gpuOnline
                  ? "text-emerald-400"
                  : "text-zinc-600"
              }`}
            />

            <div className="hidden text-left sm:block">
              <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                GPU
              </p>

              <p className="text-xs font-medium text-zinc-200">
                {t("Local")}
              </p>
            </div>
          </button>

          <SystemStatusPopover
            open={systemOpen}
            onClose={closeSystemStatus}
            comfyOnline={
              dashboard?.system.comfyuiOnline ?? false
            }
            gpuOnline={
              dashboard?.system.gpuOnline ?? false
            }
            gpuName={dashboard?.system.gpu?.name ?? null}
            vramTotal={
              dashboard?.system.gpu?.vramTotal ?? null
            }
            vramFree={
              dashboard?.system.gpu?.vramFree ?? null
            }
            queueRunning={
              dashboard?.system.queueRunning ?? 0
            }
            queuePending={
              dashboard?.system.queuePending ?? 0
            }
          />
        </div>

        <div className="relative">
          <button
            id="cloud-status-trigger"
            type="button"
            onClick={() => {
              setSystemOpen(false);
              setNotificationsOpen(false);
              setCloudOpen((value) => !value);
            }}
            aria-expanded={cloudOpen}
            aria-controls="cloud-status-popover"
            aria-label={t("Show AWS cloud status")}
            className="flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            <Cloud className="h-4 w-4 text-sky-400" />

            <div className="hidden text-left sm:block">
              <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                Cloud
              </p>

              <p className="text-xs font-medium text-zinc-200">
                My AWS
              </p>
            </div>
          </button>

          <CloudStatusPopover
            open={cloudOpen}
            onClose={closeCloudStatus}
            connected={false}
          />
        </div>

        <div className="relative">
          <button
            id="notifications-trigger"
            type="button"
            onClick={() => {
              setSystemOpen(false);
              setCloudOpen(false);
              setNotificationsOpen(
                (value) => !value
              );
            }}
            aria-expanded={notificationsOpen}
            aria-controls="notifications-popover"
            aria-label={
              unreadCount > 0
                ? `${t("Notifications")}, ${unreadCount}`
                : t("Notifications")
            }
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-violet-500 hover:bg-zinc-800"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-zinc-950">
                {unreadCount > 9
                  ? "9+"
                  : unreadCount}
              </span>
            )}
          </button>

          <NotificationPopover
            open={notificationsOpen}
            onClose={closeNotifications}
          />
        </div>

        <div className="relative">
          <button
            id="account-menu-trigger"
            type="button"
            onClick={() => {
              setSystemOpen(false);
              setCloudOpen(false);
              setNotificationsOpen(false);
              setAccountOpen((value) => !value);
            }}
            aria-expanded={accountOpen}
            aria-controls="account-menu"
            aria-label={t("Open account menu")}
            title={t("Account")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/15 text-sm font-medium text-violet-300 transition hover:bg-violet-600/25 hover:text-violet-200"
          >
            C
          </button>
          <AccountMenu
            open={accountOpen}
            onClose={() => setAccountOpen(false)}
          />
        </div>
      </div>
    </header>
  );
}
