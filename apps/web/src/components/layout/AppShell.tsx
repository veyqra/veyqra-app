"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { MobileSidebar } from "./MobileSidebar";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <MobileSidebar
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
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
