"use client";

import { ModelsWorkspace } from "@/components/models/ModelsWorkspace";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/lib/i18n";

export default function ModelsPage() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">
            {t("Models")}
          </h1>

          <p className="mt-2 text-zinc-400">
            {t("Browse diffusion models and LoRAs available in your local ComfyUI installation.")}
          </p>
        </header>

        <ModelsWorkspace />
      </div>
    </AppShell>
  );
}
