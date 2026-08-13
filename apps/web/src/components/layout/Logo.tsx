import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5"
    >
      <Image
        src="/vyrra-logo.png"
        alt="Vyrra"
        width={48}
        height={48}
        priority
        className="h-12 w-12 rounded-xl object-contain"
      />

      <div className="min-w-0">
        <div className="text-base font-semibold tracking-tight text-white">
          Vyrra
        </div>

        <div className="text-[11px] text-zinc-400">
          Create. Train. Deploy.
        </div>
      </div>
    </Link>
  );
}
