"use client";

import {
  Bell,
  Cloud,
  Cpu,
  Moon,
  Search,
  UserCircle2,
} from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-8 backdrop-blur-xl">
      {/* Left */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Dashboard
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Welcome back to Vyrra
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-violet-500 hover:bg-zinc-800">
          <Search size={18} />
        </button>

        {/* GPU Status */}
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2">
          <Cpu size={18} className="text-emerald-400" />

          <div>
            <p className="text-xs text-zinc-500">
              GPU
            </p>

            <p className="text-sm font-medium">
              Local
            </p>
          </div>
        </div>

        {/* AWS */}
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2">
          <Cloud size={18} className="text-sky-400" />

          <div>
            <p className="text-xs text-zinc-500">
              Cloud
            </p>

            <p className="text-sm font-medium">
              My AWS
            </p>
          </div>
        </div>

        {/* Notifications */}
        <button className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-violet-500 hover:bg-zinc-800">
          <Bell size={18} />

          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
        </button>

        {/* Theme */}
        <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-violet-500 hover:bg-zinc-800">
          <Moon size={18} />
        </button>

        {/* User */}
        <button className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 transition hover:border-violet-500">
          <UserCircle2 size={30} />

          <div className="text-left">
            <p className="text-sm font-medium">
              Chris
            </p>

            <p className="text-xs text-zinc-500">
              Local Account
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}
