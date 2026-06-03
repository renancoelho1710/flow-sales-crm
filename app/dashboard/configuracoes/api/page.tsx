"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Copy,
  DatabaseZap,
  Eye,
  FileClock,
  KeyRound,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Network,
  PhoneCall,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  Webhook,
} from "lucide-react";

type ApiKey = {
  id: string;
  nome: string;
  descricao: string | null;
  prefixo: string;
  escopos: string[];
  ativo: boolean;
  criado_por: string | null;
  revogado_por: string | null;
  ultimo_uso_em: string | null;
  revogado_em: string | null;
  criado_em: string;
  atualizado_em: string;
  chave_completa?: string;
  email_alerta?: { ok: boolean; status: string; erro?: string };
  criador?: {
    id: string;
    nome: string;
    email: string;
    perfil: string;
  } | null;
  auditoria_criacao?: {
    ip?: string | null;
    user_agent?: string | null;
    valor_novo?: any;
    criado_em?: string;
  } | null;
};

type Escopo = {
  chave: string;
  label: string;
  descricao: string;
  sensivel?: boolean;
};

type GrupoEscopo = {
  titulo: string;
  descricao: string;
  icon: any;
  escopos: Escopo[];
};

type ModeloEscopo = {
  chave: string;
  nome: string;
  descricao: string;
  escopos: string[];
};

const gruposEscopos: GrupoEscopo[] = [
  {
    titulo: "Leads e CRM",
    descricao: "Consulta, criação e manutenção de oportunidades comerciais.",
    icon: Users,
    escopos: [
      { chave: "leads:read", label: "Ler leads", descricao: "Consultar dados de leads, filtros e detalhes." },
      { chave: "leads:create", label: "Criar leads", descricao: "Cadastrar novos leads por integração externa.", sensivel: true },
      { chave: "leads:update", label: "Editar leads", descricao: "Atualizar dados, etapa, temperatura e observações.", sensivel: true },
      { chave: "leads:archive", label: "Arquivar leads", descricao: "Arquivar ou reativar oportunidades.", sensivel: true },
      { chave: "leads:assign", label: "Distribuir leads", descricao: "Definir responsável ou atendente de resgate.", sensivel: true },
      { chave: "leads:export", label: "Exportar leads", descricao: "Permitir extração de dados de leads.", sensivel: true },
    ],
  },
  {
    titulo: "Usuários e status",
    descricao: "Consulta e atualização operacional da equipe.",
    icon: ShieldCheck,
    escopos: [
      { chave: "usuarios:read", label: "Ler usuários", descricao: "Consultar usuários, perfis, lojas e status." },
      { chave: "usuarios:update", label: "Editar usuários", descricao: "Atualizar dados administrativos de usuários.", sensivel: true },
      { chave: "usuarios:permissions", label: "Permissões", descricao: "Consultar ou alterar permissões por usuário.", sensivel: true },
      { chave: "status:read", label: "Ler status", descricao: "Consultar disponibilidade e status operacional." },
      { chave: "status:write", label: "Alterar status", descricao: "Alterar disponibilidade, ocupado, offline ou status por integração.", sensivel: true },
      { chave: "status:logs", label: "Logs de status", descricao: "Consultar histórico de mudanças de status." },
    ],
  },
  {
    titulo: "Agenda",
    descricao: "Agendamentos, confirmações e reagendamentos.",
    icon: CalendarDays,
    escopos: [
      { chave: "agenda:read", label: "Ler agenda", descricao: "Consultar agenda, horários e visitas." },
      { chave: "agenda:create", label: "Criar agendamento", descricao: "Criar visitas, retornos e compromissos.", sensivel: true },
      { chave: "agenda:update", label: "Editar agendamento", descricao: "Reagendar, confirmar ou alterar responsáveis.", sensivel: true },
      { chave: "agenda:cancel", label: "Cancelar agendamento", descricao: "Cancelar compromissos e registrar motivo.", sensivel: true },
      { chave: "agenda:notifications", label: "Alertas da agenda", descricao: "Criar ou consultar alertas de presença e atraso." },
    ],
  },
  {
    titulo: "Kanban e funil",
    descricao: "Etapas, cartões e movimentações do funil.",
    icon: LayoutGrid,
    escopos: [
      { chave: "kanban:read", label: "Ler funil", descricao: "Consultar colunas, cards e métricas do funil." },
      { chave: "kanban:move", label: "Mover cards", descricao: "Mover leads entre etapas do funil.", sensivel: true },
      { chave: "kanban:update", label: "Editar cards", descricao: "Atualizar dados operacionais dos cards.", sensivel: true },
      { chave: "kanban:config", label: "Configurar funil", descricao: "Criar, editar ou desativar etapas.", sensivel: true },
    ],
  },
  {
    titulo: "Telefonia 3CX",
    descricao: "Eventos de ligação, ramais e disponibilidade.",
    icon: PhoneCall,
    escopos: [
      { chave: "3cx:status", label: "Enviar status 3CX", descricao: "Alterar status por evento de ligação.", sensivel: true },
      { chave: "3cx:read", label: "Ler eventos 3CX", descricao: "Consultar logs e eventos recebidos." },
      { chave: "3cx:import", label: "Importar relatório 3CX", descricao: "Importar dados operacionais de ligações.", sensivel: true },
      { chave: "3cx:webhook", label: "Webhook 3CX", descricao: "Permitir chamadas de webhook do monitor 3CX.", sensivel: true },
    ],
  },
  {
    titulo: "WhatsApp",
    descricao: "Monitoramento, alertas e eventos de conversas.",
    icon: MessageCircle,
    escopos: [
      { chave: "whatsapp:read", label: "Ler eventos WhatsApp", descricao: "Consultar eventos e alertas do monitor." },
      { chave: "whatsapp:write", label: "Registrar evento WhatsApp", descricao: "Criar eventos de resposta, sem resposta ou alerta.", sensivel: true },
      { chave: "whatsapp:notifications", label: "Notificações WhatsApp", descricao: "Gerar notificações operacionais vinculadas ao WhatsApp." },
    ],
  },
  {
    titulo: "C2S",
    descricao: "Integração com origem de leads e carteira comercial.",
    icon: DatabaseZap,
    escopos: [
      { chave: "c2s:read", label: "Ler C2S", descricao: "Consultar dados e vínculo C2S." },
      { chave: "c2s:import", label: "Importar C2S", descricao: "Executar sincronização/importação de leads.", sensivel: true },
      { chave: "c2s:update", label: "Atualizar C2S", descricao: "Atualizar vínculo e dados de vendedor/carteira.", sensivel: true },
    ],
  },
  {
    titulo: "Relatórios e BI",
    descricao: "Leitura, indicadores e exportações gerenciais.",
    icon: BarChart3,
    escopos: [
      { chave: "relatorios:read", label: "Ler relatórios", descricao: "Consultar indicadores e dashboards." },
      { chave: "relatorios:export", label: "Exportar relatórios", descricao: "Exportar dados gerenciais.", sensivel: true },
      { chave: "relatorios:financeiro", label: "Indicadores financeiros", descricao: "Consultar indicadores sensíveis de receita e ticket.", sensivel: true },
    ],
  },
  {
    titulo: "Configurações e integrações",
    descricao: "Acesso administrativo a regras, integrações e webhooks.",
    icon: Settings,
    escopos: [
      { chave: "config:read", label: "Ler configurações", descricao: "Consultar regras e parâmetros do sistema." },
      { chave: "config:write", label: "Editar configurações", descricao: "Alterar regras operacionais do CRM.", sensivel: true },
      { chave: "integracoes:read", label: "Ler integrações", descricao: "Consultar integrações cadastradas." },
      { chave: "integracoes:write", label: "Editar integrações", descricao: "Alterar tokens, URLs, webhooks e parâmetros.", sensivel: true },
      { chave: "webhooks:read", label: "Ler webhooks", descricao: "Consultar webhooks configurados." },
      { chave: "webhooks:write", label: "Editar webhooks", descricao: "Criar ou alterar webhooks externos.", sensivel: true },
    ],
  },
  {
    titulo: "Auditoria e segurança",
    descricao: "Eventos críticos, auditoria e rastreabilidade.",
    icon: FileClock,
    escopos: [
      { chave: "auditoria:read", label: "Ler auditoria", descricao: "Consultar logs de auditoria e segurança.", sensivel: true },
      { chave: "auditoria:export", label: "Exportar auditoria", descricao: "Exportar histórico de alterações críticas.", sensivel: true },
      { chave: "security:read", label: "Ler segurança", descricao: "Consultar eventos de segurança e uso de API." },
    ],
  },
];

const todosEscopos = gruposEscopos.flatMap((grupo) => grupo.escopos.map((escopo) => escopo.chave));

const modelosEscopo: ModeloEscopo[] = [
  {
    chave: "leitura",
    nome: "Somente leitura",
    descricao: "Consulta controlada para BI, conferência e painéis externos.",
    escopos: ["leads:read", "usuarios:read", "status:read", "agenda:read", "kanban:read", "relatorios:read"],
  },
  {
    chave: "leads-crm",
    nome: "Leads e CRM",
    descricao: "Integração para criar, atualizar e acompanhar oportunidades.",
    escopos: ["leads:read", "leads:create", "leads:update", "leads:assign", "kanban:read", "kanban:move", "agenda:read", "agenda:create"],
  },
  {
    chave: "monitor-3cx",
    nome: "Monitor 3CX",
    descricao: "Webhook para eventos de ligação e status por ramal.",
    escopos: ["usuarios:read", "status:read", "status:write", "3cx:status", "3cx:read", "3cx:webhook"],
  },
  {
    chave: "whatsapp",
    nome: "Monitor WhatsApp",
    descricao: "Eventos de WhatsApp, alertas e acompanhamento operacional.",
    escopos: ["leads:read", "whatsapp:read", "whatsapp:write", "whatsapp:notifications", "status:read"],
  },
  {
    chave: "c2s",
    nome: "Integração C2S",
    descricao: "Importação e sincronização de leads, vendedores e carteira C2S.",
    escopos: ["leads:read", "leads:create", "leads:update", "leads:assign", "c2s:read", "c2s:import", "c2s:update"],
  },
  {
    chave: "bi-relatorios",
    nome: "BI e relatórios",
    descricao: "Extração gerencial controlada para dashboards externos.",
    escopos: ["leads:read", "usuarios:read", "status:read", "agenda:read", "kanban:read", "relatorios:read", "relatorios:export"],
  },
  {
    chave: "completo",
    nome: "Integração completa",
    descricao: "Acesso amplo para integração oficial. Use apenas quando necessário.",
    escopos: todosEscopos,
  },
];

function formatarData(valor?: string | null) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function mascaraUserAgent(valor?: string | null) {
  if (!valor) return "Não identificado";
  if (valor.length <= 90) return valor;
  return `${valor.slice(0, 90)}...`;
}

function labelEscopo(chave: string) {
  const item = gruposEscopos.flatMap((grupo) => grupo.escopos).find((escopo) => escopo.chave === chave);
  return item?.label || chave;
}

function escopoSensivel(chave: string) {
  return Boolean(gruposEscopos.flatMap((grupo) => grupo.escopos).find((escopo) => escopo.chave === chave)?.sensivel);
}

export default function Page() {
  const [chaves, setChaves] = useState<ApiKey[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [chaveGerada, setChaveGerada] = useState<string>("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [escopos, setEscopos] = useState<string[]>(["leads:read"]);
  const [busca, setBusca] = useState("");
  const [grupoAberto, setGrupoAberto] = useState<string[]>(["Leads e CRM", "Usuários e status"]);
  const [revogandoId, setRevogandoId] = useState<string | null>(null);
  const [motivoRevogacao, setMotivoRevogacao] = useState("");

  const ativas = useMemo(() => chaves.filter((chave) => chave.ativo).length, [chaves]);
  const revogadas = useMemo(() => chaves.filter((chave) => !chave.ativo).length, [chaves]);
  const escoposSensiveisSelecionados = useMemo(() => escopos.filter(escopoSensivel).length, [escopos]);

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return gruposEscopos;

    return gruposEscopos
      .map((grupo) => ({
        ...grupo,
        escopos: grupo.escopos.filter((escopo) =>
          `${grupo.titulo} ${escopo.label} ${escopo.descricao} ${escopo.chave}`.toLowerCase().includes(termo)
        ),
      }))
      .filter((grupo) => grupo.escopos.length > 0);
  }, [busca]);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/api-chaves", { cache: "no-store" });
      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível carregar as chaves API.");
      }

      setChaves(json.chaves || []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar chaves API.");
    } finally {
      setCarregando(false);
    }
  }

  async function gerar() {
    setSalvando(true);
    setErro("");
    setSucesso("");
    setChaveGerada("");

    try {
      const resposta = await fetch("/api/api-chaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, escopos }),
      });
      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível gerar a chave API.");
      }

      setChaveGerada(json.chave?.chave_completa || "");
      setSucesso("Chave API criada com sucesso.");
      setNome("");
      setDescricao("");
      setEscopos(["leads:read"]);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao gerar chave API.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(id: string, acao: "revogar" | "reativar", motivo?: string) {
    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/api-chaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, acao, motivo }),
      });
      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível atualizar a chave API.");
      }

      setSucesso(acao === "revogar" ? "Chave revogada." : "Chave reativada.");
      setRevogandoId(null);
      setMotivoRevogacao("");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao atualizar chave API.");
    } finally {
      setSalvando(false);
    }
  }

  function alternarEscopo(chave: string) {
    setEscopos((atuais) =>
      atuais.includes(chave) ? atuais.filter((item) => item !== chave) : [...atuais, chave]
    );
  }

  function aplicarModelo(modelo: ModeloEscopo) {
    setEscopos(Array.from(new Set(modelo.escopos)));
    if (!nome.trim()) setNome(modelo.nome);
    if (!descricao.trim()) setDescricao(modelo.descricao);
    setGrupoAberto(gruposEscopos.map((grupo) => grupo.titulo));
  }

  function selecionarGrupo(grupo: GrupoEscopo) {
    const chaves = grupo.escopos.map((escopo) => escopo.chave);
    setEscopos((atuais) => Array.from(new Set([...atuais, ...chaves])));
  }

  function limparGrupo(grupo: GrupoEscopo) {
    const chaves = new Set(grupo.escopos.map((escopo) => escopo.chave));
    setEscopos((atuais) => atuais.filter((escopo) => !chaves.has(escopo)));
  }

  function alternarGrupo(titulo: string) {
    setGrupoAberto((atuais) =>
      atuais.includes(titulo) ? atuais.filter((item) => item !== titulo) : [...atuais, titulo]
    );
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Segurança</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">API Flow Sales</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Gestão de credenciais, escopos e auditoria para integrações externas.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-black text-blue-700">Ativas</p>
                <p className="text-2xl font-black text-slate-950">{ativas}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black text-slate-500">Revogadas</p>
                <p className="text-2xl font-black text-slate-950">{revogadas}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-xs font-black text-amber-700">Escopos sensíveis</p>
                <p className="text-2xl font-black text-slate-950">{escoposSensiveisSelecionados}</p>
              </div>
              <button
                type="button"
                onClick={carregar}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {erro}
          </div>
        ) : null}

        {sucesso ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {sucesso}
          </div>
        ) : null}

        {chaveGerada ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-amber-900">Copie a chave agora</h2>
                <p className="mt-1 text-sm font-semibold text-amber-800">
                  A chave completa não será exibida novamente.
                </p>
                <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-3 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 break-all text-sm font-black text-slate-950">{chaveGerada}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(chaveGerada)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[520px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-950">Nova chave</h2>
                <p className="text-xs font-bold text-slate-500">Acesso restrito ao ADM.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Nome</span>
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Ex: Monitor 3CX oficial"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Descrição</span>
                <textarea
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Finalidade, sistema autorizado e responsável pela integração"
                  rows={3}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Modelos rápidos</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {modelosEscopo.map((modelo) => (
                    <button
                      key={modelo.chave}
                      type="button"
                      onClick={() => aplicarModelo(modelo)}
                      className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      <strong className="block text-sm text-slate-950">{modelo.nome}</strong>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{modelo.descricao}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">Escopos</span>
                  <label className="relative block sm:w-[260px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={busca}
                      onChange={(event) => setBusca(event.target.value)}
                      placeholder="Buscar escopo"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                </div>

                <div className="max-h-[620px] overflow-y-auto pr-1">
                  <div className="grid gap-3">
                    {gruposFiltrados.map((grupo) => {
                      const Icon = grupo.icon;
                      const aberto = grupoAberto.includes(grupo.titulo) || Boolean(busca.trim());
                      const selecionados = grupo.escopos.filter((escopo) => escopos.includes(escopo.chave)).length;

                      return (
                        <div key={grupo.titulo} className="overflow-hidden rounded-2xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => alternarGrupo(grupo.titulo)}
                            className="flex w-full items-center justify-between gap-3 bg-slate-50 px-3 py-3 text-left"
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-slate-200">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0">
                                <strong className="block text-sm text-slate-950">{grupo.titulo}</strong>
                                <span className="block truncate text-xs font-semibold text-slate-500">{grupo.descricao}</span>
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-blue-700 ring-1 ring-slate-200">
                                {selecionados}/{grupo.escopos.length}
                              </span>
                              <ChevronDown className={`h-4 w-4 text-slate-400 transition ${aberto ? "rotate-180" : ""}`} />
                            </span>
                          </button>

                          {aberto ? (
                            <div className="grid gap-2 p-3">
                              <div className="flex gap-2">
                                <button type="button" onClick={() => selecionarGrupo(grupo)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                                  Selecionar grupo
                                </button>
                                <button type="button" onClick={() => limparGrupo(grupo)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                                  Limpar grupo
                                </button>
                              </div>

                              {grupo.escopos.map((item) => (
                                <label key={item.chave} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 transition hover:bg-slate-50">
                                  <span className="min-w-0">
                                    <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                                      {item.label}
                                      {item.sensivel ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">Sensível</span> : null}
                                    </span>
                                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{item.descricao}</span>
                                    <code className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">{item.chave}</code>
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={escopos.includes(item.chave)}
                                    onChange={() => alternarEscopo(item.chave)}
                                    className="mt-1 h-4 w-4 shrink-0"
                                  />
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{escopos.length} escopo(s) selecionado(s)</p>
                    <p className="text-xs font-bold text-slate-500">{escoposSensiveisSelecionados} escopo(s) sensível(is)</p>
                  </div>
                  <button type="button" onClick={() => setEscopos([])} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                    Limpar seleção
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={salvando || !nome.trim() || !descricao.trim() || escopos.length === 0}
                onClick={gerar}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Gerar chave API
              </button>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-black text-slate-950">Chaves cadastradas</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Controle de acesso por prefixo, status e auditoria.</p>
            </div>

            {carregando ? (
              <div className="grid min-h-[360px] place-items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
              </div>
            ) : chaves.length === 0 ? (
              <div className="grid min-h-[320px] place-items-center p-8 text-center">
                <div>
                  <LockKeyhole className="mx-auto h-10 w-10 text-slate-300" />
                  <h3 className="mt-3 font-black text-slate-950">Nenhuma chave cadastrada</h3>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {chaves.map((chave) => {
                  const auditoria = chave.auditoria_criacao;
                  const acesso = auditoria?.valor_novo?.acesso || {};
                  const escoposChave = Array.isArray(chave.escopos) ? chave.escopos : [];

                  return (
                    <article key={chave.id} className="p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-slate-950">{chave.nome}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${chave.ativo ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                              {chave.ativo ? "Ativa" : "Revogada"}
                            </span>
                            {escoposChave.some(escopoSensivel) ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                                <ShieldAlert className="h-3 w-3" /> Sensível
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{chave.descricao || "Sem descrição"}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{chave.prefixo}.••••••••</code>
                            {escoposChave.map((escopo) => (
                              <span key={escopo} className={`rounded-lg px-2 py-1 text-xs font-black ${escopoSensivel(escopo) ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                                {labelEscopo(escopo)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() => {
                            if (chave.ativo) {
                              setRevogandoId(chave.id);
                              return;
                            }
                            alterarStatus(chave.id, "reativar");
                          }}
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition disabled:opacity-60 ${chave.ativo ? "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100" : "border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                        >
                          {chave.ativo ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          {chave.ativo ? "Revogar" : "Reativar"}
                        </button>
                      </div>

                      {revogandoId === chave.id ? (
                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
                          <label className="grid gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-red-700">Motivo da revogação</span>
                            <textarea
                              value={motivoRevogacao}
                              onChange={(event) => setMotivoRevogacao(event.target.value)}
                              rows={2}
                              className="rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-bold outline-none"
                              placeholder="Informe o motivo da revogação"
                            />
                          </label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!motivoRevogacao.trim() || salvando}
                              onClick={() => alterarStatus(chave.id, "revogar", motivoRevogacao)}
                              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                            >
                              Confirmar revogação
                            </button>
                            <button type="button" onClick={() => { setRevogandoId(null); setMotivoRevogacao(""); }} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <span className="block text-slate-400">Criada por</span>
                          <strong className="text-slate-800">{chave.criador?.nome || "—"}</strong>
                        </div>
                        <div>
                          <span className="block text-slate-400">Data/hora</span>
                          <strong className="text-slate-800">{formatarData(chave.criado_em)}</strong>
                        </div>
                        <div>
                          <span className="block text-slate-400">IP/local</span>
                          <strong className="text-slate-800">{auditoria?.ip || acesso.ip || "—"}</strong>
                        </div>
                        <div>
                          <span className="block text-slate-400">Último uso</span>
                          <strong className="text-slate-800">{formatarData(chave.ultimo_uso_em)}</strong>
                        </div>
                        <div className="md:col-span-2 xl:col-span-4">
                          <span className="block text-slate-400">Dispositivo</span>
                          <strong className="text-slate-800">{mascaraUserAgent(auditoria?.user_agent || acesso.userAgent)}</strong>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700" />
            <div>
              <h2 className="font-black text-slate-950">Controle de segurança</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Criações, revogações e reativações são registradas com responsável, data, IP, dispositivo, escopos e auditoria.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
