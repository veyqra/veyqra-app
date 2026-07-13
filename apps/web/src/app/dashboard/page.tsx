import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  ImageIcon,
  Layers3,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Dashboard
          </h1>

          <p className="mt-2 text-muted-foreground">
            Welcome back to Vyrra.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <StatCard
            title="Backend"
            value="Offline"
            subtitle="Waiting for API"
            icon={Database}
          />

          <StatCard
            title="GPU"
            value="Not Connected"
            subtitle="Local Machine"
            icon={Cpu}
          />

          <StatCard
            title="Queue"
            value="0"
            subtitle="Running Jobs"
            icon={Activity}
          />

          <StatCard
            title="Images"
            value="0"
            subtitle="Generated"
            icon={ImageIcon}
          />

          <StatCard
            title="Models"
            value="0"
            subtitle="Installed"
            icon={Layers3}
          />

          <StatCard
            title="Storage"
            value="--"
            subtitle="Disk Usage"
            icon={HardDrive}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-2xl font-semibold">
            Welcome to Vyrra
          </h2>

          <p className="mt-4 text-muted-foreground">
            Vyrra is your AI workstation for image generation,
            LoRA training and cloud deployment.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
