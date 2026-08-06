import Link from "next/link";

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black shadow-lg shadow-violet-600/30">
        V
      </div>

      <div>
        <h1 className="text-xl font-bold">Vyrra</h1>

        <p className="text-xs text-zinc-400">
          Create. Train. Deploy.
        </p>
      </div>
    </Link>
  );
}
