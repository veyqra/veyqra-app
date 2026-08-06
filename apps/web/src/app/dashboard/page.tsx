import { AppShell } from "@/components/layout/AppShell";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentJobs } from "@/components/dashboard/RecentJobs";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-10">
        {/* Header */}
        <DashboardHeader />

        {/* Statistics */}
        <StatsGrid />

        {/* Quick Actions */}
        <QuickActions />

        {/* Bottom */}
        <section className="grid gap-6 xl:grid-cols-2">
          {/* Recent Jobs */}
          <RecentJobs />

          {/* System */}
          <SystemStatus />
        </section>
        
        <ActivityFeed />
        
      </div>
    </AppShell>
  );
}

