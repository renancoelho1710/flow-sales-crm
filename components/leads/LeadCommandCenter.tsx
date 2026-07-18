"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

type LeadCommandCenterProps = {
  nome: string;
  telefone: string;
  email: string | null;
  veiculo: string | null;
  temperatura: string;
  etapa: string;
  whatsapp: string;
  vendedor: string | null;
  emAtividade: string;
  proximaAcao: string;
  proximaAcaoAtrasada: boolean;
  totalInteracoes: number;
  ultimoResultado: string;
  situacao: string;
  sugestao: string;
  risco: string;
  vendaPendente: boolean;
  vendaValidada: boolean;
  onIniciarLigacao: () => void;
  onIniciarWhatsapp: () => void;
  onRegistrar: () => void;
  onAgendar: () => void;
};

function normalizarTexto(valor: string | null | undefined) {
  if (!valor) return "Não informado";

  return valor
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function temperaturaClass(valor: string) {
  const temperatura = valor.toLowerCase();

  if (temperatura.includes("quente")) {
    return "border-red-200/80 bg-red-50 text-red-700";
  }

  if (temperatura.includes("frio")) {
    return "border-sky-200/80 bg-sky-50 text-sky-700";
  }

  return "border-amber-200/80 bg-amber-50 text-amber-700";
}

function etapaClass(valor: string) {
  const etapa = valor.toLowerCase();

  if (etapa.includes("venda") || etapa.includes("ganho")) {
    return "border-emerald-200/80 bg-emerald-50 text-emerald-700";
  }

  if (etapa.includes("agend")) {
    return "border-blue-200/80 bg-blue-50 text-blue-700";
  }

  if (etapa.includes("arquiv")) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-violet-200/80 bg-violet-50 text-violet-700";
}

export function LeadCommandCenter({
  nome,
  telefone,
  email,
  veiculo,
  temperatura,
  etapa,
  whatsapp,
  vendedor,
  emAtividade,
  proximaAcao,
  proximaAcaoAtrasada,
  totalInteracoes,
  ultimoResultado,
  situacao,
  sugestao,
  risco,
  vendaPendente,
  vendaValidada,
  onIniciarLigacao,
  onIniciarWhatsapp,
  onRegistrar,
  onAgendar,
}: LeadCommandCenterProps) {
  const riscoCritico = risco !== "Sem alerta crítico";

  return (
    <section className="flow-lead-command-center mb-5">
      <div className="flow-lead-command-surface overflow-hidden rounded-[30px] border border-white/85 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <div className="border-b border-slate-200/70 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard/leads"
              className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
              Leads
            </Link>

            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.10)]" />
              Atendimento em andamento
            </span>
          </div>
        </div>

        <div className="grid gap-7 px-5 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_410px] xl:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Cliente
            </p>
            <h1 className="mt-1 truncate text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-[-0.055em] text-slate-950">
              {nome}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${temperaturaClass(temperatura)}`}>
                {normalizarTexto(temperatura)}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${etapaClass(etapa)}`}>
                {normalizarTexto(etapa)}
              </span>
              {vendaPendente ? (
                <span className="rounded-full border border-orange-200/80 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                  Venda pendente
                </span>
              ) : null}
              {vendaValidada ? (
                <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Venda validada
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" strokeWidth={2} />
                {telefone || "Telefone não informado"}
              </span>
              {email ? (
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                  <span className="truncate">{email}</span>
                </span>
              ) : null}
              <span className="inline-flex min-w-0 items-center gap-2">
                <CarFront className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                <span className="truncate">{veiculo || "Veículo ainda não definido"}</span>
              </span>
            </div>
          </div>

          <div className="flow-lead-action-grid grid grid-cols-2 gap-3">
            <a
              href={`tel:${telefone}`}
              onClick={onIniciarLigacao}
              className="flow-lead-action flow-lead-action-primary group"
            >
              <span className="flow-lead-action-icon">
                <Phone className="h-5 w-5" strokeWidth={2.1} />
              </span>
              <span>
                <strong>Ligar</strong>
                <small>Iniciar contato</small>
              </span>
            </a>

            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                onClick={onIniciarWhatsapp}
                className="flow-lead-action flow-lead-action-whatsapp group"
              >
                <span className="flow-lead-action-icon">
                  <MessageCircle className="h-5 w-5" strokeWidth={2.1} />
                </span>
                <span>
                  <strong>WhatsApp</strong>
                  <small>Abrir conversa</small>
                </span>
              </a>
            ) : (
              <button type="button" disabled className="flow-lead-action flow-lead-action-disabled">
                <span className="flow-lead-action-icon">
                  <MessageCircle className="h-5 w-5" strokeWidth={2.1} />
                </span>
                <span>
                  <strong>WhatsApp</strong>
                  <small>Sem telefone</small>
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onRegistrar}
              className="flow-lead-action flow-lead-action-neutral group"
            >
              <span className="flow-lead-action-icon">
                <UserRoundCheck className="h-5 w-5" strokeWidth={2.1} />
              </span>
              <span>
                <strong>Registrar</strong>
                <small>Salvar resultado</small>
              </span>
            </button>

            <button
              type="button"
              onClick={onAgendar}
              className="flow-lead-action flow-lead-action-neutral group"
            >
              <span className="flow-lead-action-icon">
                <CalendarDays className="h-5 w-5" strokeWidth={2.1} />
              </span>
              <span>
                <strong>Agendar</strong>
                <small>Visita ou retorno</small>
              </span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="flow-lead-guidance-card flex min-w-0 items-start gap-3 rounded-[20px] border border-blue-100/80 bg-white/90 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.25)]">
                <Sparkles className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-blue-600">
                  Próxima melhor ação
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{sugestao}</p>
              </div>
            </div>

            <div className={`rounded-[20px] border p-4 ${riscoCritico ? "border-red-100 bg-red-50/85" : "border-slate-200/80 bg-white/90"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.17em] ${riscoCritico ? "text-red-600" : "text-slate-400"}`}>
                    Situação atual
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{situacao}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${riscoCritico ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                  {risco}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200/70 border-t border-slate-200/70 sm:grid-cols-3 sm:divide-y-0 xl:grid-cols-6">
          <div className="flow-lead-metric">
            <span>Em atividade</span>
            <strong>{emAtividade}</strong>
          </div>
          <div className="flow-lead-metric">
            <span>Próxima ação</span>
            <strong className={proximaAcaoAtrasada ? "text-red-600" : undefined}>{proximaAcao}</strong>
          </div>
          <div className="flow-lead-metric">
            <span>Interações</span>
            <strong>{totalInteracoes}</strong>
          </div>
          <div className="flow-lead-metric">
            <span>Último resultado</span>
            <strong>{ultimoResultado}</strong>
          </div>
          <div className="flow-lead-metric">
            <span>Vendedor</span>
            <strong>{vendedor || "Não definido"}</strong>
          </div>
          <div className="flow-lead-metric">
            <span>Status</span>
            <strong className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-400" strokeWidth={2} />
              {normalizarTexto(etapa)}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
