import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Gauge,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
  const estilos = {
    red: "border-red-100 bg-red-50 text-red-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tom];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-500">{titulo}</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">{valor}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">{detalhe}</p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${estilos}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
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

  const estilo = {
    atrasado: "border-red-100 bg-red-50 text-red-700",
    hoje: "border-blue-100 bg-blue-50 text-blue-700",
    "sem-contato": "border-purple-100 bg-purple-50 text-purple-700",
    quente: "border-orange-100 bg-orange-50 text-orange-700",
    venda: "border-emerald-100 bg-emerald-50 text-emerald-700",
    normal: "border-slate-200 bg-slate-50 text-slate-600",
  }[tipo];

  const label = {
    atrasado: "Atrasado",
    hoje: "Retorno hoje",
    "sem-contato": "1º contato",
    quente: "Lead quente",
    venda: "Venda pendente",
    normal: "Acompanhar",
  }[tipo];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.7fr_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/leads/${lead.id}`}
              className="truncate text-base font-black text-slate-950 transition hover:text-blue-700"
            >
              {lead.nome}
            </Link>

            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${estilo}`}>
              {label}
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600">
              {normalizarTexto(lead.etapa)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-blue-700" />
              {lead.telefone}
            </span>
            {lead.veiculo_interesse ? <span>{lead.veiculo_interesse}</span> : null}
            {lead.origem ? <span>Origem: {lead.origem}</span> : null}
          </div>

          {lead.observacao ? (
            <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
              {lead.observacao}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
              Próxima ação
            </span>
            <span className={isAtrasado(lead.data_proxima_acao) ? "text-red-700" : "text-slate-700"}>
              {formatarData(lead.data_proxima_acao)}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
              Último resultado
            </span>
            <span>{ultima ? labelResultado(ultima.resultado) : "Sem histórico"}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
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
      </div>
    </article>
  );
}

function BlocoTarefa({
  titulo,
  descricao,
  icon: Icon,
  leads,
  ultimas,
  tipo,
}: {
  titulo: string;
  descricao: string;
  icon: any;
  leads: Lead[];
  ultimas: Map<string, InteracaoResumo>;
  tipo: "atrasado" | "hoje" | "sem-contato" | "quente" | "venda" | "normal";
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Icon className="h-5 w-5 text-blue-700" />
            {titulo}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{descricao}</p>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
          {leads.length} lead(s)
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
          Nenhum lead nesta categoria agora.
        </div>
      ) : (
        <div className="grid gap-3">
          {leads.slice(0, 15).map((lead) => (
            <CardLead key={lead.id} lead={lead} ultima={ultimas.get(lead.id)} tipo={tipo} />
          ))}
        </div>
      )}
    </section>
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

  return (
    
      <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[1500px]">
          <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="p-6">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                  Central operacional
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                  Minhas tarefas
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                  Painel prático do atendente com ordem de prioridade, foco do dia, alertas e atalhos para agir rápido sem perder histórico.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/leads"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    Ver todos os leads
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/dashboard/leads/novo"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
                  >
                    Solicitar novo lead
                  </Link>

                  <Link
                    href="/dashboard/leads?temperatura=quente"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 text-sm font-black text-red-700 transition hover:bg-red-100"
                  >
                    <Flame className="h-4 w-4" />
                    Ver quentes
                  </Link>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-950 p-6 text-white xl:border-l xl:border-t-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                      Foco recomendado
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {atrasados.length > 0
                        ? "Resolver atrasados primeiro"
                        : hoje.length > 0
                          ? "Executar retornos de hoje"
                          : semContato.length > 0
                            ? "Fazer primeiros contatos"
                            : "Manter cadência"}
                    </h2>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                    <Target className="h-7 w-7 text-blue-200" />
                  </div>
                </div>

                <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
                  {atrasados.length > 0
                    ? `Você tem ${atrasados.length} retorno(s) atrasado(s). Comece por eles para não perder oportunidade.`
                    : hoje.length > 0
                      ? `Hoje existem ${hoje.length} retorno(s) programado(s). Trabalhe por horário e registre tudo.`
                      : semContato.length > 0
                        ? `${semContato.length} lead(s) ainda não tiveram primeiro contato registrado.`
                        : "Sem alerta crítico no momento. Continue acompanhando leads quentes e oportunidades."}
                </p>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-300">
                    <span>Progresso do dia</span>
                    <span>{progressoDia}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${progressoDia}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {concluidosHoje} interação(ões) registrada(s) hoje.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <CardIndicador titulo="Monitorados" valor={lista.length} detalhe="Leads ativos na fila" icon={Users} tom="slate" />
            <CardIndicador titulo="Atrasados" valor={atrasados.length} detalhe="Atacar primeiro" icon={AlertTriangle} tom="red" />
            <CardIndicador titulo="Retornos hoje" valor={hoje.length} detalhe="Agenda do dia" icon={CalendarClock} tom="blue" />
            <CardIndicador titulo="Sem 1º contato" valor={semContato.length} detalhe="Regra: ligar primeiro" icon={Phone} tom="purple" />
            <CardIndicador titulo="Quentes" valor={quentes.length} detalhe="Alta chance comercial" icon={Flame} tom="orange" />
            <CardIndicador titulo="Vendas pendentes" valor={vendasPendentes.length} detalhe="Aguardando validação" icon={CheckCircle2} tom="emerald" />
          </section>

          <section className="mb-5 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <Gauge className="h-5 w-5 text-blue-700" />
                Régua de prioridade
              </h2>

              <div className="mt-4 grid gap-3">
                {[
                  ["1", "Atrasados", "Retornos que passaram do horário"],
                  ["2", "Retornos de hoje", "Agenda operacional do dia"],
                  ["3", "Sem primeiro contato", "Ligar antes de WhatsApp"],
                  ["4", "Leads quentes", "Simulação, visita ou intenção forte"],
                  ["5", "Vendas pendentes", "Acompanhar validação"],
                ].map(([ordem, titulo, descricao]) => (
                  <div key={ordem} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-black text-white">
                      {ordem}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950">{titulo}</p>
                      <p className="text-xs font-semibold text-slate-500">{descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <BarChart3 className="h-5 w-5 text-blue-700" />
                Raio-x rápido da fila
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Prioritários</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{totalPrioritario}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Ações com atenção hoje</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Acompanhando</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{acompanhando.length}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Sem alerta crítico</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Interações hoje</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{concluidosHoje}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Registros feitos no dia</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-blue-800">
                  <Zap className="h-4 w-4" />
                  Próxima melhor ação da operação
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                  {atrasados.length > 0
                    ? "Abrir a lista de atrasados, ligar para cada cliente e registrar o resultado com próxima ação."
                    : hoje.length > 0
                      ? "Executar os retornos do dia, começando pelo horário mais próximo."
                      : semContato.length > 0
                        ? "Iniciar primeiros contatos por telefone e registrar tentativa antes de WhatsApp."
                        : quentes.length > 0
                          ? "Acelerar leads quentes com simulação, confirmação de veículo e visita."
                          : "Manter cadência de acompanhamento e registrar próximos passos."}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-5">
            <BlocoTarefa
              titulo="Retornos atrasados"
              descricao="Leads que já passaram do horário de retorno. Prioridade máxima."
              icon={AlertTriangle}
              leads={atrasados}
              ultimas={ultimas}
              tipo="atrasado"
            />

            <BlocoTarefa
              titulo="Retornos de hoje"
              descricao="Leads com próxima ação marcada para hoje."
              icon={CalendarClock}
              leads={hoje}
              ultimas={ultimas}
              tipo="hoje"
            />

            <BlocoTarefa
              titulo="Sem primeiro contato"
              descricao="Leads que ainda não tiveram atendimento registrado. Regra: ligar primeiro."
              icon={Phone}
              leads={semContato}
              ultimas={ultimas}
              tipo="sem-contato"
            />

            <BlocoTarefa
              titulo="Leads quentes"
              descricao="Clientes com intenção forte: simulação, visita, veículo ou oportunidade clara."
              icon={Flame}
              leads={quentes}
              ultimas={ultimas}
              tipo="quente"
            />

            <BlocoTarefa
              titulo="Vendas pendentes"
              descricao="Leads que precisam de validação ou acompanhamento de fechamento."
              icon={ShieldCheck}
              leads={vendasPendentes}
              ultimas={ultimas}
              tipo="venda"
            />

            <BlocoTarefa
              titulo="Acompanhamento geral"
              descricao="Leads ativos sem alerta crítico, mas que ainda precisam de cadência."
              icon={TrendingUp}
              leads={acompanhando}
              ultimas={ultimas}
              tipo="normal"
            />
          </div>
        </div>
      </main>
    
  );
}

