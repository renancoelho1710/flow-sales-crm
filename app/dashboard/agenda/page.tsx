import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Route,
  ShieldCheck,
  TimerReset,
  UserCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  telefone_normalizado: string | null;
  email: string | null;
  origem: string | null;
  campanha: string | null;
  etapa: string | null;
  temperatura: string | null;
  veiculo_interesse: string | null;
  observacao: string | null;
  vendedor_c2s_nome: string | null;
  loja_carteira_c2s_nome: string | null;
  atendente_resgate_nome: string | null;
  loja_visita_nome: string | null;
};

type UsuarioResumo = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string | null;
};

type Agendamento = {
  id: string;
  lead_id: string;
  usuario_id: string | null;
  criado_por: string | null;
  atualizado_por: string | null;
  titulo: string;
  tipo: string;
  inicio: string;
  fim: string | null;
  status: string;
  observacao: string | null;
  veiculo_interesse: string | null;
  origem: string | null;
  c2s_sync_status: string | null;
  criado_em: string;
  vendedor_c2s_id: string | null;
  vendedor_c2s_nome: string | null;
  vendedor_c2s_email: string | null;
  loja_carteira_c2s_id: string | null;
  loja_carteira_c2s_nome: string | null;
  loja_visita_c2s_id: string | null;
  loja_visita_nome: string | null;
  atendente_resgate_id: string | null;
  atendente_resgate_nome: string | null;
  comissao_resgate_valor: number | null;
  comissao_resgate_status: string | null;
};

function inicioHoje() {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  return data;
}

function fimHoje() {
  const data = new Date();
  data.setHours(23, 59, 59, 999);
  return data;
}

function fimSeteDias() {
  const data = new Date();
  data.setDate(data.getDate() + 7);
  data.setHours(23, 59, 59, 999);
  return data;
}

function isAtrasado(valor: string | null) {
  if (!valor) return false;
  return new Date(valor).getTime() < Date.now();
}

function isHoje(valor: string | null) {
  if (!valor) return false;
  const data = new Date(valor);
  return data >= inicioHoje() && data <= fimHoje();
}

function isProximos7Dias(valor: string | null) {
  if (!valor) return false;
  const data = new Date(valor);
  return data > fimHoje() && data <= fimSeteDias();
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

function formatarHora(valor: string | null) {
  if (!valor) return "--:--";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function formatarDinheiro(valor: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function normalizarTexto(valor: string | null | undefined) {
  if (!valor) return "Não informado";

  return valor
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function telefoneWhatsapp(lead?: Lead) {
  const digits = (lead?.telefone_normalizado || lead?.telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function statusClasse(status: string | null) {
  if (status === "confirmado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelado") return "border-red-200 bg-red-50 text-red-700";
  if (status === "remarcado") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "concluido" || status === "realizado") return "border-green-200 bg-green-50 text-green-700";
  if (status === "nao_compareceu") return "border-red-200 bg-red-50 text-red-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function tipoClasse(tipo: string | null) {
  if (tipo === "visita") return "border-violet-200 bg-violet-50 text-violet-700";
  if (tipo === "test_drive") return "border-orange-200 bg-orange-50 text-orange-700";
  if (tipo === "ligacao") return "border-blue-200 bg-blue-50 text-blue-700";
  if (tipo === "entrega") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function temperaturaClasse(valor?: string | null) {
  if (valor === "quente") return "border-red-200 bg-red-50 text-red-700";
  if (valor === "frio") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function prioridadeAgendamento(agendamento: Agendamento) {
  if (isAtrasado(agendamento.inicio) && agendamento.status === "agendado") return "Crítico";
  if (!agendamento.vendedor_c2s_nome && !agendamento.vendedor_c2s_id) return "Revisar C2S";
  if (!agendamento.loja_visita_nome && !agendamento.loja_visita_c2s_id) return "Definir loja";
  if (isHoje(agendamento.inicio)) return "Hoje";
  return "Acompanhar";
}

function prioridadeClasse(valor: string) {
  if (valor === "Crítico") return "border-red-200 bg-red-50 text-red-700";
  if (valor === "Revisar C2S") return "border-orange-200 bg-orange-50 text-orange-700";
  if (valor === "Definir loja") return "border-amber-200 bg-amber-50 text-amber-700";
  if (valor === "Hoje") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function KpiCard({
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{titulo}</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{valor}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{detalhe}</p>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${estilos}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 line-clamp-1 text-xs font-black ${alerta ? "text-orange-600" : "text-slate-700"}`}>
        {valor}
      </p>
    </div>
  );
}

function AgendamentoRow({
  agendamento,
  lead,
  criador,
}: {
  agendamento: Agendamento;
  lead?: Lead;
  criador?: UsuarioResumo;
}) {
  const whatsapp = telefoneWhatsapp(lead);
  const prioridade = prioridadeAgendamento(agendamento);
  const vendedorCarteira = agendamento.vendedor_c2s_nome || lead?.vendedor_c2s_nome || "";
  const lojaCarteira = agendamento.loja_carteira_c2s_nome || lead?.loja_carteira_c2s_nome || "";
  const atendenteResgate = agendamento.atendente_resgate_nome || lead?.atendente_resgate_nome || criador?.nome || "";
  const lojaVisita = agendamento.loja_visita_nome || lead?.loja_visita_nome || "";
  const atrasado = isAtrasado(agendamento.inicio) && agendamento.status === "agendado";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/5">
      <div className="grid gap-0 xl:grid-cols-[112px_1.1fr_1.15fr_190px]">
        <div className={`flex flex-col justify-between border-b border-slate-100 p-4 xl:border-b-0 xl:border-r ${atrasado ? "bg-red-50" : "bg-slate-50"}`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-wide ${atrasado ? "text-red-600" : "text-slate-400"}`}>
              {atrasado ? "Atrasado" : "Horário"}
            </p>
            <p className={`mt-1 text-3xl font-black tracking-[-0.06em] ${atrasado ? "text-red-700" : "text-slate-950"}`}>
              {formatarHora(agendamento.inicio)}
            </p>
            <p className={`mt-1 text-[11px] font-black ${atrasado ? "text-red-600" : "text-slate-500"}`}>
              {formatarData(agendamento.inicio)}
            </p>
          </div>
        </div>

        <div className="border-b border-slate-100 p-4 xl:border-b-0 xl:border-r">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/leads/${agendamento.lead_id}`}
              className="line-clamp-1 text-base font-black text-slate-950 transition hover:text-blue-700"
            >
              {lead?.nome || "Lead não localizado"}
            </Link>

            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${prioridadeClasse(prioridade)}`}>
              {prioridade}
            </span>

            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClasse(agendamento.status)}`}>
              {normalizarTexto(agendamento.status)}
            </span>

            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${tipoClasse(agendamento.tipo)}`}>
              {normalizarTexto(agendamento.tipo)}
            </span>

            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${temperaturaClasse(lead?.temperatura)}`}>
              {normalizarTexto(lead?.temperatura || "morno")}
            </span>
          </div>

          <p className="mt-2 text-sm font-black text-slate-700">{agendamento.titulo}</p>

          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
            {lead?.telefone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-blue-700" />
                {lead.telefone}
              </span>
            ) : null}

            {lead?.origem ? <span>Origem: {normalizarTexto(lead.origem)}</span> : null}
            {lead?.etapa ? <span>Etapa: {normalizarTexto(lead.etapa)}</span> : null}
          </div>

          {(lead?.veiculo_interesse || agendamento.veiculo_interesse) ? (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Veículo de interesse</p>
              <p className="mt-1 line-clamp-1 text-xs font-black text-slate-700">
                {lead?.veiculo_interesse || agendamento.veiculo_interesse}
              </p>
            </div>
          ) : null}

          {agendamento.observacao ? (
            <div className="mt-3 rounded-xl border border-slate-100 bg-white px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Observação do resgate</p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">
                {agendamento.observacao}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-2 xl:border-b-0 xl:border-r">
          <InfoBox label="Vendedor da carteira C2S" valor={vendedorCarteira || "Sem vendedor C2S"} alerta={!vendedorCarteira} />
          <InfoBox label="Loja/carteira" valor={lojaCarteira || "Sem loja C2S"} alerta={!lojaCarteira} />
          <InfoBox label="Atendente do resgate" valor={atendenteResgate || "Não identificado"} alerta={!atendenteResgate} />
          <InfoBox label="Loja da visita" valor={lojaVisita || "Ainda não definida"} alerta={!lojaVisita} />
          <InfoBox label="Comissão resgate" valor={`${formatarDinheiro(agendamento.comissao_resgate_valor)} • ${normalizarTexto(agendamento.comissao_resgate_status || "pendente")}`} />
          <InfoBox label="Integração C2S" valor={normalizarTexto(agendamento.c2s_sync_status || "pendente")} alerta={(agendamento.c2s_sync_status || "pendente") === "pendente"} />
        </div>

        <div className="flex flex-col justify-between gap-3 p-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Criado por</p>
            <p className="mt-1 line-clamp-1 text-xs font-black text-slate-700">{criador?.nome || "Não identificado"}</p>
          </div>

          <div className="grid gap-2">
            {lead?.telefone ? (
              <a
                href={`tel:${lead.telefone}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
              >
                <Phone className="mr-1 h-3.5 w-3.5" />
                Ligar
              </a>
            ) : null}

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
              href={`/dashboard/leads/${agendamento.lead_id}`}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-blue-700"
            >
              Abrir lead
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function ListaOperacional({
  titulo,
  descricao,
  agendamentos,
  leadsPorId,
  usuariosPorId,
  destaque,
}: {
  titulo: string;
  descricao: string;
  agendamentos: Agendamento[];
  leadsPorId: Map<string, Lead>;
  usuariosPorId: Map<string, UsuarioResumo>;
  destaque?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <CalendarClock className="h-5 w-5 text-blue-700" />
            {titulo}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{descricao}</p>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-black ${destaque ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          {agendamentos.length} item(ns)
        </span>
      </div>

      <div className="p-4">
        {agendamentos.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
            Nenhum agendamento nesta fila agora.
          </div>
        ) : (
          <div className="grid gap-3">
            {agendamentos.map((agendamento) => (
              <AgendamentoRow
                key={agendamento.id}
                agendamento={agendamento}
                lead={leadsPorId.get(agendamento.lead_id)}
                criador={agendamento.criado_por ? usuariosPorId.get(agendamento.criado_por) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PainelLateral({
  atrasados,
  hoje,
  semVendedorC2S,
  semLojaVisita,
  pendentesC2S,
}: {
  atrasados: Agendamento[];
  hoje: Agendamento[];
  semVendedorC2S: Agendamento[];
  semLojaVisita: Agendamento[];
  pendentesC2S: Agendamento[];
}) {
  const itens = [
    {
      titulo: "Atrasados",
      valor: atrasados.length,
      texto: "Resolver primeiro",
      classe: "border-red-200 bg-red-50 text-red-700",
      icon: AlertTriangle,
    },
    {
      titulo: "Hoje",
      valor: hoje.length,
      texto: "Ordem de horário",
      classe: "border-blue-200 bg-blue-50 text-blue-700",
      icon: Clock3,
    },
    {
      titulo: "Sem vendedor C2S",
      valor: semVendedorC2S.length,
      texto: "Revisar importação",
      classe: "border-orange-200 bg-orange-50 text-orange-700",
      icon: UserCheck,
    },
    {
      titulo: "Sem loja visita",
      valor: semLojaVisita.length,
      texto: "Definir local do veículo",
      classe: "border-amber-200 bg-amber-50 text-amber-700",
      icon: MapPin,
    },
    {
      titulo: "C2S pendente",
      valor: pendentesC2S.length,
      texto: "Envio futuro ao C2S",
      classe: "border-purple-200 bg-purple-50 text-purple-700",
      icon: ShieldCheck,
    },
  ];

  return (
    <aside className="grid gap-4">
      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-blue-200">Comando rápido</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Prioridade da operação</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          Use esta lateral como fila de decisão: atraso primeiro, depois agenda do dia, depois pendências de C2S e loja da visita.
        </p>
      </section>

      {itens.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.titulo} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-500">{item.titulo}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{item.valor}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{item.texto}</p>
              </div>

              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${item.classe}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </aside>
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

  const { data: agendamentosData } = await supabase
    .from("lead_agendamentos")
    .select(
      `
      id,
      lead_id,
      usuario_id,
      criado_por,
      atualizado_por,
      titulo,
      tipo,
      inicio,
      fim,
      status,
      observacao,
      veiculo_interesse,
      origem,
      c2s_sync_status,
      criado_em,
      vendedor_c2s_id,
      vendedor_c2s_nome,
      vendedor_c2s_email,
      loja_carteira_c2s_id,
      loja_carteira_c2s_nome,
      loja_visita_c2s_id,
      loja_visita_nome,
      atendente_resgate_id,
      atendente_resgate_nome,
      comissao_resgate_valor,
      comissao_resgate_status
      `
    )
    .order("inicio", { ascending: true })
    .limit(250);

  const agendamentos = (agendamentosData || []) as Agendamento[];
  const leadIds = Array.from(new Set(agendamentos.map((item) => item.lead_id).filter(Boolean)));
  const usuarioIds = Array.from(
    new Set(
      agendamentos
        .flatMap((item) => [item.criado_por, item.usuario_id, item.atendente_resgate_id])
        .filter(Boolean) as string[]
    )
  );

  const { data: leadsData } = leadIds.length
    ? await supabase
        .from("leads")
        .select(
          `
          id,
          nome,
          telefone,
          telefone_normalizado,
          email,
          origem,
          campanha,
          etapa,
          temperatura,
          veiculo_interesse,
          observacao,
          vendedor_c2s_nome,
          loja_carteira_c2s_nome,
          atendente_resgate_nome,
          loja_visita_nome
          `
        )
        .in("id", leadIds)
    : { data: [] as Lead[] };

  const { data: usuariosData } = usuarioIds.length
    ? await supabase
        .from("usuarios_internos")
        .select("id, nome, email, perfil")
        .in("id", usuarioIds)
    : { data: [] as UsuarioResumo[] };

  const leadsPorId = new Map<string, Lead>();
  for (const lead of leadsData || []) {
    leadsPorId.set(lead.id, lead as Lead);
  }

  const usuariosPorId = new Map<string, UsuarioResumo>();
  for (const usuario of usuariosData || []) {
    usuariosPorId.set(usuario.id, usuario as UsuarioResumo);
  }

  const ativos = agendamentos.filter((item) => !["cancelado", "concluido", "realizado"].includes(item.status));
  const atrasados = ativos.filter((item) => isAtrasado(item.inicio));
  const hoje = ativos.filter((item) => isHoje(item.inicio) && !isAtrasado(item.inicio));
  const proximos7 = ativos.filter((item) => isProximos7Dias(item.inicio));
  const semVendedorC2S = ativos.filter((item) => !item.vendedor_c2s_id && !item.vendedor_c2s_nome);
  const semLojaVisita = ativos.filter((item) => !item.loja_visita_nome && !item.loja_visita_c2s_id);
  const pendentesC2S = ativos.filter((item) => (item.c2s_sync_status || "pendente") === "pendente");
  const criadosKanban = ativos.filter((item) => item.origem === "kanban");
  const visitas = ativos.filter((item) => item.tipo === "visita");
  const retornos = ativos.filter((item) => item.tipo === "retorno");

  return (
    <DashboardShell usuario={usuarioInterno} activeTab="agenda-hoje">
      <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-[1600px]">
          <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-white px-6 py-6">
              <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Flow Sales CRM</p>
                  <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                    Agenda operacional do resgate
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                    Fila de visitas, retornos e próximas ações. O resgate trabalha o lead no Flow, mantendo o vendedor original da carteira C2S como responsável comercial.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/dashboard/kanban"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
                  >
                    Kanban
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/dashboard/leads/tarefas"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    Minhas tarefas
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-3 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-6">
              <KpiCard titulo="Agendamentos" valor={ativos.length} detalhe="Ativos monitorados" icon={CalendarClock} tom="slate" />
              <KpiCard titulo="Atrasados" valor={atrasados.length} detalhe="Fila crítica" icon={AlertTriangle} tom="red" />
              <KpiCard titulo="Hoje" valor={hoje.length} detalhe="Agenda do dia" icon={Clock3} tom="blue" />
              <KpiCard titulo="Próx. 7 dias" valor={proximos7.length} detalhe="Planejamento" icon={TimerReset} tom="emerald" />
              <KpiCard titulo="Sem loja visita" valor={semLojaVisita.length} detalhe="Definir local" icon={MapPin} tom="orange" />
              <KpiCard titulo="C2S pendente" valor={pendentesC2S.length} detalhe="Integração futura" icon={ShieldCheck} tom="purple" />
            </div>
          </section>

          <section className="mb-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <Route className="h-5 w-5 text-blue-700" />
                Regra operacional do resgate
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">1. Atendente resgate</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Liga, conversa, registra histórico e agenda pelo Flow.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">2. Vendedor C2S</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Continua dono da carteira e responsável pela venda.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">3. Loja visita</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Pode ser diferente da loja/carteira do vendedor.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <BarChart3 className="h-5 w-5 text-blue-700" />
                Leitura executiva
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <InfoBox label="Origem Kanban" valor={`${criadosKanban.length} item(ns)`} />
                <InfoBox label="Visitas" valor={`${visitas.length} item(ns)`} />
                <InfoBox label="Retornos" valor={`${retornos.length} item(ns)`} />
                <InfoBox label="Sem vendedor C2S" valor={`${semVendedorC2S.length} item(ns)`} alerta={semVendedorC2S.length > 0} />
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <div className="grid gap-5">
              <ListaOperacional
                titulo="Fila crítica"
                descricao="Agendamentos atrasados ou que exigem ação imediata. Resolver antes do restante."
                agendamentos={atrasados}
                leadsPorId={leadsPorId}
                usuariosPorId={usuariosPorId}
                destaque
              />

              <ListaOperacional
                titulo="Agenda de hoje"
                descricao="Operação do dia em ordem de horário. Confirmar presença e registrar resultado."
                agendamentos={hoje}
                leadsPorId={leadsPorId}
                usuariosPorId={usuariosPorId}
              />

              <ListaOperacional
                titulo="Próximos 7 dias"
                descricao="Planejamento da semana para resgate, confirmação e acompanhamento comercial."
                agendamentos={proximos7}
                leadsPorId={leadsPorId}
                usuariosPorId={usuariosPorId}
              />

              <ListaOperacional
                titulo="Pendências operacionais"
                descricao="Itens sem vendedor C2S ou sem loja de visita definida. Precisam de revisão antes do atendimento."
                agendamentos={[...semVendedorC2S, ...semLojaVisita].filter(
                  (item, index, lista) => lista.findIndex((comparar) => comparar.id === item.id) === index
                )}
                leadsPorId={leadsPorId}
                usuariosPorId={usuariosPorId}
              />
            </div>

            <PainelLateral
              atrasados={atrasados}
              hoje={hoje}
              semVendedorC2S={semVendedorC2S}
              semLojaVisita={semLojaVisita}
              pendentesC2S={pendentesC2S}
            />
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}
