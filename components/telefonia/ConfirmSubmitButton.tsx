"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  className?: string;
};

export function ConfirmSubmitButton({
  children,
  title = "Confirmar ação",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  className,
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  function confirmar() {
    setOpen(false);

    const form = buttonRef.current?.closest("form");

    if (form) {
      form.requestSubmit();
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div className="flex items-start gap-3">
                <div
                  className={
                    variant === "danger"
                      ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-200 bg-red-50 text-red-700"
                      : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-700"
                  }
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                    {message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                onClick={confirmar}
                className={
                  variant === "danger"
                    ? "inline-flex h-11 items-center justify-center rounded-xl bg-red-700 px-5 text-sm font-black text-white shadow-lg shadow-red-700/20 hover:bg-red-800"
                    : "inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                }
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
