"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TrainingWorkspace } from "@/components/training/TrainingWorkspace";
import { useI18n } from "@/lib/i18n";

export default function TrainPage() {
  const { t } = useI18n();
  return <AppShell><div className="space-y-8"><header><h1 className="text-4xl font-bold tracking-tight">{t("Train")}</h1><p className="mt-2 text-zinc-400">{t("Create datasets and train local LoRAs with AI Toolkit.")}</p></header><TrainingWorkspace /></div></AppShell>;
}
