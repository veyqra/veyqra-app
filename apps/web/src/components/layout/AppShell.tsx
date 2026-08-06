import { ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <TopBar />

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          <div className="mx-auto w-full max-w-[1700px] p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
