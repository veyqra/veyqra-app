"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Boxes,
  CheckCircle2,
  CircleAlert,
  Cpu,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Workflow,
} from "lucide-react";

import { getDashboard } from "@/services/dashboard-api";
import type { DashboardData } from "@/types/dashboard";
import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import type { GenerationJob } from "@/types/generate";

export function DashboardWorkspace() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadDashboard = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await getDashboard();

        setData(response);
      } catch (loadError) {
        console.error(
          "Unable to load dashboard:",
          loadError
        );

        setError(
          "Vyrra could not load dashboard data."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function initializeDashboard() {
      try {
        const response =
          await getDashboard();

        if (cancelled) {
          return;
        }

        setData(response);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Unable to load dashboard:",
          loadError
        );

        setError(
          "Vyrra could not load dashboard data."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initializeDashboard();

    return () => {
      cancelled = true;
    };
  }, []);
  
  useEffect(() => {
    if (!data || data.stats.activeJobs === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadDashboard();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [data?.stats.activeJobs, loadDashboard]);

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Vyrra workstation overview.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadDashboard()
          }
          disabled={isLoading}
          className="flex items-center gap-2 self-start rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-white disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isLoading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </section>

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Models"
              value={data.stats.totalModels}
              detail={`${data.stats.diffusionModels} base · ${data.stats.loras} LoRA`}
              icon={Boxes}
            />

            <StatCard
              label="Active Jobs"
              value={data.stats.activeJobs}
              detail={`${data.stats.completedJobs} completed`}
              icon={Workflow}
            />

            <StatCard
              label="ComfyUI"
              value={
                data.system.comfyuiOnline
                  ? "Online"
                  : "Offline"
              }
              detail="Local backend"
              icon={
                data.system.comfyuiOnline
                  ? CheckCircle2
                  : CircleAlert
              }
            />

            <StatCard
              label="GPU"
              value={
                data.system.gpuOnline
                  ? "Online"
                  : "Offline"
              }
              detail="ComfyUI device"
              icon={Cpu}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Recent jobs
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Latest generation activity.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {data.recentJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
                    No generation jobs yet.
                  </div>
                ) : (
                  data.recentJobs.map(
                    (job) => (
                      <RecentJob
                        key={job.id}
                        job={job}
                      />
                    )
                  )
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-lg font-semibold text-white">
                Quick actions
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Common Vyrra workflows.
              </p>

              <div className="mt-6 grid gap-3">
                <QuickAction
                  href="/generate"
                  title="Generate image"
                  description="Start a new local generation."
                  icon={ImagePlus}
                />

                <QuickAction
                  href="/jobs"
                  title="View jobs"
                  description="Monitor generation jobs."
                  icon={Workflow}
                />

                <QuickAction
                  href="/models"
                  title="Manage models"
                  description="Browse available models and LoRAs."
                  icon={Boxes}
                />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            {detail}
          </p>
        </div>

        <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function RecentJob({
  job,
}: {
  job: GenerationJob;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-medium text-white">
            {job.prompt}
          </p>

          <p className="mt-1 truncate text-xs text-zinc-600">
            {job.modelName}
          </p>
        </div>

        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs capitalize text-zinc-300">
          {job.status}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-violet-500"
          style={{
            width: `${job.progress}%`,
          }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-violet-500"
    >
      <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-sm font-medium text-white">
          {title}
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          {description}
        </p>
      </div>
    </Link>
  );
}
