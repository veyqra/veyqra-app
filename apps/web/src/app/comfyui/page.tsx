"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ComfyUIWorkspace } from "@/components/comfyui/ComfyUIWorkspace";
import { useI18n } from "@/lib/i18n";

export default function ComfyUIPage() {
  const { t } = useI18n();
  return <AppShell>
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">ComfyUI</h1>
        <p className="mt-2 text-zinc-400">{t("Monitor your local runtime and start ComfyUI directly from Veyqra.")}</p>
      </header>
      <ComfyUIWorkspace />
    </div>
  </AppShell>;
}
