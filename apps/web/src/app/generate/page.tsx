"use client";

import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/lib/i18n";

export default function GeneratePage() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">
            {t("Generate")}
          </h1>

          <p className="mt-2 text-zinc-400">
            {t("Create images locally or with your selected cloud provider.")}
          </p>
        </header>

        <GenerateWorkspace />
      </div>
    </AppShell>
  );
}
