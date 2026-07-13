import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 select-none"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
        <span className="text-lg font-black tracking-tight">V</span>
      </div>

      <div className="flex flex-col">
        <span className="text-lg font-bold tracking-tight">
          Vyrra
        </span>

        <span className="text-xs text-muted-foreground">
          Create. Train. Deploy.
        </span>
      </div>
    </Link>
  );
}
