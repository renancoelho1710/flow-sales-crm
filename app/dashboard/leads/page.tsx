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
  Search,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AtendimentoHeader } from "@/components/atendimento/AtendimentoHeader";

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
  const perfil = String(usuarioInterno.perfil || "").toLowerCase();
  const podeGerir = ["adm", "admin", "suporte", "gerente", "supervisor"].includes(perfil);
  const filtroBase = mostrandoArquivados ? "filtro=arquivados&" : "";

  return (
    <main className="flow-premium-page fs-attention-page">
      <div className="mx-auto max-w-[1540px] space-y-4">
        <AtendimentoHeader
          active={mostrandoArquivados ? "arquivados" : "fila"}
          title={mostrandoArquivados ? "Arquivo de atendimentos" : "Fila de atendimento"}
          description={
            mostrandoArquivados
              ? "Consulte oportunidades encerradas sem misturar o histórico com a fila ativa."
              : "Veja quem precisa de ação, escolha o próximo cliente e continue o atendimento sem trocar de sistema."
          }
          canManage={podeGerir}
          primaryAction={{ href: "/dashboard/leads/novo", label: "Indicar cliente" }}
          secondaryAction={podeGerir ? { href: "/dashboard/c2s", label: "Sincronizar C2S" } : undefined}
        />

        <section className="fs-attention-metrics fs-attention-metrics--six">
          <Link href={mostrandoArquivados ? "/dashboard/leads?filtro=arquivados" : "/dashboard/leads"} className="fs-attention-metric is-blue">
            <span className="fs-attention-metric__icon"><Users className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Na visualização</span>
            <strong>{lista.length}</strong>
            <small>{mostrandoArquivados ? "Registros arquivados" : "Oportunidades ativas"}</small>
          </Link>

          <Link href={`/dashboard/leads?${filtroBase}temperatura=quente`} className="fs-attention-metric is-red">
            <span className="fs-attention-metric__icon"><Flame className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Quentes</span>
            <strong>{totalQuentes}</strong>
            <small>Maior prioridade comercial</small>
          </Link>

          <Link href="/dashboard/leads/tarefas#retornos" className="fs-attention-metric is-cyan">
            <span className="fs-attention-metric__icon"><CalendarClock className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Próximas ações</span>
            <strong>{totalProximasAcoes}</strong>
            <small>Retornos programados</small>
          </Link>

          <Link href="/dashboard/leads/tarefas#atrasados" className="fs-attention-metric is-orange">
            <span className="fs-attention-metric__icon"><AlertTriangle className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Atrasados</span>
            <strong>{totalAtrasados}</strong>
            <small>Resolver primeiro</small>
          </Link>

          <Link href="/dashboard/leads/tarefas#primeiro-contato" className="fs-attention-metric is-violet">
            <span className="fs-attention-metric__icon"><Phone className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Sem 1º contato</span>
            <strong>{totalSemPrimeiroContato}</strong>
            <small>Ligar antes de avançar</small>
          </Link>

          <Link href="/dashboard/kanban?filtro=vendas-pendentes" className="fs-attention-metric is-green">
            <span className="fs-attention-metric__icon"><CheckCircle2 className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Vendas pendentes</span>
            <strong>{totalVendasPendentes}</strong>
            <small>Aguardam validação</small>
          </Link>
        </section>

        <section className="fs-attention-toolbar-card">
          <form className="fs-attention-filter-grid" action="/dashboard/leads">
            <input type="hidden" name="filtro" value={filtro} />

            <label className="fs-attention-field fs-attention-field--search">
              <span><Search className="h-4 w-4" /> Buscar</span>
              <input name="busca" defaultValue={busca} placeholder="Cliente, telefone, e-mail ou veículo" />
            </label>

            <label className="fs-attention-field">
              <span>Status</span>
              <select name="status" defaultValue={statusFiltro}>
                <option value="todos">Todos</option>
                <option value="morno">Morno</option>
                <option value="quente">Quente</option>
                <option value="frio">Frio</option>
              </select>
            </label>

            <label className="fs-attention-field">
              <span>Etapa</span>
              <select name="etapa" defaultValue={etapaFiltro}>
                <option value="todas">Todas</option>
                <option value="novo">Novo</option>
                <option value="contato">Em contato</option>
                <option value="agendado">Agendado</option>
                <option value="visita">Visitou loja</option>
                <option value="venda_pendente">Venda pendente</option>
                <option value="venda_validada">Venda validada</option>
              </select>
            </label>

            <label className="fs-attention-field">
              <span>Temperatura</span>
              <select name="temperatura" defaultValue={temperaturaFiltro}>
                <option value="todas">Todas</option>
                <option value="morno">Morno</option>
                <option value="quente">Quente</option>
                <option value="frio">Frio</option>
              </select>
            </label>

            <button type="submit" className="fs-attention-filter-button">
              <Filter className="h-4 w-4" /> Aplicar
            </button>
          </form>
        </section>

        <section className="fs-attention-list-card">
          <header className="fs-attention-list-card__header">
            <div>
              <p className="fs-attention-eyebrow">Ordem de trabalho</p>
              <h2>{mostrandoArquivados ? "Histórico arquivado" : "Próximos atendimentos"}</h2>
              <span>{error ? "Não foi possível carregar os leads." : `${lista.length} cliente(s) nesta visualização.`}</span>
            </div>

            <div className="fs-attention-segmented">
              <Link href="/dashboard/leads" className={!mostrandoArquivados ? "is-active" : ""}>Ativos</Link>
              <Link href="/dashboard/leads?filtro=arquivados" className={mostrandoArquivados ? "is-active" : ""}>Arquivados</Link>
            </div>
          </header>

          {lista.length === 0 ? (
            <div className="fs-attention-empty">
              <span><Users className="h-7 w-7" /></span>
              <h3>Nenhum lead encontrado</h3>
              <p>Ajuste os filtros ou sincronize uma base para começar o atendimento.</p>
            </div>
          ) : (
            <div className="fs-lead-list">
              {lista.map((lead) => {
                const ultima = ultimaPorLead.get(lead.id);
                const prioridade = prioridadeLead(lead, ultima);
                const whatsapp = telefoneWhatsapp(lead);
                const inicial = lead.nome.trim().charAt(0).toUpperCase() || "C";

                return (
                  <article key={lead.id} className="fs-lead-row">
                    <div className="fs-lead-row__identity">
                      <span className="fs-lead-avatar">{inicial}</span>
                      <div className="min-w-0">
                        <div className="fs-lead-row__title">
                          <Link href={`/dashboard/leads/${lead.id}`}>{lead.nome}</Link>
                          <span className={corTemperatura(lead.temperatura)}>{normalizarTexto(lead.temperatura)}</span>
                          <span className={corEtapa(lead.etapa)}>{normalizarTexto(lead.etapa)}</span>
                        </div>
                        <div className="fs-lead-row__meta">
                          <span><Phone className="h-3.5 w-3.5" /> {lead.telefone}</span>
                          {lead.veiculo_interesse ? <span>{lead.veiculo_interesse}</span> : null}
                          {lead.origem ? <span>{lead.origem}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className={`fs-lead-context ${prioridade.classe}`}>
                      <span>{prioridade.label}</span>
                      <small>{prioridade.descricao}</small>
                    </div>

                    <div className="fs-lead-detail">
                      <span><CalendarClock className="h-3.5 w-3.5" /> Próxima ação</span>
                      <strong className={isAtrasado(lead.data_proxima_acao) ? "text-red-700" : ""}>
                        {lead.data_proxima_acao ? formatarDataCurta(lead.data_proxima_acao) : "Sem próxima ação"}
                      </strong>
                    </div>

                    <div className="fs-lead-detail">
                      <span><Clock3 className="h-3.5 w-3.5" /> Último contato</span>
                      <strong>{ultima ? labelResultado(ultima.resultado) : "Sem histórico"}</strong>
                      <small>{ultima ? formatarData(ultima.criado_em) : formatarData(lead.data_ultimo_contato)}</small>
                    </div>

                    <div className="fs-lead-row__actions">
                      <a href={`tel:${lead.telefone}`} title="Ligar" aria-label={`Ligar para ${lead.nome}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                      {whatsapp ? (
                        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" title="WhatsApp" aria-label={`Abrir WhatsApp de ${lead.nome}`}>
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      ) : null}
                      <Link href={`/dashboard/leads/${lead.id}`} className="is-primary">
                        Atender <ArrowRight className="h-4 w-4" />
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
