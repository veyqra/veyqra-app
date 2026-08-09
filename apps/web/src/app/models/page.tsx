import { ModelsWorkspace } from "@/components/models/ModelsWorkspace";
import { AppShell } from "@/components/layout/AppShell";

export default function ModelsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">
            Models
          </h1>

          <p className="mt-2 text-zinc-400">
            Browse diffusion models and LoRAs available in
            your local ComfyUI installation.
          </p>
        </header>

        <ModelsWorkspace />
      </div>
    </AppShell>
  );
}
