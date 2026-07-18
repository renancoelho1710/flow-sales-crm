"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clipboard,
  ExternalLink,
  Loader2,
  Megaphone,
  Settings2,
} from "lucide-react";

type StatusCampanha = "ativa" | "pausada" | "encerrada" | "arquivada";
type SimuladorTipo = "nenhum" | "copa_azul" | "link_externo";

type Campanha = {
  id: string;
  nome: string;
  status: StatusCampanha;
  titulo_publico: string | null;
  imagem_url: string | null;
  resumo_operador: string | null;
  mensagem_whatsapp: string | null;
  link_oficial: string | null;
  mostrar_link_oficial: boolean;
  tem_simulador: boolean;
  simulador_liberado: boolean;
  simulador_tipo: SimuladorTipo;
  link_simulador: string | null;
};

type ApiCampanhas = {
  ok: boolean;
  erro?: string;
  pode_gerenciar?: boolean;
  campanhas?: Campanha[];
};

function resumoCurto(texto?: string | null, limite = 170) {
  const limpo = String(texto || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!limpo) {
    return "Campanha ativa disponível para a operação. Abra para ver os detalhes e usar os materiais prontos.";
  }

  return limpo.length > limite ? `${limpo.slice(0, limite).trim()}...` : limpo;
}

export function CampanhaAtivaResumo() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [podeGerenciar, setPodeGerenciar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setCarregando(true);

        const resposta = await fetch("/api/campanhas", { cache: "no-store" });
        const json = (await resposta.json()) as ApiCampanhas;

        if (!ativo) return;

        if (!resposta.ok || !json.ok) {
          setCampanhas([]);
          setPodeGerenciar(false);
          return;
        }

        setCampanhas(json.campanhas || []);
        setPodeGerenciar(json.pode_gerenciar === true);
      } catch {
        if (!ativo) return;
        setCampanhas([]);
        setPodeGerenciar(false);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  const campanhaAtiva = useMemo(() => {
    return campanhas.find((campanha) => campanha.status === "ativa") || null;
  }, [campanhas]);

  async function copiarMensagem() {
    const texto = String(campanhaAtiva?.mensagem_whatsapp || "").trim();

    if (!texto) {
      setMensagem("Essa campanha ainda não tem mensagem pronta.");
      window.setTimeout(() => setMensagem(""), 2500);
      return;
    }

    await navigator.clipboard.writeText(texto);
    setMensagem("Mensagem da campanha copiada.");
    window.setTimeout(() => setMensagem(""), 2500);
  }

  if (carregando) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
          Carregando campanha ativa...
        </div>
      </section>
    );
  }

  if (!campanhaAtiva) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Megaphone className="h-4 w-4" />
              Campanha ativa
            </p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">
              Nenhuma campanha ativa agora
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Quando uma campanha estiver ativa, ela aparecerá aqui para a
              operação.
            </p>
          </div>

          {podeGerenciar && (
            <Link
              href="/dashboard/campanhas"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-700 px-4 text-sm font-black text-white"
            >
              Gerenciar campanhas
            </Link>
          )}
        </div>
      </section>
    );
  }

  const titulo = campanhaAtiva.titulo_publico || campanhaAtiva.nome;

  const podeAbrirSimulador =
    campanhaAtiva.tem_simulador &&
    (campanhaAtiva.simulador_liberado || podeGerenciar);

  return (
    <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2">
            {campanhaAtiva.imagem_url ? (
              <img
                src={campanhaAtiva.imagem_url}
                alt={titulo}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <Megaphone className="h-8 w-8 text-blue-700" />
            )}
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              <Megaphone className="h-4 w-4" />
              Campanha ativa
            </p>

            <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.05em] text-slate-950">
              {titulo}
            </h2>

            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              {resumoCurto(campanhaAtiva.resumo_operador)}
            </p>

            {mensagem && (
              <p className="mt-2 text-xs font-black text-emerald-700">
                {mensagem}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            href="/dashboard/campanhas"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
            Ver campanha
          </Link>

          <button
            type="button"
            onClick={copiarMensagem}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Clipboard className="h-4 w-4" />
            Copiar mensagem
          </button>

          {podeAbrirSimulador &&
            campanhaAtiva.simulador_tipo === "copa_azul" && (
              <Link
                href={`/dashboard/campanhas/${campanhaAtiva.id}/simulador`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                <Settings2 className="h-4 w-4" />
                Simulador
              </Link>
            )}

          {podeAbrirSimulador &&
            campanhaAtiva.simulador_tipo === "link_externo" &&
            (campanhaAtiva.link_simulador || campanhaAtiva.link_oficial) && (
              <a
                href={
                  campanhaAtiva.link_simulador ||
                  campanhaAtiva.link_oficial ||
                  "#"
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                <Settings2 className="h-4 w-4" />
                Simulador
              </a>
            )}
        </div>
      </div>
    </section>
  );
}
