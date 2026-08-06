"use client";

import {
  Image,
  Brain,
  Cloud,
  Play,
} from "lucide-react";

const actions = [
  {
    title: "Generate Image",
    description: "Create images with Flux or SDXL",
    icon: Image,
  },
  {
    title: "Train LoRA",
    description: "Start a new LoRA training",
    icon: Brain,
  },
  {
    title: "Connect AWS",
    description: "Launch cloud GPU instances",
    icon: Cloud,
  },
  {
    title: "Resume Queue",
    description: "Continue paused jobs",
    icon: Play,
  },
];

export function QuickActions() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Quick Actions</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              className="
                group
                flex
                items-center
                gap-4
                rounded-xl
                border
                border-zinc-800
                bg-zinc-900
                p-5
                text-left
                transition-all
                hover:border-violet-500
                hover:bg-zinc-800
                hover:shadow-lg
                hover:shadow-violet-500/10
              "
            >
              <div className="rounded-lg bg-violet-500/10 p-3 transition-colors group-hover:bg-violet-500/20">
                <Icon className="h-6 w-6 text-violet-400" />
              </div>

              <div>
                <div className="font-medium text-white">
                  {action.title}
                </div>

                <div className="mt-1 text-sm text-zinc-400">
                  {action.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
