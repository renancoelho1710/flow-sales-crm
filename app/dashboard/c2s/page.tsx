"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  DownloadCloud,
  Loader2,
  RefreshCw,
} from "lucide-react";

type ResultadoImportacao = {
  ok: boolean;
  total_recebidos?: number;
  total_importados?: number;
  total_atualizados?: number;
  total_sem_telefone?: number;
  total_com_vendedor_c2s?: number;
  total_com_loja_carteira?: number;
  total_atribuidos_automaticamente?: number;
  total_sem_responsavel_disponivel?: number;
  erro?: string;
  status?: number;
  resposta?: string;
};

function CardResultado({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: number | string;
  descricao: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
        {valor}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-500">{descricao}</p>
    </div>
  );
}

export default function Page() {
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [erro, setErro] = useState("");

  async function importarBase() {
    setCarregando(true);
    setErro("");
    setResultado(null);

    try {
      const resposta = await fetch("/api/c2s/importar", {
        method: "POST",
        cache: "no-store",
      });

      const dados = (await resposta.json().catch(() => null)) as ResultadoImportacao | null;

      if (!resposta.ok || !dados?.ok) {
        throw new Error(
          dados?.erro ||
            "Não foi possível importar a base C2S. Verifique a integração."
        );
      }

      setResultado(dados);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao importar base."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1320px] space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/dashboard/leads"
            className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para CRM
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                Integração C2S
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                Importar base de leads
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Importe oportunidades do C2S para o Flow Sales CRM, mantendo vendedor
                da carteira, loja de origem, veículo de interesse e distribuição para
                atendimento.
              </p>
            </div>

            <button
              type="button"
              onClick={importarBase}
              disabled={carregando}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DownloadCloud className="h-4 w-4" />
              )}
              {carregando ? "Importando..." : "Importar base agora"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <Database className="h-6 w-6 text-blue-700" />
            <p className="mt-3 text-sm font-black text-slate-950">
              Origem C2S
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-blue-700">
              Busca leads direto da integração configurada na API C2S.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
            <p className="mt-3 text-sm font-black text-slate-950">
              Atualização inteligente
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-emerald-700">
              Atualiza leads existentes e cria somente os novos.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
            <RefreshCw className="h-6 w-6 text-orange-700" />
            <p className="mt-3 text-sm font-black text-slate-950">
              Distribuição
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-orange-700">
              Leads sem responsável são atribuídos para usuários disponíveis.
            </p>
          </div>
        </section>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{erro}</span>
            </div>
          </div>
        ) : null}

        {resultado ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-black text-slate-950">
                Importação concluída
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <CardResultado
                titulo="Recebidos"
                valor={resultado.total_recebidos ?? 0}
                descricao="Total retornado pelo C2S"
              />
              <CardResultado
                titulo="Importados"
                valor={resultado.total_importados ?? 0}
                descricao="Novos leads criados"
              />
              <CardResultado
                titulo="Atualizados"
                valor={resultado.total_atualizados ?? 0}
                descricao="Leads já existentes atualizados"
              />
              <CardResultado
                titulo="Sem telefone"
                valor={resultado.total_sem_telefone ?? 0}
                descricao="Ignorados por falta de telefone"
              />
              <CardResultado
                titulo="Com vendedor C2S"
                valor={resultado.total_com_vendedor_c2s ?? 0}
                descricao="Leads com carteira identificada"
              />
              <CardResultado
                titulo="Com loja"
                valor={resultado.total_com_loja_carteira ?? 0}
                descricao="Leads com loja/carteira"
              />
              <CardResultado
                titulo="Distribuídos"
                valor={resultado.total_atribuidos_automaticamente ?? 0}
                descricao="Atribuídos para atendimento"
              />
              <CardResultado
                titulo="Sem responsável"
                valor={resultado.total_sem_responsavel_disponivel ?? 0}
                descricao="Sem operador disponível no momento"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/leads"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-blue-700"
              >
                Ver leads
              </Link>
              <Link
                href="/dashboard/kanban"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Ver Kanban
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}