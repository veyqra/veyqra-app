import {
  CheckCircle2,
  Cloud,
  ImageIcon,
  UploadCloud,
} from "lucide-react";

const activities = [
  {
    id: 1,
    title: "Flux generation completed",
    description: "Portrait job finished successfully",
    time: "2 min ago",
    icon: CheckCircle2,
    iconClassName: "text-emerald-400",
  },
  {
    id: 2,
    title: "Model uploaded",
    description: "realisticVision.safetensors",
    time: "12 min ago",
    icon: UploadCloud,
    iconClassName: "text-sky-400",
  },
  {
    id: 3,
    title: "AWS connection checked",
    description: "No running GPU instance",
    time: "28 min ago",
    icon: Cloud,
    iconClassName: "text-violet-400",
  },
  {
    id: 4,
    title: "Image added to history",
    description: "Saved locally",
    time: "34 min ago",
    icon: ImageIcon,
    iconClassName: "text-amber-400",
  },
];

export function ActivityFeed() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Activity</h2>

        <button
          type="button"
          className="text-sm font-medium text-violet-400 transition hover:text-violet-300"
        >
          View all
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div className="rounded-lg bg-zinc-900 p-2">
                <Icon className={`h-5 w-5 ${activity.iconClassName}`} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{activity.title}</p>

                <p className="mt-1 truncate text-sm text-zinc-500">
                  {activity.description}
                </p>
              </div>

              <span className="whitespace-nowrap text-xs text-zinc-600">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
