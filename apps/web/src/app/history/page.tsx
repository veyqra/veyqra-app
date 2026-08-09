import { HistoryWorkspace } from "@/components/history/HistoryWorkspace";
import { AppShell } from "@/components/layout/AppShell";

export default function HistoryPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">
            History
          </h1>

          <p className="mt-2 text-zinc-400">
            Browse and manage images generated with Vyrra.
          </p>
        </header>

        <HistoryWorkspace />
      </div>
    </AppShell>
  );
}
