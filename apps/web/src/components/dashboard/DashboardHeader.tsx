import { Sparkles } from "lucide-react";

export function DashboardHeader() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-violet-400">
            <Sparkles className="h-4 w-4" />
            Veyqra AI Workstation
          </div>

          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Veyqra
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Generate images, train LoRAs and manage your local or cloud
            infrastructure from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Provider
            </p>

            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium">Local</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Active Jobs
            </p>

            <p className="mt-1 text-sm font-medium">0 running</p>
          </div>
        </div>
      </div>
    </section>
  );
}
