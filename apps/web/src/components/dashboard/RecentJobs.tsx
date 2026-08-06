import { CheckCircle2, Clock3 } from "lucide-react";

import { recentJobs } from "@/lib/demo-data";

export function RecentJobs() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-5 text-xl font-semibold">
        Recent Jobs
      </h2>

      <div className="space-y-3">
        {recentJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <div className="flex items-center gap-3">
              {job.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Clock3 className="h-5 w-5 text-amber-400" />
              )}

              <div>
                <p className="font-medium">{job.title}</p>

                <p className="text-sm text-zinc-500">
                  {job.status}
                </p>
              </div>
            </div>

            <span className="text-xs text-zinc-500">
              Just now
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
