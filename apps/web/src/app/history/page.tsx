"use client";

import { HistoryWorkspace } from "@/components/history/HistoryWorkspace";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/lib/i18n";

export default function HistoryPage() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">
            {t("History")}
          </h1>

          <p className="mt-2 text-zinc-400">
            {t("Browse and manage images generated with Veyqra.")}
          </p>
        </header>

        <HistoryWorkspace />
      </div>
    </AppShell>
  );
}
