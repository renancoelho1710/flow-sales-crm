"use client";

import { CampanhaAtivaResumo } from "@/components/dashboard/CampanhaAtivaResumo";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Gauge,
  Gift,
  Loader2,
  MessageCircle,
  PartyPopper,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";

export type DashboardVisao = "geral" | "operacional" | "estrategico";

type DashboardData = {
  ok: boolean;
  usuario?: {
    id: string;
    nome: string;
    email: string | null;
    perfil: string | null;
  };
  modo?: "gestao" | "operador";
  metas?: {
    diaria_agendamentos: number;
    hoje_com_acumulado: number;
    pendencia_anterior: number;
    faltam_hoje: number;
    gordura_hoje: number;
    mensal_agendamentos: number;
    mensal_vendas: number;
    percentual_hoje: number;
    percentual_mes: number;
    mensagem: string;
  };
  resumo?: {
    leads_ativos: number;
    agendamentos_hoje: number;
    agendamentos_semana: number;
    agendamentos_mes: number;
    vendas_pendentes: number;
    vendas_confirmadas: number;
    leads_sem_contato: number;
    proximas_acoes_atrasadas: number;
    comissao_prevista: number;
    comissao_confirmada: number;
  };
  serie?: Array<{
    data: string;
    label: string;
    agendamentos: number;
    vendas: number;
  }>;
  proximas_acoes?: Array<{
    id: string;
    nome: string;
    telefone: string | null;
    veiculo_interesse: string | null;
    data_proxima_acao: string | null;
    temperatura: string | null;
    etapa: string | null;
  }>;
  equipe?: Array<{
    id: string;
    nome: string;
    perfil: string | null;
    status_operacional: string | null;
    recebe_leads: boolean;
    agendamentos_mes: number;
    vendas_mes: number;
    meta_mensal_agendamentos: number;
    progresso: number;
  }>;
  status_equipe?: {
    disponiveis: number;
    ocupados: number;
    pausas: number;
    offline: number;
  } | null;
  erro?: string;
};
type WhatsAppPendencia = {
  id: string;
  lead_id: string | null;
  telefone_normalizado: string | null;
  nome_contato: string | null;
  ultima_mensagem_preview: string | null;
  ultima_direcao: string | null;
  atualizado_em: string | null;
  ultima_mensagem_em: string | null;
  minutos_aguardando: number;
  status_operacional_whatsapp: string;
  lead_nome?: string | null;
  lead_veiculo?: string | null;
  mensagem_limpa?: boolean;
};

type WhatsAppPendenciasData = {
  ok: boolean;
  resumo: {
    aguardando_resposta: number;
    aguardando_cliente: number;
    sem_lead: number;
    maior_espera_minutos: number;
  };
  conversas: WhatsAppPendencia[];
  erro?: string;
};

function formatarDinheiro(valor?: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function formatarEspera(minutos?: number) {
  const total = Number(minutos || 0);
  if (total < 1) return "agora";
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

function statusTexto(valor?: string | null) {
  return String(valor || "offline")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function limitarPercentual(valor?: number) {
  return Math.max(0, Math.min(100, Number(valor || 0)));
}

function PremiumCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

function KpiCard({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tom,
  href,
}: {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icon: any;
  tom: "blue" | "emerald" | "orange" | "red" | "purple" | "slate";
  href: string;
}) {
  const tons = {
    blue: "from-blue-50 to-sky-50 text-blue-700 border-blue-100",
    emerald: "from-emerald-50 to-green-50 text-emerald-700 border-emerald-100",
    orange: "from-orange-50 to-amber-50 text-orange-700 border-orange-100",
    red: "from-red-50 to-rose-50 text-red-700 border-red-100",
    purple: "from-violet-50 to-purple-50 text-violet-700 border-violet-100",
    slate: "from-slate-50 to-slate-100 text-slate-700 border-slate-200",
  }[tom];

  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {titulo}
          </p>
          <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">
            {valor}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">{detalhe}</p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br ${tons}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function Confetes({ ativo }: { ativo: boolean }) {
  if (!ativo) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          className="absolute h-2 w-2 animate-bounce rounded-full bg-blue-500 opacity-80"
          style={{
            left: `${8 + ((index * 17) % 84)}%`,
            top: `${8 + ((index * 23) % 64)}%`,
            animationDelay: `${index * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

function TermometroMeta({ data }: { data: DashboardData }) {
  const metas = data.metas;
  const resumo = data.resumo;
  const percentualMes = limitarPercentual(metas?.percentual_mes);
  const percentualHoje = limitarPercentual(metas?.percentual_hoje);
  const metaBatida = Number(metas?.percentual_hoje || 0) >= 100;
  const emoji = metaBatida
    ? "🎉"
    : percentualHoje >= 75
      ? "😄"
      : percentualHoje >= 50
        ? "🙂"
        : "🚀";

  return (
    <PremiumCard className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-5 text-white">
      <Confetes ativo={metaBatida} />
      <div className="relative z-10 grid gap-5 lg:grid-cols-[92px_1fr]">
        <div className="flex items-end justify-center rounded-[24px] border border-white/10 bg-white/10 p-3 backdrop-blur">
          <div className="relative h-[250px] w-12 overflow-hidden rounded-full border border-white/20 bg-white/15 shadow-inner">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-cyan-300 via-blue-400 to-emerald-300 transition-all duration-700"
              style={{ height: `${percentualMes}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">
              {emoji}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">
                Meta evolutiva
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                Seu painel de evolução
              </h2>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 text-right backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100">
                Mês
              </p>
              <p className="text-xl font-black">{percentualMes}%</p>
            </div>
          </div>

          <p className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold leading-6 text-blue-50">
            {metas?.mensagem || "Carregando sua meta operacional."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100">
                Hoje
              </p>
              <p className="mt-1 text-3xl font-black">
                {resumo?.agendamentos_hoje || 0}/
                {metas?.hoje_com_acumulado || 0}
              </p>
              <p className="mt-1 text-xs font-bold text-blue-100">
                {metas?.faltam_hoje
                  ? `Faltam ${metas.faltam_hoje}`
                  : "Meta do dia concluída"}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-cyan-300"
                  style={{ width: `${percentualHoje}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100">
                Gordurinha
              </p>
              <p className="mt-1 text-3xl font-black">
                +{metas?.gordura_hoje || 0}
              </p>
              <p className="mt-1 text-xs font-bold text-blue-100">
                Vantagem para os próximos dias
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-black text-emerald-200">
                <Sparkles className="h-4 w-4" /> Evolução saudável
              </div>
            </div>
          </div>
        </div>
      </div>
    </PremiumCard>
  );
}

function GraficoEvolucao({ serie = [] }: { serie?: DashboardData["serie"] }) {
  const maximo = Math.max(
    1,
    ...(serie || []).flatMap((item) => [item.agendamentos, item.vendas]),
  );

  return (
    <PremiumCard className="p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            Evolução
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Agendamentos e vendas
          </h2>
        </div>
        <Link
          href="/dashboard/relatorios"
          className="inline-flex items-center gap-1 text-xs font-black text-blue-700"
        >
          Relatórios <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex h-[245px] items-end gap-3 rounded-3xl bg-gradient-to-b from-slate-50 to-white p-4">
        {(serie || []).map((item) => {
          const alturaAg = Math.max(8, (item.agendamentos / maximo) * 172);
          const alturaVendas = Math.max(8, (item.vendas / maximo) * 172);
          return (
            <div
              key={item.data}
              className="flex flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="flex h-[180px] items-end gap-1.5">
                <div
                  className="w-5 rounded-t-xl bg-blue-700"
                  style={{ height: `${alturaAg}px` }}
                  title={`${item.agendamentos} agendamento(s)`}
                />
                <div
                  className="w-5 rounded-t-xl bg-emerald-500"
                  style={{ height: `${alturaVendas}px` }}
                  title={`${item.vendas} venda(s)`}
                />
              </div>
              <p className="text-[11px] font-black uppercase text-slate-400">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-black text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-5 rounded-full bg-blue-700" /> Agendamentos
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-5 rounded-full bg-emerald-500" /> Vendas
          confirmadas
        </span>
      </div>
    </PremiumCard>
  );
}

function PainelComissao({ data }: { data: DashboardData }) {
  const resumo = data.resumo;
  return (
    <PremiumCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Comissão
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Resultado financeiro
          </h2>
        </div>
        <WalletCards className="h-8 w-8 text-emerald-600" />
      </div>

      <div className="mt-5 grid gap-3">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
            Confirmada
          </p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
            {formatarDinheiro(resumo?.comissao_confirmada)}
          </p>
          <p className="mt-1 text-xs font-bold text-emerald-700">
            Valor já validado
          </p>
        </div>
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
            Prevista
          </p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
            {formatarDinheiro(resumo?.comissao_prevista)}
          </p>
          <p className="mt-1 text-xs font-bold text-blue-700">
            Aguardando validação
          </p>
        </div>
      </div>
    </PremiumCard>
  );
}

function ListaAcoes({ data }: { data: DashboardData }) {
  const lista = data.proximas_acoes || [];
  return (
    <PremiumCard className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-700">
            Fila inteligente
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Próximas ações
          </h2>
        </div>
        <Link
          href="/dashboard/leads/tarefas"
          className="text-xs font-black text-blue-700"
        >
          Ver tarefas
        </Link>
      </div>

      <div className="grid gap-3">
        {lista.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-500">
            Nenhuma próxima ação crítica agora.
          </div>
        ) : (
          lista.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/leads/${item.id}`}
              className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-black text-slate-950">
                    {item.nome}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
                    {item.veiculo_interesse ||
                      item.telefone ||
                      "Sem veículo informado"}
                  </p>
                </div>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-2 py-1 text-[10px] font-black text-orange-700">
                  {statusTexto(item.temperatura || "morno")}
                </span>
              </div>
              <p className="mt-3 text-xs font-black text-slate-600">
                {formatarDataHora(item.data_proxima_acao)}
              </p>
            </Link>
          ))
        )}
      </div>
    </PremiumCard>
  );
}

function PainelEquipe({ data }: { data: DashboardData }) {
  const equipe = data.equipe || [];
  const status = data.status_equipe;

  return (
    <PremiumCard className="p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            Equipe
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Progresso dos colaboradores
          </h2>
        </div>
        <Link
          href="/dashboard/configuracoes/metas"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-xs font-black text-white"
        >
          Configurar metas <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {status ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-emerald-50 p-3 text-center">
            <p className="text-2xl font-black text-emerald-700">
              {status.disponiveis}
            </p>
            <p className="text-[10px] font-black uppercase text-emerald-600">
              Disponíveis
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-3 text-center">
            <p className="text-2xl font-black text-blue-700">
              {status.ocupados}
            </p>
            <p className="text-[10px] font-black uppercase text-blue-600">
              Ocupados
            </p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-3 text-center">
            <p className="text-2xl font-black text-orange-700">
              {status.pausas}
            </p>
            <p className="text-[10px] font-black uppercase text-orange-600">
              Pausas
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3 text-center">
            <p className="text-2xl font-black text-slate-700">
              {status.offline}
            </p>
            <p className="text-[10px] font-black uppercase text-slate-500">
              Offline
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {equipe.slice(0, 10).map((membro) => {
          const progresso = limitarPercentual(membro.progresso);
          return (
            <div
              key={membro.id}
              className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-black text-slate-950">
                    {membro.nome}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {membro.agendamentos_mes}/{membro.meta_mensal_agendamentos}{" "}
                    agendamentos • {membro.vendas_mes} venda(s)
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                  {statusTexto(membro.status_operacional)}
                </span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}

function WhatsAppPendentesOperadorCard() {
  const [data, setData] = useState<WhatsAppPendenciasData | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregarWhatsApp() {
      try {
        const resposta = await fetch(
          "/api/whatsapp/minhas-pendencias?limite=3",
          { cache: "no-store" },
        );
        const json = (await resposta.json()) as WhatsAppPendenciasData;
        if (ativo && resposta.ok && json.ok) setData(json);
      } catch {
        if (ativo) setData(null);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarWhatsApp();
    const timer = window.setInterval(carregarWhatsApp, 60000);

    return () => {
      ativo = false;
      window.clearInterval(timer);
    };
  }, []);

  const aguardando = data?.resumo?.aguardando_resposta || 0;
  const maiorEspera = data?.resumo?.maior_espera_minutos || 0;
  const conversas = data?.conversas || [];
  const urgente = aguardando > 0;

  return (
    <PremiumCard
      className={`overflow-hidden p-5 ${urgente ? "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-blue-50" : "bg-white"}`}
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${urgente ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"}`}
            >
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                WhatsApp pendente
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {carregando
                  ? "Verificando conversas..."
                  : urgente
                    ? `${aguardando} cliente(s) aguardando resposta`
                    : "Nenhum cliente aguardando agora"}
              </h2>
            </div>
          </div>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            {urgente
              ? `Maior espera: ${formatarEspera(maiorEspera)}. Priorize responder estes clientes no WhatsApp corporativo.`
              : "Quando algum cliente responder no WhatsApp corporativo, ele aparece aqui automaticamente."}
          </p>
        </div>

        <Link
          href="/dashboard/3cx/whatsapp"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15"
        >
          Ver meus WhatsApps <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {conversas.length ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {conversas.map((item) => (
            <Link
              key={item.id}
              href={
                item.lead_id
                  ? `/dashboard/leads/${item.lead_id}`
                  : `/dashboard/whatsapp?conversa=${item.id}`
              }
              className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-black text-slate-950">
                    {item.lead_nome ||
                      item.nome_contato ||
                      item.telefone_normalizado ||
                      "Contato WhatsApp"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">
                    {item.ultima_mensagem_preview ||
                      "Mensagem recebida no WhatsApp"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-700">
                  {formatarEspera(item.minutos_aguardando)}
                </span>
              </div>
              <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-blue-700">
                {item.lead_id ? "Abrir lead" : "Sem lead vinculado"}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </PremiumCard>
  );
}

function DashboardOperador({ data }: { data: DashboardData }) {
  const resumo = data.resumo;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mb-10">
        <CampanhaAtivaResumo />
      </div>
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
              Meu painel
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
              Bom trabalho, {data.usuario?.nome?.split(" ")[0] || "operador"}.
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Sua rotina do dia, metas, comissão e oportunidades prioritárias em
              uma visão única.
            </p>
          </div>
          <Link
            href="/dashboard/kanban/minhas-oportunidades"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20"
          >
            Minhas oportunidades <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <WhatsAppPendentesOperadorCard />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            titulo="Hoje"
            valor={resumo?.agendamentos_hoje || 0}
            detalhe="Agendamentos do dia"
            icon={CalendarCheck2}
            tom="blue"
            href="/dashboard/agenda"
          />
          <KpiCard
            titulo="Semana"
            valor={resumo?.agendamentos_semana || 0}
            detalhe="Ritmo semanal"
            icon={Gauge}
            tom="purple"
            href="/dashboard/agenda?periodo=semana"
          />
          <KpiCard
            titulo="Vendas pendentes"
            valor={resumo?.vendas_pendentes || 0}
            detalhe="Aguardando ADM"
            icon={WalletCards}
            tom="orange"
            href="/dashboard/kanban/vendas-pendentes"
          />
          <KpiCard
            titulo="Confirmadas"
            valor={resumo?.vendas_confirmadas || 0}
            detalhe="Vendas validadas"
            icon={Trophy}
            tom="emerald"
            href="/dashboard/kanban/vendas-feitas"
          />
          <KpiCard
            titulo="Atrasadas"
            valor={resumo?.proximas_acoes_atrasadas || 0}
            detalhe="Retornar primeiro"
            icon={AlertTriangle}
            tom="red"
            href="/dashboard/leads/tarefas"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.62fr]">
          <TermometroMeta data={data} />
          <PainelComissao data={data} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <GraficoEvolucao serie={data.serie} />
          <ListaAcoes data={data} />
        </section>
      </div>
    </main>
  );
}

function DashboardGestao({ data }: { data: DashboardData }) {
  const resumo = data.resumo;
  const metas = data.metas;
  const progressoEquipe = limitarPercentual(metas?.percentual_mes);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mb-10">
        <CampanhaAtivaResumo />
      </div>
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
            <div className="p-6 lg:p-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                Comando comercial
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                Dashboard executivo do Flow Sales
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                Operação, metas, validações, status da equipe, vendas e ações
                críticas em uma tela de gestão.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-3xl bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase text-blue-700">
                    Leads ativos
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {resumo?.leads_ativos || 0}
                  </p>
                </div>
                <div className="rounded-3xl bg-orange-50 p-4">
                  <p className="text-[10px] font-black uppercase text-orange-700">
                    Vendas pendentes
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {resumo?.vendas_pendentes || 0}
                  </p>
                </div>
                <div className="rounded-3xl bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase text-emerald-700">
                    Confirmadas
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {resumo?.vendas_confirmadas || 0}
                  </p>
                </div>
                <div className="rounded-3xl bg-red-50 p-4">
                  <p className="text-[10px] font-black uppercase text-red-700">
                    Ações atrasadas
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {resumo?.proximas_acoes_atrasadas || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white">
              <Confetes ativo={progressoEquipe >= 100} />
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <Target className="h-8 w-8 text-cyan-200" />
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">
                    Equipe
                  </span>
                </div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                  Meta da operação
                </p>
                <p className="mt-2 text-5xl font-black tracking-[-0.08em]">
                  {progressoEquipe}%
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-100">
                  {metas?.mensagem}
                </p>
                <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                    style={{ width: `${progressoEquipe}%` }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] font-black uppercase text-cyan-100">
                      Ag. mês
                    </p>
                    <p className="text-2xl font-black">
                      {resumo?.agendamentos_mes || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] font-black uppercase text-cyan-100">
                      Meta
                    </p>
                    <p className="text-2xl font-black">
                      {metas?.mensal_agendamentos || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            titulo="Agendamentos hoje"
            valor={resumo?.agendamentos_hoje || 0}
            detalhe="Equipe no dia"
            icon={CalendarCheck2}
            tom="blue"
            href="/dashboard/agenda"
          />
          <KpiCard
            titulo="Semana"
            valor={resumo?.agendamentos_semana || 0}
            detalhe="Ritmo comercial"
            icon={Clock3}
            tom="purple"
            href="/dashboard/agenda?periodo=semana"
          />
          <KpiCard
            titulo="Sem contato"
            valor={resumo?.leads_sem_contato || 0}
            detalhe="Primeira ligação"
            icon={PhoneCall}
            tom="red"
            href="/dashboard/leads?filtro=sem-contato"
          />
          <KpiCard
            titulo="Pendentes"
            valor={resumo?.vendas_pendentes || 0}
            detalhe="Validar vendas"
            icon={WalletCards}
            tom="orange"
            href="/dashboard/kanban/vendas-pendentes"
          />
          <KpiCard
            titulo="Confirmadas"
            valor={resumo?.vendas_confirmadas || 0}
            detalhe="No mês"
            icon={Award}
            tom="emerald"
            href="/dashboard/kanban/vendas-feitas"
          />
          <KpiCard
            titulo="Comissão prevista"
            valor={formatarDinheiro(resumo?.comissao_prevista)}
            detalhe="Resgate pendente"
            icon={Gift}
            tom="slate"
            href="/dashboard/relatorios"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <GraficoEvolucao serie={data.serie} />
          <PainelEquipe data={data} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <ListaAcoes data={data} />
          <PremiumCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-700">
                  Ações de gestão
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Fila de decisão
                </h2>
              </div>
              <ShieldCheck className="h-8 w-8 text-blue-700" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Link
                href="/dashboard/kanban/vendas-pendentes"
                className="rounded-3xl border border-orange-100 bg-orange-50 p-4 transition hover:bg-orange-100"
              >
                <p className="text-sm font-black text-slate-950">
                  Validar vendas pendentes
                </p>
                <p className="mt-1 text-xs font-bold text-orange-700">
                  Confirmar, recusar ou devolver para reprocesso.
                </p>
              </Link>
              <Link
                href="/dashboard/usuarios/status"
                className="rounded-3xl border border-blue-100 bg-blue-50 p-4 transition hover:bg-blue-100"
              >
                <p className="text-sm font-black text-slate-950">
                  Acompanhar status da equipe
                </p>
                <p className="mt-1 text-xs font-bold text-blue-700">
                  Disponíveis, pausas, ocupados e offline.
                </p>
              </Link>
              <Link
                href="/dashboard/configuracoes/metas"
                className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 transition hover:bg-emerald-100"
              >
                <p className="text-sm font-black text-slate-950">
                  Configurar metas
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-700">
                  Metas por colaborador, comissão e acumulado.
                </p>
              </Link>
              <Link
                href="/dashboard/configuracoes/integracoes"
                className="rounded-3xl border border-violet-100 bg-violet-50 p-4 transition hover:bg-violet-100"
              >
                <p className="text-sm font-black text-slate-950">Integrações</p>
                <p className="mt-1 text-xs font-bold text-violet-700">
                  C2S, 3CX, WhatsApp e webhooks.
                </p>
              </Link>
            </div>
          </PremiumCard>
        </section>
      </div>
    </main>
  );
}

function DashboardGeralGestao({ data }: { data: DashboardData }) {
  const resumo = data.resumo;
  const metas = data.metas;
  const progressoEquipe = limitarPercentual(metas?.percentual_mes);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mb-10">
        <CampanhaAtivaResumo />
      </div>
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <PremiumCard className="overflow-hidden p-6 lg:p-7">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                  Visão geral
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                  Resumo executivo da operação
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                  Uma leitura rápida da empresa: volume de leads, agenda,
                  vendas, pendências e evolução da meta.
                </p>
              </div>
              <Link
                href="/dashboard/c2s"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20"
              >
                Importar base <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-blue-50 p-4">
                <p className="text-[10px] font-black uppercase text-blue-700">
                  Leads ativos
                </p>
                <p className="mt-2 text-3xl font-black">
                  {resumo?.leads_ativos || 0}
                </p>
                <p className="mt-1 text-xs font-bold text-blue-700">
                  Base em atendimento
                </p>
              </div>
              <div className="rounded-3xl bg-sky-50 p-4">
                <p className="text-[10px] font-black uppercase text-sky-700">
                  Agenda hoje
                </p>
                <p className="mt-2 text-3xl font-black">
                  {resumo?.agendamentos_hoje || 0}
                </p>
                <p className="mt-1 text-xs font-bold text-sky-700">
                  Visitas e retornos
                </p>
              </div>
              <div className="rounded-3xl bg-orange-50 p-4">
                <p className="text-[10px] font-black uppercase text-orange-700">
                  Vendas pendentes
                </p>
                <p className="mt-2 text-3xl font-black">
                  {resumo?.vendas_pendentes || 0}
                </p>
                <p className="mt-1 text-xs font-bold text-orange-700">
                  Validação ADM
                </p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-4">
                <p className="text-[10px] font-black uppercase text-emerald-700">
                  Confirmadas
                </p>
                <p className="mt-2 text-3xl font-black">
                  {resumo?.vendas_confirmadas || 0}
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-700">
                  Resultado validado
                </p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white">
            <Confetes ativo={progressoEquipe >= 100} />
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                Meta geral
              </p>
              <p className="mt-3 text-6xl font-black tracking-[-0.08em]">
                {progressoEquipe}%
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-blue-100">
                {metas?.mensagem || "Acompanhando a meta da operação."}
              </p>
              <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                  style={{ width: `${progressoEquipe}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-[10px] font-black uppercase text-cyan-100">
                    Ag. mês
                  </p>
                  <p className="text-2xl font-black">
                    {resumo?.agendamentos_mes || 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-[10px] font-black uppercase text-cyan-100">
                    Meta
                  </p>
                  <p className="text-2xl font-black">
                    {metas?.mensal_agendamentos || 0}
                  </p>
                </div>
              </div>
            </div>
          </PremiumCard>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            titulo="Semana"
            valor={resumo?.agendamentos_semana || 0}
            detalhe="Ritmo comercial"
            icon={Clock3}
            tom="purple"
            href="/dashboard/agenda?periodo=semana"
          />
          <KpiCard
            titulo="Sem contato"
            valor={resumo?.leads_sem_contato || 0}
            detalhe="Primeira abordagem"
            icon={PhoneCall}
            tom="red"
            href="/dashboard/leads?filtro=sem-contato"
          />
          <KpiCard
            titulo="Atrasadas"
            valor={resumo?.proximas_acoes_atrasadas || 0}
            detalhe="Ações críticas"
            icon={AlertTriangle}
            tom="orange"
            href="/dashboard/leads/tarefas"
          />
          <KpiCard
            titulo="Comissão prevista"
            valor={formatarDinheiro(resumo?.comissao_prevista)}
            detalhe="Pendente de validação"
            icon={Gift}
            tom="slate"
            href="/dashboard/relatorios"
          />
          <KpiCard
            titulo="Kanban"
            valor="Abrir"
            detalhe="Funil comercial"
            icon={WalletCards}
            tom="blue"
            href="/dashboard/kanban"
          />
          <KpiCard
            titulo="Agenda"
            valor="Ver"
            detalhe="Calendário operacional"
            icon={CalendarCheck2}
            tom="emerald"
            href="/dashboard/agenda"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <GraficoEvolucao serie={data.serie} />
          <PainelEquipe data={data} />
        </section>
      </div>
    </main>
  );
}

function DashboardOperacionalGestao({ data }: { data: DashboardData }) {
  const resumo = data.resumo;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mb-10">
        <CampanhaAtivaResumo />
      </div>
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">
              Operacional
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
              Central de ação do dia
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Feita para supervisão acompanhar gargalos: agenda, atrasos, leads
              sem contato, disponibilidade da equipe e decisões urgentes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/agenda"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white"
            >
              Abrir agenda
            </Link>
            <Link
              href="/dashboard/leads/tarefas"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
            >
              Tarefas
            </Link>
          </div>
        </section>

        <WhatsAppPendentesOperadorCard />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            titulo="Hoje"
            valor={resumo?.agendamentos_hoje || 0}
            detalhe="Agendamentos do dia"
            icon={CalendarCheck2}
            tom="blue"
            href="/dashboard/agenda"
          />
          <KpiCard
            titulo="Atrasadas"
            valor={resumo?.proximas_acoes_atrasadas || 0}
            detalhe="Resolver primeiro"
            icon={AlertTriangle}
            tom="red"
            href="/dashboard/leads/tarefas"
          />
          <KpiCard
            titulo="Sem contato"
            valor={resumo?.leads_sem_contato || 0}
            detalhe="Primeiro contato"
            icon={PhoneCall}
            tom="orange"
            href="/dashboard/leads?filtro=sem-contato"
          />
          <KpiCard
            titulo="Vendas pendentes"
            valor={resumo?.vendas_pendentes || 0}
            detalhe="Aprovação ADM"
            icon={ShieldCheck}
            tom="purple"
            href="/dashboard/kanban/vendas-pendentes"
          />
          <KpiCard
            titulo="C2S"
            valor="Importar"
            detalhe="Atualizar base"
            icon={Users}
            tom="slate"
            href="/dashboard/c2s"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <ListaAcoes data={data} />
          <PainelEquipe data={data} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <PremiumCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                  Comando rápido
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  O que olhar agora
                </h2>
              </div>
              <Gauge className="h-8 w-8 text-blue-700" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Link
                href="/dashboard/leads?filtro=sem-contato"
                className="rounded-3xl border border-red-100 bg-red-50 p-4"
              >
                <p className="text-sm font-black text-slate-950">
                  Leads sem primeiro contato
                </p>
                <p className="mt-1 text-xs font-bold text-red-700">
                  Evita perda por demora na abordagem.
                </p>
              </Link>
              <Link
                href="/dashboard/agenda"
                className="rounded-3xl border border-blue-100 bg-blue-50 p-4"
              >
                <p className="text-sm font-black text-slate-950">
                  Agenda do dia
                </p>
                <p className="mt-1 text-xs font-bold text-blue-700">
                  Confirmar visitas e próximos retornos.
                </p>
              </Link>
              <Link
                href="/dashboard/kanban/vendas-pendentes"
                className="rounded-3xl border border-orange-100 bg-orange-50 p-4"
              >
                <p className="text-sm font-black text-slate-950">
                  Vendas aguardando validação
                </p>
                <p className="mt-1 text-xs font-bold text-orange-700">
                  Fecha comissão e resultado do operador.
                </p>
              </Link>
              <Link
                href="/dashboard/usuarios/status"
                className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4"
              >
                <p className="text-sm font-black text-slate-950">
                  Status da equipe
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-700">
                  Disponíveis, pausas e bloqueios.
                </p>
              </Link>
            </div>
          </PremiumCard>
          <GraficoEvolucao serie={data.serie} />
        </section>
      </div>
    </main>
  );
}

function DashboardEstrategicoGestao({ data }: { data: DashboardData }) {
  const resumo = data.resumo;
  const leads = Math.max(1, Number(resumo?.leads_ativos || 0));
  const conversao = Math.round(
    (Number(resumo?.vendas_confirmadas || 0) / leads) * 100,
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mb-10">
        <CampanhaAtivaResumo />
      </div>
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <div className="grid gap-0 xl:grid-cols-[1fr_380px]">
            <div className="p-6 lg:p-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-700">
                Estratégico
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                Inteligência comercial e performance
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                Uma visão de decisão para ADM e supervisão: conversão, meta,
                vendas validadas, comissão, ranking saudável e gargalos do
                funil.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-3xl bg-violet-50 p-4">
                  <p className="text-[10px] font-black uppercase text-violet-700">
                    Conversão estimada
                  </p>
                  <p className="mt-2 text-3xl font-black">{conversao}%</p>
                  <p className="mt-1 text-xs font-bold text-violet-700">
                    Vendas / leads ativos
                  </p>
                </div>
                <div className="rounded-3xl bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase text-emerald-700">
                    Vendas confirmadas
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {resumo?.vendas_confirmadas || 0}
                  </p>
                  <p className="mt-1 text-xs font-bold text-emerald-700">
                    Resultado real
                  </p>
                </div>
                <div className="rounded-3xl bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase text-blue-700">
                    Comissão prevista
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {formatarDinheiro(resumo?.comissao_prevista)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-blue-700">
                    Resgate em validação
                  </p>
                </div>
                <div className="rounded-3xl bg-orange-50 p-4">
                  <p className="text-[10px] font-black uppercase text-orange-700">
                    Pendências
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {resumo?.vendas_pendentes || 0}
                  </p>
                  <p className="mt-1 text-xs font-bold text-orange-700">
                    Decisões em aberto
                  </p>
                </div>
              </div>
            </div>
            <PainelComissao data={data} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <GraficoEvolucao serie={data.serie} />
          <PremiumCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                  Leitura estratégica
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Gargalos comerciais
                </h2>
              </div>
              <Trophy className="h-8 w-8 text-violet-700" />
            </div>
            <div className="grid gap-3">
              <div className="rounded-3xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-black text-slate-950">
                  Ações atrasadas
                </p>
                <p className="mt-1 text-xs font-bold text-red-700">
                  {resumo?.proximas_acoes_atrasadas || 0} retorno(s) precisam de
                  atenção.
                </p>
              </div>
              <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-sm font-black text-slate-950">
                  Vendas pendentes
                </p>
                <p className="mt-1 text-xs font-bold text-orange-700">
                  {resumo?.vendas_pendentes || 0} venda(s) ainda dependem de
                  validação.
                </p>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-black text-slate-950">
                  Leads sem contato
                </p>
                <p className="mt-1 text-xs font-bold text-blue-700">
                  {resumo?.leads_sem_contato || 0} oportunidade(s) ainda sem
                  primeira abordagem.
                </p>
              </div>
            </div>
          </PremiumCard>
        </section>

        <PainelEquipe data={data} />
      </div>
    </main>
  );
}

function DashboardOperacionalOperador({ data }: { data: DashboardData }) {
  const resumo = data.resumo;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mb-10">
        <CampanhaAtivaResumo />
      </div>
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">
              Minha operação
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
              O que fazer agora
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Tela rápida para ligação: próximos retornos, atrasos, agenda do
              dia e oportunidades mais importantes.
            </p>
          </div>
          <Link
            href="/dashboard/leads/tarefas"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white"
          >
            Abrir minhas tarefas
          </Link>
        </section>
        <WhatsAppPendentesOperadorCard />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            titulo="Hoje"
            valor={resumo?.agendamentos_hoje || 0}
            detalhe="Agenda do dia"
            icon={CalendarCheck2}
            tom="blue"
            href="/dashboard/agenda"
          />
          <KpiCard
            titulo="Atrasadas"
            valor={resumo?.proximas_acoes_atrasadas || 0}
            detalhe="Retornar primeiro"
            icon={AlertTriangle}
            tom="red"
            href="/dashboard/leads/tarefas"
          />
          <KpiCard
            titulo="Semana"
            valor={resumo?.agendamentos_semana || 0}
            detalhe="Ritmo atual"
            icon={Gauge}
            tom="purple"
            href="/dashboard/agenda?periodo=semana"
          />
          <KpiCard
            titulo="Pendentes"
            valor={resumo?.vendas_pendentes || 0}
            detalhe="Aguardando ADM"
            icon={WalletCards}
            tom="orange"
            href="/dashboard/kanban/vendas-pendentes"
          />
          <KpiCard
            titulo="Confirmadas"
            valor={resumo?.vendas_confirmadas || 0}
            detalhe="Resultado validado"
            icon={Trophy}
            tom="emerald"
            href="/dashboard/kanban/vendas-feitas"
          />
        </section>
        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <ListaAcoes data={data} />
          <GraficoEvolucao serie={data.serie} />
        </section>
      </div>
    </main>
  );
}

function DashboardEstrategicoOperador({ data }: { data: DashboardData }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mb-10">
        <CampanhaAtivaResumo />
      </div>
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-700">
            Minha evolução
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
            Resultado, meta e comissão
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Uma visão motivacional do seu mês: meta, progresso, comissão
            prevista e vendas confirmadas.
          </p>
        </section>
        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.62fr]">
          <TermometroMeta data={data} />
          <PainelComissao data={data} />
        </section>
        <GraficoEvolucao serie={data.serie} />
      </div>
    </main>
  );
}

export function DashboardClient({
  visaoInicial = "geral",
}: {
  visaoInicial?: DashboardVisao;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setCarregando(true);
        const resposta = await fetch("/api/metas/dashboard", {
          cache: "no-store",
        });
        const json = (await resposta.json()) as DashboardData;

        if (!resposta.ok || !json.ok) {
          throw new Error(
            json.erro || "Não foi possível carregar a dashboard.",
          );
        }

        if (ativo) {
          setData(json);
          setErro("");
        }
      } catch (error) {
        if (ativo)
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao carregar dashboard.",
          );
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950">
        <div className="mb-10">
          <CampanhaAtivaResumo />
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 text-center shadow-xl">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
          <p className="mt-3 text-sm font-black text-slate-600">
            Carregando dashboard comercial...
          </p>
        </div>
      </main>
    );
  }

  if (erro || !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950">
        <div className="mb-10">
          <CampanhaAtivaResumo />
        </div>
        <div className="max-w-lg rounded-[28px] border border-red-200 bg-red-50 px-8 py-7 text-center shadow-xl">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-700" />
          <p className="mt-3 text-sm font-black text-red-700">
            {erro || "Dashboard indisponível."}
          </p>
        </div>
      </main>
    );
  }

  if (data.modo === "gestao") {
    if (visaoInicial === "operacional")
      return <DashboardOperacionalGestao data={data} />;
    if (visaoInicial === "estrategico")
      return <DashboardEstrategicoGestao data={data} />;
    return <DashboardGeralGestao data={data} />;
  }

  if (visaoInicial === "operacional")
    return <DashboardOperacionalOperador data={data} />;
  if (visaoInicial === "estrategico")
    return <DashboardEstrategicoOperador data={data} />;
  return <DashboardOperador data={data} />;
}
