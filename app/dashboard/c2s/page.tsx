"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Database,
  DownloadCloud,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
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

type EtapaImportacao = {
  titulo: string;
  detalhe: string;
};

const etapasImportacao: EtapaImportacao[] = [
  {
    titulo: "Conectando ao C2S",
    detalhe: "Validando credenciais e preparando a consulta da base.",
  },
  {
    titulo: "Buscando oportunidades",
    detalhe: "Lendo leads retornados pela integração oficial.",
  },
  {
    titulo: "Normalizando dados",
    detalhe: "Tratando telefone, cliente, veículo, vendedor e loja/carteira.",
  },
  {
    titulo: "Comparando com o Flow",
    detalhe: "Identificando leads novos e leads que já existem no CRM.",
  },
  {
    titulo: "Atualizando a base",
    detalhe: "Criando novos registros e atualizando oportunidades existentes.",
  },
  {
    titulo: "Distribuindo atendimento",
    detalhe: "Vinculando leads sem responsável aos operadores disponíveis.",
  },
  {
    titulo: "Finalizando relatório",
    detalhe: "Gerando resumo da importação para conferência.",
  },
];

function CardResultado({
  titulo,
  valor,
  descricao,
  destaque = false,
}: {
  titulo: string;
  valor: number | string;
  descricao: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        destaque
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-black uppercase tracking-wide ${destaque ? "text-blue-700" : "text-slate-400"}`}>
        {titulo}
      </p>
      <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
        {valor}
      </p>
      <p className={`mt-1 text-xs font-bold ${destaque ? "text-blue-700" : "text-slate-500"}`}>
        {descricao}
      </p>
    </div>
  );
}

function LinhaResumo({
  label,
  valor,
  detalhe,
  tom,
}: {
  label: string;
  valor: number;
  detalhe: string;
  tom: "blue" | "emerald" | "orange" | "red" | "slate";
}) {
  const classes = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tom];

  return (
    <div className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[190px_110px_1fr] md:items-center ${classes}`}>
      <p className="text-sm font-black text-slate-950">{label}</p>
      <p className="text-2xl font-black tracking-[-0.04em]">{valor}</p>
      <p className="text-xs font-bold leading-5">{detalhe}</p>
    </div>
  );
}

function etapaStatus(index: number, etapaAtual: number, concluido: boolean) {
  if (concluido) return "concluida";
  if (index < etapaAtual) return "concluida";
  if (index === etapaAtual) return "andamento";
  return "pendente";
}

export default function Page() {
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [erro, setErro] = useState("");
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [inicioImportacao, setInicioImportacao] = useState<Date | null>(null);

  const progresso = useMemo(() => {
    if (resultado) return 100;
    if (!carregando) return 0;
    const total = etapasImportacao.length;
    return Math.min(96, Math.round(((etapaAtual + 1) / total) * 100));
  }, [carregando, etapaAtual, resultado]);

  useEffect(() => {
    if (!carregando) return;

    const intervalo = window.setInterval(() => {
      setEtapaAtual((atual) => {
        if (atual >= etapasImportacao.length - 2) return atual;
        return atual + 1;
      });
    }, 1500);

    return () => window.clearInterval(intervalo);
  }, [carregando]);

  async function importarBase() {
    setCarregando(true);
    setErro("");
    setResultado(null);
    setEtapaAtual(0);
    setInicioImportacao(new Date());

    try {
      const resposta = await fetch("/api/c2s/importar", {
        method: "POST",
        cache: "no-store",
      });

      setEtapaAtual(etapasImportacao.length - 1);

      const dados = (await resposta.json().catch(() => null)) as ResultadoImportacao | null;

      if (!resposta.ok || !dados?.ok) {
        throw new Error(
          dados?.erro ||
            dados?.resposta ||
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
      <div className="mx-auto max-w-[1380px] space-y-5">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
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
                {carregando ? "Importando base..." : "Importar base agora"}
              </button>
            </div>
          </div>

          {(carregando || resultado || erro) ? (
            <div className="border-b border-slate-100 bg-slate-50 p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {resultado ? "Importação concluída" : erro ? "Importação interrompida" : etapasImportacao[etapaAtual]?.titulo}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {resultado
                      ? "Confira abaixo o que entrou, o que atualizou e o que ficou pendente."
                      : erro
                        ? "A importação não foi finalizada. Confira o motivo abaixo."
                        : etapasImportacao[etapaAtual]?.detalhe}
                  </p>
                  {inicioImportacao ? (
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Iniciado em {inicioImportacao.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  ) : null}
                </div>

                <div className="w-full max-w-[460px]">
                  <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                    <span>Progresso</span>
                    <span>{progresso}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        erro ? "bg-red-500" : resultado ? "bg-emerald-500" : "bg-blue-700"
                      }`}
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                </div>
              </div>

              {carregando ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {etapasImportacao.map((etapa, index) => {
                    const status = etapaStatus(index, etapaAtual, Boolean(resultado));
                    return (
                      <div
                        key={etapa.titulo}
                        className={`rounded-2xl border p-4 ${
                          status === "concluida"
                            ? "border-emerald-100 bg-emerald-50"
                            : status === "andamento"
                              ? "border-blue-100 bg-blue-50"
                              : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          {status === "concluida" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                          ) : status === "andamento" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                          ) : (
                            <ClipboardList className="h-4 w-4 text-slate-400" />
                          )}
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Etapa {index + 1}
                          </p>
                        </div>
                        <p className="text-sm font-black text-slate-950">{etapa.titulo}</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{etapa.detalhe}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
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
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-black text-slate-950">
                  Resultado da importação
                </h2>
              </div>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Concluída
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <CardResultado
                titulo="Recebidos"
                valor={resultado.total_recebidos ?? 0}
                descricao="Total retornado pelo C2S"
                destaque
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
            </div>

            <div className="mt-5 grid gap-3">
              <LinhaResumo
                label="Com vendedor C2S"
                valor={resultado.total_com_vendedor_c2s ?? 0}
                detalhe="Leads que vieram com vendedor/carteira identificados no C2S."
                tom="blue"
              />
              <LinhaResumo
                label="Com loja/carteira"
                valor={resultado.total_com_loja_carteira ?? 0}
                detalhe="Leads que vieram com loja ou carteira comercial identificada."
                tom="emerald"
              />
              <LinhaResumo
                label="Distribuídos"
                valor={resultado.total_atribuidos_automaticamente ?? 0}
                detalhe="Leads vinculados automaticamente a operadores disponíveis."
                tom="orange"
              />
              <LinhaResumo
                label="Sem responsável"
                valor={resultado.total_sem_responsavel_disponivel ?? 0}
                detalhe="Leads que ficaram sem operador disponível no momento da importação."
                tom={(resultado.total_sem_responsavel_disponivel ?? 0) > 0 ? "red" : "slate"}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/leads"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-blue-700"
              >
                <Users className="h-4 w-4" />
                Ver leads
              </Link>
              <Link
                href="/dashboard/kanban"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Ver Kanban
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
