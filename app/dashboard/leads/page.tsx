import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  Flame,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    filtro?: string;
    busca?: string;
    status?: string;
    etapa?: string;
    temperatura?: string;
  }>;
};

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  telefone_normalizado: string;
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
  c2s_id: string | null;
  c2s_internal_id: number | null;
};

type InteracaoResumo = {
  lead_id: string;
  tipo: string;
  canal: string;
  resultado: string | null;
  observacao: string | null;
  criado_em: string;
};

function texto(valor: string | null | undefined) {
  return String(valor || "").trim();
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
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function formatarDataCurta(valor: string | null) {
  if (!valor) return "Sem registro";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function isAtrasado(valor: string | null) {
  if (!valor) return false;
  return new Date(valor).getTime() < Date.now();
}

function isHoje(valor: string | null) {
  if (!valor) return false;

  const data = new Date(valor);
  const hoje = new Date();

  return (
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear()
  );
}

function telefoneWhatsapp(lead: Lead) {
  const digits = (lead.telefone_normalizado || lead.telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function corTemperatura(valor: string) {
  const temperatura = valor.toLowerCase();

  if (temperatura.includes("quente")) {
    return "border-red-100 bg-red-50 text-red-700";
  }

  if (temperatura.includes("frio")) {
    return "border-sky-100 bg-sky-50 text-sky-700";
  }

  return "border-amber-100 bg-amber-50 text-amber-700";
}

function corEtapa(valor: string) {
  const etapa = valor.toLowerCase();

  if (etapa.includes("venda") || etapa.includes("ganho")) {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (etapa.includes("agend")) {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  if (etapa.includes("arquiv")) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-violet-100 bg-violet-50 text-violet-700";
}

function labelResultado(valor: string | null) {
  const mapa: Record<string, string> = {
    nao_atendeu: "Não atendeu",
    sem_resposta: "Sem resposta",
    falou_sem_interesse: "Falou, sem interesse agora",
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

function prioridadeLead(lead: Lead, interacao?: InteracaoResumo) {
  if (lead.venda_pendente_validacao) {
    return {
      label: "Venda pendente",
      classe: "border-orange-100 bg-orange-50 text-orange-700",
      descricao: "Aguardando validação",
    };
  }

  if (lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)) {
    return {
      label: "Atrasado",
      classe: "border-red-100 bg-red-50 text-red-700",
      descricao: "Retorno passou do horário",
    };
  }

  if (lead.data_proxima_acao && isHoje(lead.data_proxima_acao)) {
    return {
      label: "Retorno hoje",
      classe: "border-blue-100 bg-blue-50 text-blue-700",
      descricao: "Ação programada para hoje",
    };
  }

  if (!lead.data_primeiro_contato) {
    return {
      label: "1º contato",
      classe: "border-purple-100 bg-purple-50 text-purple-700",
      descricao: "Ainda sem contato registrado",
    };
  }

  if (lead.temperatura === "quente") {
    return {
      label: "Quente",
      classe: "border-red-100 bg-red-50 text-red-700",
      descricao: "Cliente com intenção forte",
    };
  }

  if (interacao?.resultado === "nao_atendeu" || interacao?.resultado === "sem_resposta") {
    return {
      label: "Tentar novamente",
      classe: "border-amber-100 bg-amber-50 text-amber-700",
      descricao: "Último contato sem avanço",
    };
  }

  return {
    label: "Acompanhar",
    classe: "border-slate-200 bg-slate-50 text-slate-600",
    descricao: "Lead em acompanhamento",
  };
}

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) || {};
  const filtro = params.filtro || "";
  const busca = texto(params.busca);
  const statusFiltro = params.status || "todos";
  const etapaFiltro = params.etapa || "todas";
  const temperaturaFiltro = params.temperatura || "todas";
  const mostrandoArquivados = filtro === "arquivados";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuarioInterno) {
    redirect("/login");
  }

  let query = supabase
    .from("leads")
    .select(
      "id, nome, telefone, telefone_normalizado, email, origem, campanha, status, etapa, temperatura, veiculo_interesse, observacao, data_primeiro_contato, data_ultimo_contato, data_proxima_acao, arquivado, venda_pendente_validacao, venda_validada, criado_em, atualizado_em, c2s_id, c2s_internal_id"
    )
    .eq("arquivado", mostrandoArquivados)
    .order("data_proxima_acao", { ascending: true, nullsFirst: false })
    .order("atualizado_em", { ascending: false })
    .limit(80);

  if (busca) {
    query = query.or(
      `nome.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%,veiculo_interesse.ilike.%${busca}%`
    );
  }

  if (statusFiltro !== "todos") {
    query = query.eq("status", statusFiltro);
  }

  if (etapaFiltro !== "todas") {
    query = query.eq("etapa", etapaFiltro);
  }

  if (temperaturaFiltro !== "todas") {
    query = query.eq("temperatura", temperaturaFiltro);
  }

  const { data: leads, error } = await query;

  const ids = (leads || []).map((lead) => lead.id);

  const { data: interacoesRecentes } = ids.length
    ? await supabase
        .from("lead_interacoes")
        .select("lead_id, tipo, canal, resultado, observacao, criado_em")
        .in("lead_id", ids)
        .order("criado_em", { ascending: false })
    : { data: [] as InteracaoResumo[] };

  const ultimaPorLead = new Map<string, InteracaoResumo>();

  for (const interacao of interacoesRecentes || []) {
    if (!ultimaPorLead.has(interacao.lead_id)) {
      ultimaPorLead.set(interacao.lead_id, interacao as InteracaoResumo);
    }
  }

  const lista = (leads || []) as Lead[];

  const totalQuentes = lista.filter((lead) => lead.temperatura === "quente").length;
  const totalProximasAcoes = lista.filter((lead) => lead.data_proxima_acao && !isAtrasado(lead.data_proxima_acao)).length;
  const totalAtrasados = lista.filter((lead) => lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)).length;
  const totalSemPrimeiroContato = lista.filter((lead) => !lead.data_primeiro_contato).length;
  const totalVendasPendentes = lista.filter((lead) => lead.venda_pendente_validacao).length;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[1480px]">
          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                  Flow Sales CRM
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                  {mostrandoArquivados ? "Leads arquivados" : "Leads ativos"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Fila operacional com prioridade, próxima ação, histórico recente e atalhos rápidos para atendimento.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/leads/solicitacoes"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                >
                  Solicitações
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard/leads/novo"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Solicitar novo lead
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-500">Leads listados</p>
                <Users className="h-5 w-5 text-blue-700" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{lista.length}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">Limite de 80 por visualização</p>
            </div>

            <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-500">Quentes</p>
                <Flame className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{totalQuentes}</p>
              <p className="mt-1 text-xs font-bold text-red-500">Prioridade comercial</p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-500">Próximas ações</p>
                <CalendarClock className="h-5 w-5 text-blue-700" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{totalProximasAcoes}</p>
              <p className="mt-1 text-xs font-bold text-blue-500">Retornos agendados</p>
            </div>

            <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-500">Atrasados</p>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{totalAtrasados}</p>
              <p className="mt-1 text-xs font-bold text-red-500">Precisam retorno</p>
            </div>

            <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-500">Sem 1º contato</p>
                <Phone className="h-5 w-5 text-purple-700" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{totalSemPrimeiroContato}</p>
              <p className="mt-1 text-xs font-bold text-purple-500">Ligar primeiro</p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-500">Vendas pendentes</p>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{totalVendasPendentes}</p>
              <p className="mt-1 text-xs font-bold text-emerald-500">Aguardando validação</p>
            </div>
          </section>

          <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <form className="grid gap-4 xl:grid-cols-[1.4fr_0.65fr_0.65fr_0.65fr_auto]" action="/dashboard/leads">
              <input type="hidden" name="filtro" value={filtro} />

              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  <Search className="h-4 w-4" />
                  Buscar lead
                </span>
                <input
                  name="busca"
                  defaultValue={busca}
                  placeholder="Nome, telefone, e-mail ou veículo"
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Status</span>
                <select
                  name="status"
                  defaultValue={statusFiltro}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="todos">Todos</option>
                  <option value="morno">Morno</option>
                  <option value="quente">Quente</option>
                  <option value="frio">Frio</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Etapa</span>
                <select
                  name="etapa"
                  defaultValue={etapaFiltro}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="todas">Todas</option>
                  <option value="novo">Novo</option>
                  <option value="contato">Em contato</option>
                  <option value="agendado">Agendado</option>
                  <option value="visita">Visitou loja</option>
                  <option value="venda_pendente">Venda pendente</option>
                  <option value="venda_validada">Venda validada</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Temperatura</span>
                <select
                  name="temperatura"
                  defaultValue={temperaturaFiltro}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="todas">Todas</option>
                  <option value="morno">Morno</option>
                  <option value="quente">Quente</option>
                  <option value="frio">Frio</option>
                </select>
              </label>

              <button
                type="submit"
                className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-blue-700"
              >
                <Filter className="h-4 w-4" />
                Filtrar
              </button>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-950">Fila de atendimento</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {error ? "Não foi possível carregar os leads." : `${lista.length} lead(s) carregado(s) nesta visualização.`}
                </p>
              </div>

              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <Link
                  href="/dashboard/leads"
                  className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                    !mostrandoArquivados ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  Ativos
                </Link>
                <Link
                  href="/dashboard/leads?filtro=arquivados"
                  className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                    mostrandoArquivados ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  Arquivados
                </Link>
              </div>
            </div>

            {lista.length === 0 ? (
              <div className="grid min-h-[260px] place-items-center px-6 py-12 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Users className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-xl font-black text-slate-950">Nenhum lead encontrado</h3>
                  <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
                    Ajuste os filtros ou importe uma base para começar a acompanhar os leads por aqui.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lista.map((lead) => {
                  const ultima = ultimaPorLead.get(lead.id);
                  const prioridade = prioridadeLead(lead, ultima);
                  const whatsapp = telefoneWhatsapp(lead);

                  return (
                    <article key={lead.id} className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 xl:grid-cols-[1.1fr_0.85fr_0.85fr_0.75fr_auto] xl:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="text-base font-black text-slate-950 transition hover:text-blue-700"
                          >
                            {lead.nome}
                          </Link>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${corTemperatura(lead.temperatura)}`}>
                            {normalizarTexto(lead.temperatura)}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${corEtapa(lead.etapa)}`}>
                            {normalizarTexto(lead.etapa)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-blue-700" />
                            {lead.telefone}
                          </span>
                          {lead.veiculo_interesse ? (
                            <span>{lead.veiculo_interesse}</span>
                          ) : null}
                          {lead.origem ? (
                            <span>Origem: {lead.origem}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className={`rounded-2xl border px-4 py-3 ${prioridade.classe}`}>
                        <p className="text-xs font-black uppercase tracking-wide">{prioridade.label}</p>
                        <p className="mt-1 text-xs font-bold opacity-80">{prioridade.descricao}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-slate-400">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Próxima ação
                        </p>
                        <p className={`mt-1 text-sm font-black ${isAtrasado(lead.data_proxima_acao) ? "text-red-700" : "text-slate-900"}`}>
                          {lead.data_proxima_acao ? formatarDataCurta(lead.data_proxima_acao) : "Sem próxima ação"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          Último contato
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-900">
                          {ultima ? labelResultado(ultima.resultado) : "Sem histórico"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {ultima ? formatarData(ultima.criado_em) : formatarData(lead.data_ultimo_contato)}
                        </p>
                      </div>

                      <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                        <a
                          href={`tel:${lead.telefone}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                        >
                          <Phone className="mr-1 h-3.5 w-3.5" />
                          Ligar
                        </a>

                        {whatsapp ? (
                          <a
                            href={`https://wa.me/${whatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <MessageCircle className="mr-1 h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        ) : null}

                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-blue-700"
                        >
                          Abrir
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
    </main>
  );
}
