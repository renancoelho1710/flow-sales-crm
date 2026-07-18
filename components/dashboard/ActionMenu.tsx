"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionMenu({ items, label = "Abrir ações" }: { items: ActionMenuItem[]; label?: string }) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });

  function abrir() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const largura = 220;
    const left = Math.min(Math.max(12, rect.right - largura), window.innerWidth - largura - 12);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 20);
    setPosicao({ top, left });
    setAberto((valor) => !valor);
  }

  useEffect(() => {
    function fechar(event: MouseEvent) {
      const alvo = event.target as Node;
      if (buttonRef.current?.contains(alvo) || menuRef.current?.contains(alvo)) return;
      setAberto(false);
    }

    function esc(event: KeyboardEvent) {
      if (event.key === "Escape") setAberto(false);
    }

    window.addEventListener("mousedown", fechar);
    window.addEventListener("keydown", esc);
    window.addEventListener("scroll", () => setAberto(false), true);
    window.addEventListener("resize", () => setAberto(false));

    return () => {
      window.removeEventListener("mousedown", fechar);
      window.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", () => setAberto(false), true);
      window.removeEventListener("resize", () => setAberto(false));
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={abrir}
        aria-label={label}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {aberto ? (
        <div
          ref={menuRef}
          className="fixed z-[9999] w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl shadow-slate-900/18"
          style={{ top: posicao.top, left: posicao.left }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setAberto(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                item.danger ? "text-red-700 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.icon ? <span className="flex h-5 w-5 items-center justify-center">{item.icon}</span> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
