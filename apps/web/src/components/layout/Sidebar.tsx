"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ImagePlus,
  BrainCircuit,
  Boxes,
  History,
  ListTodo,
  Cloud,
  Store,
  Settings,
} from "lucide-react";

import { Logo } from "./Logo";

const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Generate",
    href: "/generate",
    icon: ImagePlus,
  },
  {
    title: "Jobs",
    href: "/jobs",
    icon: ListTodo,
  },
  {
    title: "Train",
    href: "/train",
    icon: BrainCircuit,
  },
  {
    title: "Models",
    href: "/models",
    icon: Boxes,
  },
  {
    title: "History",
    href: "/history",
    icon: History,
  },
  {
    title: "Cloud",
    href: "/cloud",
    icon: Cloud,
  },
  {
    title: "Marketplace",
    href: "#",
    icon: Store,
    disabled: true,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="border-b border-zinc-800 px-5 py-5">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            if (item.disabled) {
              return (
                <div
                  key={item.title}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-500 opacity-60"
                >
                  <Icon size={20} />

                  <span>{item.title}</span>

                  <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.title}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon
                  size={20}
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Version
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="font-semibold text-white">0.1.0 Alpha</span>

            <span className="rounded-full bg-violet-600/20 px-2 py-1 text-xs font-medium text-violet-400">
              DEV
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
