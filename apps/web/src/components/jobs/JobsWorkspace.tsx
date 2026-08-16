"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Ban,
  CheckCircle2,
  Clock3,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import {
  cancelGeneration,
  listGenerations,
} from "@/services/generation-api";

import type { GenerationJob } from "@/types/generate";
import { useI18n } from "@/lib/i18n";

export function JobsWorkspace() {
  const { t } = useI18n();
  const [jobs, setJobs] =
    useState<GenerationJob[]>([]);

  const [search, setSearch] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response =
        await listGenerations();

      setJobs(response);
    } catch (loadError) {
      console.error(
        "Unable to load generation jobs:",
        loadError
      );

      setError(
        "Veyqra could not load generation jobs."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeJobs() {
      try {
        const response =
          await listGenerations();

        if (cancelled) {
          return;
        }

        setJobs(response);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Unable to load generation jobs:",
          loadError
        );

        setError(
          "Veyqra could not load generation jobs."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initializeJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (job) =>
        job.status === "queued" ||
        job.status === "running"
    );

    if (!hasActiveJobs) {
      return;
    }

    const interval = window.setInterval(
      () => {
        void loadJobs();
      },
      5000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [jobs, loadJobs]);

  const filteredJobs = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return jobs;
    }

    return jobs.filter(
      (job) =>
        job.prompt
          .toLowerCase()
          .includes(value) ||
        job.modelName
          .toLowerCase()
          .includes(value) ||
        job.status
          .toLowerCase()
          .includes(value)
    );
  }, [jobs, search]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      running: jobs.filter(
        (job) =>
          job.status === "running" ||
          job.status === "queued"
      ).length,
      completed: jobs.filter(
        (job) =>
          job.status === "completed"
      ).length,
      failed: jobs.filter(
        (job) =>
          job.status === "failed"
      ).length,
    };
  }, [jobs]);

  async function handleCancel(
    id: string
  ) {
    setError(null);

    try {
      const updated =
        await cancelGeneration(id);

      setJobs((current) =>
        current.map((job) =>
          job.id === id
            ? updated
            : job
        )
      );
    } catch (cancelError) {
      console.error(
        "Unable to cancel generation job:",
        cancelError
      );
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Veyqra could not cancel the generation job."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {t("Jobs")}
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          {t("Monitor local generation jobs and queue activity.")}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <JobStat
          label={t("Total")}
          value={stats.total}
        />

        <JobStat
          label={t("Active")}
          value={stats.running}
        />

        <JobStat
          label={t("Completed")}
          value={stats.completed}
        />

        <JobStat
          label={t("Failed")}
          value={stats.failed}
        />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder={t("Search jobs...")}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void loadJobs()
            }
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm transition hover:border-violet-500 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading
                  ? "animate-spin"
                  : ""
              }`}
            />

            {t("Refresh")}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {isLoading && jobs.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center">
          <div className="text-center text-zinc-500">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-violet-400" />

            <p className="mt-4">
              {t("Loading generation jobs...")}
            </p>
          </div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900">
          <div className="text-center text-zinc-600">
            <Clock3 className="mx-auto h-8 w-8" />

            <p className="mt-3 text-sm">
              {t("No generation jobs found.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function JobCard({
  job,
  onCancel,
}: {
  job: GenerationJob;
  onCancel: (
    id: string
  ) => Promise<void>;
}) {
  const { t } = useI18n();
  const active =
    job.status === "queued" ||
    job.status === "running";

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col gap-5 xl:flex-row">
        {job.image?.imageUrl ? (
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-950">
            <img
              src={job.image.imageUrl}
              alt={job.prompt}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-zinc-700">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={job.status}
                />

                <span className="font-mono text-xs text-zinc-600">
                  {job.id.slice(0, 8)}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm font-medium text-white">
                {job.prompt}
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                {job.modelName}
              </p>
            </div>

            {active && (
              <button
                type="button"
                onClick={() =>
                  void onCancel(job.id)
                }
                className="flex items-center gap-2 self-start rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-950/40"
              >
                <Ban className="h-4 w-4" />
                {t("Cancel")}
              </button>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                {t("Progress")}
              </span>

              <span className="font-medium text-zinc-300">
                {job.progress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{
                  width: `${job.progress}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span>
              {t("Created")}:{" "}
              {formatDate(
                job.createdAt
              )}
            </span>

            {job.error && (
              <span className="text-red-400">
                {job.error}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: GenerationJob["status"];
}) {
  const { t } = useI18n();
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("Completed")}
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        {t("Failed")}
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-zinc-700/40 px-2.5 py-1 text-xs font-medium text-zinc-400">
        <Ban className="h-3.5 w-3.5" />
        {t("Cancelled")}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />

      {status === "queued"
        ? t("Queued")
        : t("Running")}
    </span>
  );
}

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}
