"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  Flame,
  Gauge,
  Loader2,
  MessageCircle,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  telefone_normalizado: string | null;
  email: string | null;
  origem: string | null;
  campanha: string | null;
  status: string;
  etapa: string;
  temperatura: string;
  veiculo_interesse: string | null;
  observacao: string | null;
  data_primeiro_contato: string | null;
  data_ultimo_contato: string | null;
  data_proxima_acao: string | null;
  arquivado: boolean;
  venda_pendente_validacao: boolean;
  venda_validada: boolean;
  criado_em: string;
  atualizado_em: string;
  responsavel_id?: string | null;
  atendente_resgate_id?: string | null;
  vendedor_c2s_id?: string | null;
  vendedor_c2s_nome?: string | null;
  loja_carteira_c2s_nome?: string | null;
  loja_visita_nome?: string | null;
};

type InteracaoResumo = {
  lead_id: string;
  tipo: string;
  canal: string;
  resultado: string | null;
  observacao: string | null;
  criado_em: string;
};

type KanbanFunil = {
  id: string;
  nome: string;
  descricao: string | null;
  escopo: string;
  padrao: boolean;
};

type KanbanColuna = {
  id: string;
  funil_id: string;
  chave: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  cor: string;
  ordem: number;
  ativa: boolean;
  exige_confirmacao: boolean;
  exige_observacao: boolean;
  exige_proxima_acao: boolean;
  etapa_venda: boolean;
  etapa_final: boolean;
  bloqueada_operador: boolean;
};

type Usuario = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string | null;
};

type Props = {
  leadsIniciais?: Lead[];
  ultimasPorLead?: Record<string, InteracaoResumo>;
  colunasIniciais?: KanbanColuna[];
  funilAtual?: KanbanFunil;
  usuario: Usuario;
  visaoInicial?: "funil" | "minhas" | "vendas";
};

const colunasFallback: KanbanColuna[] = [
  {
    id: "fallback-novo",
    funil_id: "fallback",
    chave: "novo",
    titulo: "Entrada",
    subtitulo: "Novo lead",
    descricao: "Lead recém-chegado ou sem avanço.",
    cor: "slate",
    ordem: 10,
    ativa: true,
    exige_confirmacao: true,
    exige_observacao: false,
    exige_proxima_acao: false,
    etapa_venda: false,
    etapa_final: false,
    bloqueada_operador: false,
  },
  {
    id: "fallback-contato",
    funil_id: "fallback",
    chave: "contato",
    titulo: "Abordagem",
    subtitulo: "Contato ativo",
    descricao: "Primeira abordagem e tentativas.",
    cor: "blue",
    ordem: 20,
    ativa: true,
    exige_confirmacao: true,
    exige_observacao: true,
    exige_proxima_acao: true,
    etapa_venda: false,
    etapa_final: false,
    bloqueada_operador: false,
  },
  {
    id: "fallback-agendado",
    funil_id: "fallback",
    chave: "agendado",
    titulo: "Agendado",
    subtitulo: "Visita ou retorno",
    descricao: "Lead com agenda definida.",
    cor: "orange",
    ordem: 30,
    ativa: true,
    exige_confirmacao: true,
    exige_observacao: true,
    exige_proxima_acao: true,
    etapa_venda: false,
    etapa_final: false,
    bloqueada_operador: false,
  },
  {
    id: "fallback-venda",
    funil_id: "fallback",
    chave: "venda_pendente",
    titulo: "Venda pendente",
    subtitulo: "Validar fechamento",
    descricao: "Etapa comercial de validação.",
    cor: "emerald",
    ordem: 40,
    ativa: true,
    exige_confirmacao: true,
    exige_observacao: true,
    exige_proxima_acao: false,
    etapa_venda: true,
    etapa_final: false,
    bloqueada_operador: true,
  },
];

const cores: Record<string, { dot: string; soft: string; border: string; bar: string }> = {
  slate: { dot: "bg-slate-500", soft: "bg-slate-50 text-slate-700", border: "border-slate-200", bar: "bg-slate-500" },
  blue: { dot: "bg-blue-600", soft: "bg-blue-50 text-blue-700", border: "border-blue-100", bar: "bg-blue-600" },
  sky: { dot: "bg-sky-500", soft: "bg-sky-50 text-sky-700", border: "border-sky-100", bar: "bg-sky-500" },
  violet: { dot: "bg-violet-600", soft: "bg-violet-50 text-violet-700", border: "border-violet-100", bar: "bg-violet-600" },
  purple: { dot: "bg-purple-600", soft: "bg-purple-50 text-purple-700", border: "border-purple-100", bar: "bg-purple-600" },
  orange: { dot: "bg-orange-500", soft: "bg-orange-50 text-orange-700", border: "border-orange-100", bar: "bg-orange-500" },
  amber: { dot: "bg-amber-500", soft: "bg-amber-50 text-amber-700", border: "border-amber-100", bar: "bg-amber-500" },
  emerald: { dot: "bg-emerald-600", soft: "bg-emerald-50 text-emerald-700", border: "border-emerald-100", bar: "bg-emerald-600" },
  green: { dot: "bg-green-600", soft: "bg-green-50 text-green-700", border: "border-green-100", bar: "bg-green-600" },
  red: { dot: "bg-red-600", soft: "bg-red-50 text-red-700", border: "border-red-100", bar: "bg-red-600" },
};

function cor(corColuna: string) {
  return cores[corColuna] || cores.blue;
}

function normalizarTexto(valor: string | null | undefined) {
  if (!valor) return "Não informado";
  return valor
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatarData(valor: string | null) {
  if (!valor) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function diasEmAberto(valor: string | null) {
  if (!valor) return "Sem data";
  const criado = new Date(valor).getTime();
  const dias = Math.max(0, Math.floor((Date.now() - criado) / 86400000));
  if (dias === 0) return "hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function isAtrasado(valor: string | null) {
  if (!valor) return false;
  return new Date(valor).getTime() < Date.now();
}

function isHoje(valor: string | null) {
  if (!valor) return false;
  const data = new Date(valor);
  const hoje = new Date();
  return data.getDate() === hoje.getDate() && data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
}

function labelResultado(valor: string | null) {
  const mapa: Record<string, string> = {
    nao_atendeu: "Não atendeu",
    sem_resposta: "Sem resposta",
    falou_sem_interesse: "Sem interesse agora",
    pediu_retorno: "Pediu retorno",
    pediu_simulacao: "Pediu simulação",
    quer_ver_veiculo: "Quer ver veículo",
    agendou_visita: "Agendou visita",
    visitou_loja: "Visitou loja",
    venda_pendente: "Venda pendente",
    observacao: "Observação",
  };
  if (!valor) return "Sem resultado";
  return mapa[valor] || normalizarTexto(valor);
}

function prioridadeLead(lead: Lead) {
  if (lead.venda_pendente_validacao) return 1;
  if (lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)) return 2;
  if (lead.temperatura === "quente") return 3;
  if (!lead.data_primeiro_contato) return 4;
  return 9;
}

function corCard(lead: Lead) {
  if (lead.venda_pendente_validacao) return "border-l-emerald-500";
  if (lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)) return "border-l-red-500";
  if (lead.temperatura === "quente") return "border-l-orange-500";
  if (!lead.data_primeiro_contato) return "border-l-purple-500";
  return "border-l-blue-500";
}

function chipPrioridade(lead: Lead) {
  if (lead.venda_pendente_validacao) return { texto: "Venda", classe: "border-emerald-100 bg-emerald-50 text-emerald-700" };
  if (lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)) return { texto: "Atrasado", classe: "border-red-100 bg-red-50 text-red-700" };
  if (lead.temperatura === "quente") return { texto: "Quente", classe: "border-orange-100 bg-orange-50 text-orange-700" };
  if (!lead.data_primeiro_contato) return { texto: "1º contato", classe: "border-purple-100 bg-purple-50 text-purple-700" };
  return { texto: "Ativo", classe: "border-slate-200 bg-slate-50 text-slate-600" };
}

function etapaTitulo(colunas: KanbanColuna[], etapaId: string) {
  return colunas.find((etapa) => etapa.chave === etapaId)?.titulo || normalizarTexto(etapaId);
}

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "supervisor", "gerente", "suporte"].includes(String(perfil || "").toLowerCase());
}

function telefoneWhatsapp(lead: Lead) {
  const digits = (lead.telefone_normalizado || lead.telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function KpiCard({ titulo, valor, detalhe, icon: Icon, tom }: { titulo: string; valor: number | string; detalhe: string; icon: any; tom: "blue" | "red" | "orange" | "emerald" | "purple" | "slate" }) {
  const estilos = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    red: "border-red-100 bg-red-50 text-red-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tom];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{titulo}</p>
          <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">{valor}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{detalhe}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${estilos}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function KanbanClient({
  leadsIniciais = [],
  ultimasPorLead = {},
  colunasIniciais = [],
  funilAtual = {
    id: "fallback",
    nome: "Funil padrão Flow Sales",
    descricao: "Funil operacional padrão.",
    escopo: "global",
    padrao: true,
  },
  usuario,
  visaoInicial = "funil",
}: Props) {
  const [leads, setLeads] = useState(() =>
    (Array.isArray(leadsIniciais) ? [...leadsIniciais] : []).sort((a, b) => prioridadeLead(a) - prioridadeLead(b))
  );
  const [dragId, setDragId] = useState("");
  const [destino, setDestino] = useState("");
  const [busca, setBusca] = useState("");
  const [temperatura, setTemperatura] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todos");
  const [visao, setVisao] = useState<"funil" | "minhas" | "vendas">(visaoInicial);
  const [modal, setModal] = useState<{
    lead: Lead;
    etapaOrigem: string;
    etapaDestino: string;
    colunaDestino: KanbanColuna;
  } | null>(null);
  const [observacao, setObservacao] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const colunas = useMemo(() => {
    const origem = Array.isArray(colunasIniciais) && colunasIniciais.length > 0 ? colunasIniciais : colunasFallback;
    return [...origem].sort((a, b) => a.ordem - b.ordem);
  }, [colunasIniciais]);

 const podeConfigurar = perfilGestao(usuario?.perfil || "");

  const leadsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return leads.filter((lead) => {
      if (
  visao === "minhas" &&
  lead.responsavel_id !== usuario?.id &&
  lead.atendente_resgate_id !== usuario?.id
) {
  return false;
}
      if (visao === "vendas" && !lead.venda_pendente_validacao) return false;
      if (temperatura !== "todos" && lead.temperatura !== temperatura) return false;
      if (filtroPrioridade === "atrasados" && !(lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao))) return false;
      if (filtroPrioridade === "sem_contato" && lead.data_primeiro_contato) return false;
      if (filtroPrioridade === "vendas" && !lead.venda_pendente_validacao) return false;
      if (!termo) return true;
      const texto = [
        lead.nome,
        lead.telefone,
        lead.email,
        lead.origem,
        lead.campanha,
        lead.veiculo_interesse,
        lead.vendedor_c2s_nome,
        lead.loja_carteira_c2s_nome,
        lead.loja_visita_nome,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return texto.includes(termo);
    });
  }, [busca, filtroPrioridade, leads, temperatura, usuario?.id, visao]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Lead[]>();
    for (const coluna of colunas) mapa.set(coluna.chave, []);
    const primeiraColuna = colunas[0]?.chave || "novo";
    for (const lead of leadsFiltrados) {
      const etapa = mapa.has(lead.etapa) ? lead.etapa : primeiraColuna;
      mapa.get(etapa)?.push(lead);
    }
    return mapa;
  }, [colunas, leadsFiltrados]);

  const totalQuentes = leadsFiltrados.filter((lead) => lead.temperatura === "quente").length;
  const totalAtrasados = leadsFiltrados.filter((lead) => lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)).length;
  const totalVendasPendentes = leadsFiltrados.filter((lead) => lead.venda_pendente_validacao).length;
  const totalSemContato = leadsFiltrados.filter((lead) => !lead.data_primeiro_contato).length;
  const totalAvancados = leadsFiltrados.filter((lead) => {
    const coluna = colunas.find((item) => item.chave === lead.etapa);
    return Boolean(coluna?.etapa_venda || coluna?.etapa_final || ["agendado", "visita"].includes(lead.etapa));
  }).length;
  const taxaAvanco = leadsFiltrados.length ? Math.round((totalAvancados / leadsFiltrados.length) * 100) : 0;

  function iniciarArrasto(id: string) {
    setDragId(id);
    setErro("");
    setSucesso("");
  }

  function soltarNaEtapa(etapaDestino: string) {
    const lead = leads.find((item) => item.id === dragId);
    const colunaDestino = colunas.find((item) => item.chave === etapaDestino);

    setDestino("");
    setDragId("");

    if (!lead || !colunaDestino) return;
    if (lead.etapa === etapaDestino) return;

    if (colunaDestino.bloqueada_operador && !podeConfigurar) {
      setErro("Esta etapa exige validação da supervisão.");
      return;
    }

    setModal({ lead, etapaOrigem: lead.etapa, etapaDestino, colunaDestino });
    setObservacao("");
    setProximaAcao("");
  }

  async function confirmarMovimento() {
    if (!modal) return;

    if (modal.colunaDestino.exige_observacao && !observacao.trim()) {
      setErro("Esta etapa exige observação para confirmar a movimentação.");
      return;
    }

    if (modal.colunaDestino.exige_proxima_acao && !proximaAcao.trim()) {
      setErro("Esta etapa exige próxima ação para confirmar a movimentação.");
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/leads/mover-etapa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: modal.lead.id,
          etapa_destino: modal.etapaDestino,
          observacao,
          data_proxima_acao: proximaAcao,
          funil_id: funilAtual.id,
        }),
      });

      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(dados?.erro || "Não foi possível mover o lead.");

      setLeads((atuais) =>
        atuais.map((lead) =>
          lead.id === modal.lead.id
            ? {
                ...lead,
                ...(dados.lead || {}),
                etapa: dados.lead?.etapa || modal.etapaDestino,
                data_proxima_acao: dados.lead?.data_proxima_acao || proximaAcao || lead.data_proxima_acao,
                atualizado_em: new Date().toISOString(),
              }
            : lead
        )
      );

      setSucesso("Lead movimentado com sucesso.");
      setModal(null);
      setObservacao("");
      setProximaAcao("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível mover o lead.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Flow Sales CRM</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Kanban de oportunidades</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Funil atual: <strong>{funilAtual.nome}</strong>. Movimente oportunidades com regra, histórico e próxima ação.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {podeConfigurar ? (
                <Link href="/dashboard/configuracoes/kanban" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100">
                  <Settings className="h-4 w-4" />
                  Configurar funil
                </Link>
              ) : null}
              <Link href="/dashboard/leads/tarefas" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800">
                Minhas tarefas
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard/agenda" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
                Agenda
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard titulo="Leads" valor={leadsFiltrados.length} detalhe="No filtro atual" icon={Users} tom="slate" />
          <KpiCard titulo="Quentes" valor={totalQuentes} detalhe="Prioridade comercial" icon={Flame} tom="red" />
          <KpiCard titulo="Atrasados" valor={totalAtrasados} detalhe="Precisam retorno" icon={AlertTriangle} tom="orange" />
          <KpiCard titulo="Venda pendente" valor={totalVendasPendentes} detalhe="Validação comercial" icon={ShieldCheck} tom="emerald" />
          <KpiCard titulo="Avanço" valor={`${taxaAvanco}%`} detalhe="Etapas avançadas" icon={TrendingUp} tom="blue" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[auto_1fr_auto_auto] xl:items-center">
            <div className="flex flex-wrap gap-2">
              {[
                { chave: "funil", label: "Funil completo" },
                { chave: "minhas", label: "Minhas oportunidades" },
                { chave: "vendas", label: "Vendas pendentes" },
              ].map((item) => (
                <button key={item.chave} type="button" onClick={() => setVisao(item.chave as any)} className={`h-10 rounded-xl px-4 text-xs font-black transition ${visao === item.chave ? "bg-blue-700 text-white shadow-lg shadow-blue-700/20" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  {item.label}
                </button>
              ))}
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente, telefone, veículo, vendedor, loja..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            </label>

            <select value={temperatura} onChange={(event) => setTemperatura(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none">
              <option value="todos">Temperatura</option>
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </select>

            <select value={filtroPrioridade} onChange={(event) => setFiltroPrioridade(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none">
              <option value="todos">Todos</option>
              <option value="atrasados">Atrasados</option>
              <option value="sem_contato">Sem contato</option>
              <option value="vendas">Vendas pendentes</option>
            </select>
          </div>
        </section>

        {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">{erro}</div> : null}
        {sucesso ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">{sucesso}</div> : null}

        <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Gauge className="h-5 w-5 text-blue-700" />Diagnóstico</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
              {totalAtrasados > 0
                ? `${totalAtrasados} oportunidade(s) com retorno atrasado. Priorize antes de avançar novas negociações.`
                : totalQuentes > 0
                  ? `${totalQuentes} oportunidade(s) quentes. Acelere contato, visita, simulação ou proposta.`
                  : "Funil sem alerta crítico no filtro atual."}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Filter className="h-5 w-5 text-blue-700" />Operação integrada</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              O Kanban registra etapa, próxima ação e observação. As movimentações ficam preparadas para sincronização com C2S, integrações de chamada e histórico do lead.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">Funil de atendimento</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Arraste o card para alterar etapa. Regras do funil são aplicadas antes de salvar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{colunas.length} colunas</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{leadsFiltrados.length} leads</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="grid gap-4" style={{ minWidth: `${Math.max(colunas.length, 1) * 292}px`, gridTemplateColumns: `repeat(${Math.max(colunas.length, 1)}, minmax(276px, 1fr))` }}>
              {colunas.map((coluna) => {
                const itens = grupos.get(coluna.chave) || [];
                const quentes = itens.filter((lead) => lead.temperatura === "quente").length;
                const atrasados = itens.filter((lead) => lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)).length;
                const config = cor(coluna.cor);

                return (
                  <div key={coluna.id} onDragOver={(event) => { event.preventDefault(); setDestino(coluna.chave); }} onDragLeave={() => setDestino("")} onDrop={(event) => { event.preventDefault(); soltarNaEtapa(coluna.chave); }} className={`flex max-h-[calc(100vh-260px)] flex-col rounded-3xl border bg-white shadow-sm transition ${destino === coluna.chave ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-200"}`}>
                    <div className="sticky top-0 z-10 overflow-hidden rounded-t-3xl border-b border-slate-100 bg-white">
                      <div className={`h-1.5 ${config.bar}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`h-4 w-4 rounded-full ${config.dot}`} />
                              <h2 className="text-base font-black text-slate-950">{coluna.titulo}</h2>
                            </div>
                            <p className="mt-1 text-xs font-bold text-slate-500">{coluna.subtitulo || coluna.descricao || "Etapa do funil"}</p>
                          </div>
                          <div className={`rounded-xl px-2.5 py-1 text-xs font-black ${config.soft}`}>{itens.length}</div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-slate-50 p-2 text-center"><p className="text-sm font-black text-slate-950">{itens.length}</p><p className="text-[9px] font-black uppercase text-slate-400">Total</p></div>
                          <div className="rounded-xl bg-red-50 p-2 text-center"><p className="text-sm font-black text-red-700">{quentes}</p><p className="text-[9px] font-black uppercase text-red-400">Quentes</p></div>
                          <div className="rounded-xl bg-orange-50 p-2 text-center"><p className="text-sm font-black text-orange-700">{atrasados}</p><p className="text-[9px] font-black uppercase text-orange-400">Atrasos</p></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 overflow-y-auto bg-slate-50/70 p-3">
                      {itens.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-xs font-bold text-slate-400">Arraste uma oportunidade para cá.</div>
                      ) : (
                        itens.slice(0, 45).map((lead) => {
                          const chip = chipPrioridade(lead);
                          const ultima = ultimasPorLead[lead.id];
                          const whatsapp = telefoneWhatsapp(lead);

                          return (
                            <article key={lead.id} draggable onDragStart={() => iniciarArrasto(lead.id)} className={`group cursor-grab rounded-2xl border border-l-4 ${corCard(lead)} border-slate-200 bg-white p-3.5 shadow-sm transition active:cursor-grabbing hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/5`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <Link href={`/dashboard/leads/${lead.id}`} className="line-clamp-1 text-sm font-black leading-5 text-slate-950 transition hover:text-blue-700">{lead.nome}</Link>
                                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{lead.veiculo_interesse || lead.origem || "Sem veículo informado"}</p>
                                </div>
                                {lead.temperatura === "quente" ? <Flame className="h-4 w-4 shrink-0 text-orange-600" /> : null}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${chip.classe}`}>{chip.texto}</span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500">{diasEmAberto(lead.criado_em)}</span>
                                {lead.data_proxima_acao && isHoje(lead.data_proxima_acao) ? <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">Hoje</span> : null}
                              </div>

                              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500">
                                <p className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-blue-700" />{lead.telefone}</p>
                                <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Vendedor C2S</p><p className="mt-0.5 line-clamp-1 text-xs font-black text-slate-700">{lead.vendedor_c2s_nome || "Não vinculado"}</p></div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Próxima ação</p><p className={`mt-0.5 text-xs font-black ${isAtrasado(lead.data_proxima_acao) ? "text-red-700" : "text-slate-700"}`}>{formatarData(lead.data_proxima_acao)}</p></div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Último resultado</p><p className="mt-0.5 line-clamp-1 text-xs font-black text-slate-700">{ultima ? labelResultado(ultima.resultado) : "Sem histórico"}</p></div>
                              </div>

                              <div className="mt-3 grid grid-cols-3 gap-1.5">
                                <a href={`tel:${lead.telefone}`} className="inline-flex h-8 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-2 text-[10px] font-black text-blue-700 transition hover:bg-blue-100">Ligar</a>
                                {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-2 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100">Whats</a> : <span />}
                                <Link href={`/dashboard/leads/${lead.id}`} className="inline-flex h-8 items-center justify-center rounded-xl bg-slate-950 px-2 text-[10px] font-black text-white transition hover:bg-blue-700">Abrir</Link>
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {modal ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Confirmar movimentação</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Mover oportunidade</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Confirme os dados antes de alterar a etapa.</p>
                </div>
                <button type="button" onClick={() => setModal(null)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid gap-5 px-6 py-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">{modal.lead.nome}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{modal.lead.telefone}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">De</p><p className="mt-1 text-sm font-black text-slate-900">{etapaTitulo(colunas, modal.etapaOrigem)}</p></div>
                    <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-blue-600">Para</p><p className="mt-1 text-sm font-black text-blue-900">{modal.colunaDestino.titulo}</p></div>
                  </div>
                </div>

                {(modal.colunaDestino.exige_observacao || modal.colunaDestino.exige_proxima_acao || modal.colunaDestino.etapa_venda) ? <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm font-semibold leading-6 text-orange-800">Esta etapa possui regra de controle. Confirme as informações antes de salvar.</div> : null}

                <label className="grid gap-2"><span className="text-sm font-black text-slate-800">Próxima ação {modal.colunaDestino.exige_proxima_acao ? "(obrigatória)" : ""}</span><input type="datetime-local" value={proximaAcao} onChange={(event) => setProximaAcao(event.target.value)} className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></label>
                <label className="grid gap-2"><span className="text-sm font-black text-slate-800">Observação da movimentação {modal.colunaDestino.exige_observacao ? "(obrigatória)" : ""}</span><textarea value={observacao} onChange={(event) => setObservacao(event.target.value)} rows={4} placeholder="Ex: Cliente confirmou visita, pediu simulação, avançou para proposta..." className="resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></label>

                {erro ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</div> : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setModal(null)} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100">Cancelar</button>
                <button type="button" onClick={confirmarMovimento} disabled={salvando} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Confirmar mudança</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
