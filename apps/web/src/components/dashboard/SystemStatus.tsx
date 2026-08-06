import {
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { systemStatus } from "@/lib/demo-data";

export function SystemStatus() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-5 text-xl font-semibold">
        System Status
      </h2>

      <div className="space-y-3">
        {systemStatus.map((system) => (
          <div
            key={system.name}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {system.online ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}

              <span className="font-medium">
                {system.name}
              </span>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                system.online
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {system.online ? "Online" : "Offline"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
