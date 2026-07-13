import { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
