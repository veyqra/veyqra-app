import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import { AppShell } from "@/components/layout/AppShell";

export default function GeneratePage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">
            Generate
          </h1>

          <p className="mt-2 text-zinc-400">
            Create images locally or with your selected cloud provider.
          </p>
        </header>

        <GenerateWorkspace />
      </div>
    </AppShell>
  );
}
