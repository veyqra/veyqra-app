"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ImagePlus,
  BrainCircuit,
  Boxes,
  History,
  Cloud,
  Store,
  Settings,
} from "lucide-react";

import { Logo } from "./Logo";

import { navigation } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          if (item.disabled) {
            return (
              <div
                key={item.title}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-sm text-muted-foreground opacity-50"
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
                <span className="ml-auto rounded bg-border px-2 py-0.5 text-[10px] uppercase">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs text-muted-foreground">Version</p>
          <p className="mt-1 font-semibold">v0.1.0-alpha</p>
        </div>
      </div>
    </aside>
  );
}
