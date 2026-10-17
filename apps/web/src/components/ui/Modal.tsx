"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({ label, onClose, closeDisabled = false, children }: {
  label: string;
  onClose: () => void;
  closeDisabled?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return <dialog ref={ref} aria-label={label} onCancel={(event) => {
    event.preventDefault();
    if (!closeDisabled) onClose();
  }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-auto border-0 bg-zinc-950/95 p-4 text-white backdrop:bg-black/80 sm:p-8">
    {children}
  </dialog>;
}
