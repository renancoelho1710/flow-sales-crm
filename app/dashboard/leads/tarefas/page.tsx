import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Flame,
  MessageCircle,
  Phone,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AtendimentoHeader } from "@/components/atendimento/AtendimentoHeader";

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
};

type InteracaoResumo = {
  lead_id: string;
  tipo: string;
  canal: string;
  resultado: string | null;
  observacao: string | null;
  criado_em: string;
};

function formatarData(valor: string | null) {
  if (!valor) return "Sem registro";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function normalizarTexto(valor: string | null | undefined) {
  if (!valor) return "Não informado";

  return valor
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
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

function prioridade(lead: Lead) {
  if (lead.venda_pendente_validacao) return 1;
  if (lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)) return 2;
  if (lead.data_proxima_acao && isHoje(lead.data_proxima_acao)) return 3;
  if (!lead.data_primeiro_contato) return 4;
  if (lead.temperatura === "quente") return 5;
  return 9;
}

function metaOperacional(total: number, feito: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((feito / total) * 100));
}

function CardIndicador({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tom,
}: {
  titulo: string;
  valor: number | string;
  detalhe: string;
  icon: any;
  tom: "red" | "blue" | "purple" | "orange" | "emerald" | "slate";
}) {
  return (
    <div className={`fs-attention-metric is-${tom}`}>
      <span className="fs-attention-metric__icon"><Icon className="h-[18px] w-[18px]" /></span>
      <span className="fs-attention-metric__label">{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalhe}</small>
    </div>
  );
}

function CardLead({
  lead,
  ultima,
  tipo,
}: {
  lead: Lead;
  ultima?: InteracaoResumo;
  tipo: "atrasado" | "hoje" | "sem-contato" | "quente" | "venda" | "normal";
}) {
  const whatsapp = telefoneWhatsapp(lead);
  const label = {
    atrasado: "Atrasado",
    hoje: "Retorno hoje",
    "sem-contato": "1º contato",
    quente: "Lead quente",
    venda: "Venda pendente",
    normal: "Acompanhar",
  }[tipo];

  return (
    <article className={`fs-task-lead fs-task-lead--${tipo}`}>
      <div className="fs-task-lead__identity">
        <span className="fs-task-lead__avatar">{lead.nome.trim().charAt(0).toUpperCase() || "C"}</span>
        <div className="min-w-0">
          <div className="fs-task-lead__title">
            <Link href={`/dashboard/leads/${lead.id}`}>{lead.nome}</Link>
            <span>{label}</span>
            <small>{normalizarTexto(lead.etapa)}</small>
          </div>
          <div className="fs-task-lead__meta">
            <span><Phone className="h-3.5 w-3.5" /> {lead.telefone}</span>
            {lead.veiculo_interesse ? <span>{lead.veiculo_interesse}</span> : null}
            {lead.origem ? <span>{lead.origem}</span> : null}
          </div>
        </div>
      </div>

      <div className="fs-task-lead__context">
        <span>Próxima ação</span>
        <strong className={isAtrasado(lead.data_proxima_acao) ? "text-red-700" : ""}>{formatarData(lead.data_proxima_acao)}</strong>
      </div>

      <div className="fs-task-lead__context">
        <span>Último resultado</span>
        <strong>{ultima ? labelResultado(ultima.resultado) : "Sem histórico"}</strong>
      </div>

      <div className="fs-task-lead__actions">
        <a href={`tel:${lead.telefone}`} title="Ligar"><Phone className="h-4 w-4" /></a>
        {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle className="h-4 w-4" /></a> : null}
        <Link href={`/dashboard/leads/${lead.id}`}>Atender <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </article>
  );
}

function BlocoTarefa({
  id,
  titulo,
  descricao,
  icon: Icon,
  leads,
  ultimas,
  tipo,
  aberto = false,
}: {
  id: string;
  titulo: string;
  descricao: string;
  icon: any;
  leads: Lead[];
  ultimas: Map<string, InteracaoResumo>;
  tipo: "atrasado" | "hoje" | "sem-contato" | "quente" | "venda" | "normal";
  aberto?: boolean;
}) {
  return (
    <details id={id} className={`fs-task-group fs-task-group--${tipo}`} open={aberto || leads.length > 0 && tipo === "atrasado"}>
      <summary>
        <span className="fs-task-group__icon"><Icon className="h-5 w-5" /></span>
        <span className="fs-task-group__copy"><strong>{titulo}</strong><small>{descricao}</small></span>
        <span className="fs-task-group__count">{leads.length}</span>
        <ChevronRight className="fs-task-group__chevron h-5 w-5" />
      </summary>

      <div className="fs-task-group__body">
        {leads.length === 0 ? (
          <div className="fs-task-group__empty">Nenhum lead nesta categoria agora.</div>
        ) : (
          leads.slice(0, 20).map((lead) => <CardLead key={lead.id} lead={lead} ultima={ultimas.get(lead.id)} tipo={tipo} />)
        )}
      </div>
    </details>
  );
}

export default async function Page() {
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

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, nome, telefone, telefone_normalizado, email, origem, campanha, status, etapa, temperatura, veiculo_interesse, observacao, data_primeiro_contato, data_ultimo_contato, data_proxima_acao, arquivado, venda_pendente_validacao, venda_validada, criado_em, atualizado_em"
    )
    .eq("arquivado", false)
    .order("data_proxima_acao", { ascending: true, nullsFirst: false })
    .order("atualizado_em", { ascending: false })
    .limit(160);

  const lista = ((leads || []) as Lead[]).sort((a, b) => prioridade(a) - prioridade(b));

  const ids = lista.map((lead) => lead.id);

  const { data: interacoesRecentes } = ids.length
    ? await supabase
        .from("lead_interacoes")
        .select("lead_id, tipo, canal, resultado, observacao, criado_em")
        .in("lead_id", ids)
        .order("criado_em", { ascending: false })
    : { data: [] as InteracaoResumo[] };

  const ultimas = new Map<string, InteracaoResumo>();

  for (const interacao of interacoesRecentes || []) {
    if (!ultimas.has(interacao.lead_id)) {
      ultimas.set(interacao.lead_id, interacao as InteracaoResumo);
    }
  }

  const atrasados = lista.filter((lead) => lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao));
  const hoje = lista.filter((lead) => lead.data_proxima_acao && isHoje(lead.data_proxima_acao) && !isAtrasado(lead.data_proxima_acao));
  const semContato = lista.filter((lead) => !lead.data_primeiro_contato);
  const quentes = lista.filter((lead) => lead.temperatura === "quente" && !lead.venda_pendente_validacao);
  const vendasPendentes = lista.filter((lead) => lead.venda_pendente_validacao);
  const acompanhando = lista.filter(
    (lead) =>
      !atrasados.some((item) => item.id === lead.id) &&
      !hoje.some((item) => item.id === lead.id) &&
      !semContato.some((item) => item.id === lead.id) &&
      !quentes.some((item) => item.id === lead.id) &&
      !vendasPendentes.some((item) => item.id === lead.id)
  );

  const concluidosHoje = (interacoesRecentes || []).filter((interacao) => {
    const data = new Date(interacao.criado_em);
    const hojeData = new Date();
    return (
      data.getDate() === hojeData.getDate() &&
      data.getMonth() === hojeData.getMonth() &&
      data.getFullYear() === hojeData.getFullYear()
    );
  }).length;

  const totalPrioritario = atrasados.length + hoje.length + semContato.length + quentes.length + vendasPendentes.length;
  const progressoDia = metaOperacional(Math.max(totalPrioritario, 1), concluidosHoje);
  const perfil = String(usuarioInterno.perfil || "").toLowerCase();
  const podeGerir = ["adm", "admin", "suporte", "gerente", "supervisor"].includes(perfil);

  return (
    <main className="flow-premium-page fs-attention-page">
      <div className="mx-auto max-w-[1540px] space-y-4">
        <AtendimentoHeader
          active="prioridades"
          title="Prioridades do dia"
          description="Uma ordem clara para o operador agir: atrasados, retornos de hoje, primeiros contatos e oportunidades quentes."
          canManage={podeGerir}
          primaryAction={{ href: atrasados.length ? "#atrasados" : hoje.length ? "#retornos" : "/dashboard/leads", label: atrasados.length ? "Resolver atrasados" : hoje.length ? "Ver retornos" : "Abrir fila" }}
          secondaryAction={{ href: "/dashboard/agenda", label: "Abrir agenda" }}
        />

        <section className="fs-priority-focus">
          <div className="fs-priority-focus__main">
            <p className="fs-attention-eyebrow">Foco recomendado</p>
            <h2>{atrasados.length > 0 ? "Comece pelos retornos atrasados" : hoje.length > 0 ? "Execute os retornos de hoje" : semContato.length > 0 ? "Faça os primeiros contatos" : "Mantenha a cadência"}</h2>
            <p>{atrasados.length > 0 ? `Existem ${atrasados.length} cliente(s) esperando uma ação. Resolver isso primeiro protege as oportunidades mais sensíveis.` : hoje.length > 0 ? `Você tem ${hoje.length} retorno(s) programado(s) para hoje. Trabalhe pela ordem de horário.` : semContato.length > 0 ? `${semContato.length} lead(s) ainda precisam do primeiro contato registrado.` : "Não há alerta crítico agora. Continue acompanhando os leads quentes e os próximos passos."}</p>
          </div>
          <div className="fs-priority-focus__progress">
            <div className="fs-priority-progress-ring" style={{ "--progress": `${progressoDia * 3.6}deg` } as CSSProperties}>
              <span>{progressoDia}%</span>
            </div>
            <div><strong>{concluidosHoje}</strong><span>interações registradas hoje</span></div>
          </div>
        </section>

        <section className="fs-attention-metrics fs-attention-metrics--six">
          <CardIndicador titulo="Monitorados" valor={lista.length} detalhe="Leads ativos" icon={Users} tom="slate" />
          <CardIndicador titulo="Atrasados" valor={atrasados.length} detalhe="Resolver primeiro" icon={AlertTriangle} tom="red" />
          <CardIndicador titulo="Retornos hoje" valor={hoje.length} detalhe="Agenda do dia" icon={CalendarClock} tom="blue" />
          <CardIndicador titulo="Sem 1º contato" valor={semContato.length} detalhe="Ligar primeiro" icon={Phone} tom="purple" />
          <CardIndicador titulo="Quentes" valor={quentes.length} detalhe="Acelerar negociação" icon={Flame} tom="orange" />
          <CardIndicador titulo="Vendas pendentes" valor={vendasPendentes.length} detalhe="Aguardar validação" icon={CheckCircle2} tom="emerald" />
        </section>

        <section className="fs-priority-sequence">
          <div>
            <p className="fs-attention-eyebrow">Sequência recomendada</p>
            <h2>O sistema organiza. O operador só precisa seguir.</h2>
          </div>
          <ol>
            {[
              ["1", "Atrasados", atrasados.length],
              ["2", "Retornos hoje", hoje.length],
              ["3", "Primeiro contato", semContato.length],
              ["4", "Leads quentes", quentes.length],
              ["5", "Vendas pendentes", vendasPendentes.length],
            ].map(([ordem, titulo, quantidade]) => (
              <li key={String(ordem)}><span>{ordem}</span><strong>{titulo}</strong><small>{quantidade}</small></li>
            ))}
          </ol>
        </section>

        <section className="fs-task-stack">
          <BlocoTarefa id="atrasados" titulo="Retornos atrasados" descricao="Passaram do horário e precisam de ação imediata." icon={AlertTriangle} leads={atrasados} ultimas={ultimas} tipo="atrasado" aberto />
          <BlocoTarefa id="retornos" titulo="Retornos de hoje" descricao="Próximas ações programadas para o dia." icon={CalendarClock} leads={hoje} ultimas={ultimas} tipo="hoje" />
          <BlocoTarefa id="primeiro-contato" titulo="Sem primeiro contato" descricao="Leads que ainda não tiveram atendimento registrado." icon={Phone} leads={semContato} ultimas={ultimas} tipo="sem-contato" />
          <BlocoTarefa id="quentes" titulo="Leads quentes" descricao="Clientes com sinal claro de intenção comercial." icon={Flame} leads={quentes} ultimas={ultimas} tipo="quente" />
          <BlocoTarefa id="vendas" titulo="Vendas pendentes" descricao="Negociações aguardando validação ou fechamento." icon={ShieldCheck} leads={vendasPendentes} ultimas={ultimas} tipo="venda" />
          <BlocoTarefa id="acompanhamento" titulo="Acompanhamento geral" descricao="Leads ativos sem alerta crítico, mas que precisam de cadência." icon={TrendingUp} leads={acompanhando} ultimas={ultimas} tipo="normal" />
        </section>
      </div>
    </main>
  );
}
