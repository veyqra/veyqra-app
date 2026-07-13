"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Cloud, MoonStar, UserCircle2 } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Welcome to Vyrra
        </h1>

        <p className="text-sm text-muted-foreground">
          Create. Train. Deploy.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Provider */}
        <Badge
          variant="secondary"
          className="flex items-center gap-2 px-3 py-1"
        >
          <Cloud className="h-4 w-4 text-green-500" />
          Local
        </Badge>

        {/* Benachrichtigungen */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {/* Theme (später funktionsfähig) */}
        <Button variant="ghost" size="icon">
          <MoonStar className="h-5 w-5" />
        </Button>

        {/* Benutzer */}
        <Button variant="ghost" className="gap-2">
          <UserCircle2 className="h-5 w-5" />
          <span className="hidden md:inline">
            Guest
          </span>
        </Button>
      </div>
    </header>
  );
}
