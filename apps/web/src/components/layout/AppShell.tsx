"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  useEffect(() => {
    if (!isNavigationOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNavigationOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNavigationOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {isNavigationOpen && (
        <div
          id="mobile-navigation"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            onClick={() => setIsNavigationOpen(false)}
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative h-dvh w-72 max-w-[85vw] shadow-2xl shadow-black"
          >
            <Sidebar
              onNavigate={() => setIsNavigationOpen(false)}
            />

            <button
              type="button"
              onClick={() => setIsNavigationOpen(false)}
              aria-label="Close navigation"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-violet-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          isNavigationOpen={isNavigationOpen}
          onOpenNavigation={() => setIsNavigationOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-zinc-950">
          <div className="mx-auto w-full max-w-[1700px] px-4 py-4 sm:px-6 sm:py-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
