import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileSearch,
  History,
  Link2,
  MessageCircle,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  ShieldCheck,
  Tags,
  Timer,
  UserRound,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export type AbaTelefonia =
  "monitor" | "ligacoes" | "historico" | "classificacoes";

type Registro = Record<string, unknown>;

type CardResumoProps = {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icon: LucideIcon;
  tom: "blue" | "emerald" | "orange" | "red" | "slate";
};

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function booleano(valor: unknown) {
  if (typeof valor === "boolean") return valor;

  const normalizado = texto(valor).toLowerCase();

  return ["true", "1", "sim", "s", "yes"].includes(normalizado);
}

function dataDoRegistro(registro: Registro) {
  return (
    texto(registro["criado_em"]) ||
    texto(registro["created_at"]) ||
    texto(registro["atualizado_em"]) ||
    texto(registro["status_operacional_atualizado_em"])
  );
}

function formatarDataHora(valor: unknown) {
  const bruto = texto(valor);

  if (!bruto) return "Sem horário";

  const data = new Date(bruto);

  if (Number.isNaN(data.getTime())) return "Sem horário";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function ehHoje(valor: unknown) {
  const bruto = texto(valor);

  if (!bruto) return false;

  const data = new Date(bruto);

  if (Number.isNaN(data.getTime())) return false;

  const hoje = new Date();

  const formato = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return formato.format(data) === formato.format(hoje);
}

function statusDoUsuario(usuario: Registro) {
  const administrativo = texto(usuario["status_administrativo"]).toLowerCase();
  const operacional = texto(usuario["status_operacional"]).toLowerCase();

  if (administrativo && administrativo !== "disponivel") {
    return administrativo;
  }

  return operacional || "disponivel";
}

function statusLabel(status: string) {
  const mapa: Record<string, string> = {
    disponivel: "Disponível",
    em_ligacao: "Em ligação",
    pausa_almoco: "Pausa almoço",
    pausa_feedback: "Pausa feedback",
    indisponivel: "Indisponível",
    ausente: "Ausente",
    ocupado: "Ocupado",
  };

  return mapa[status] || status.replaceAll("_", " ");
}

function statusVisual(status: string) {
  if (status === "em_ligacao") {
    return {
      badge: "border-orange-200 bg-orange-50 text-orange-700",
      ponto: "bg-orange-500",
      card: "border-orange-200",
    };
  }

  if (status === "disponivel") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      ponto: "bg-emerald-500",
      card: "border-emerald-200",
    };
  }

  if (
    status.includes("pausa") ||
    status.includes("indisponivel") ||
    status.includes("ausente")
  ) {
    return {
      badge: "border-red-200 bg-red-50 text-red-700",
      ponto: "bg-red-500",
      card: "border-red-200",
    };
  }

  return {
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    ponto: "bg-slate-400",
    card: "border-slate-200",
  };
}

function eventoLabel(evento: Registro) {
  const statusNovo = texto(evento["status_novo"]).toLowerCase();

  if (statusNovo === "em_ligacao") return "Ligação iniciada";
  if (statusNovo === "disponivel") return "Ligação finalizada";

  return statusNovo ? statusLabel(statusNovo) : "Evento 3CX";
}

function usuarioNome(evento: Registro, usuarios: Registro[]) {
  const usuarioId = texto(evento["usuario_id"]);

  const usuario = usuarios.find((item) => texto(item["id"]) === usuarioId);

  return (
    texto(usuario?.["nome"]) ||
    texto(evento["usuario_nome"]) ||
    "Operador não identificado"
  );
}

function CardResumo({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tom,
}: CardResumoProps) {
  const tons = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {titulo}
          </p>
          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">
            {valor}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {detalhe}
          </p>
        </div>

        <div
          className={`grid h-12 w-12 place-items-center rounded-2xl border ${tons[tom]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function Abas({ aba }: { aba: AbaTelefonia }) {
  const itemBase =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition";

  const itens = [
    {
      aba: "monitor",
      label: "Monitor",
      href: "/dashboard/3cx",
      icon: Activity,
    },
    {
      aba: "ligacoes",
      label: "Ligações",
      href: "/dashboard/3cx?aba=ligacoes",
      icon: PhoneCall,
    },
    {
      aba: "historico",
      label: "Histórico",
      href: "/dashboard/3cx/historico",
      icon: History,
    },
    {
      aba: "classificacoes",
      label: "Classificações",
      href: "/dashboard/3cx/classificacoes",
      icon: Tags,
    },
    {
      aba: "whatsapp",
      label: "WhatsApp",
      href: "/dashboard/3cx/whatsapp",
      icon: MessageCircle,
    },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {itens.map((item) => {
        const Icon = item.icon;
        const ativo = item.aba === aba;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              ativo
                ? `${itemBase} bg-slate-950 text-white shadow-lg shadow-slate-900/15`
                : `${itemBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function Operadores3CX({ operadores }: { operadores: Registro[] }) {
  if (!operadores.length) {
    return (
      <section className="rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <WifiOff className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-3 text-xl font-black text-slate-950">
          Nenhum operador encontrado
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Cadastre usuários internos para o monitor 3CX ficar completo.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
          Operadores e ramais
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Status operacional atualizado pelo Flow e pelo webhook do 3CX.
        </p>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
        {operadores.map((operador) => {
          const id = texto(operador["id"]);
          const nome = texto(operador["nome"]) || "Operador";
          const email = texto(operador["email"]);
          const ramal = texto(operador["ramal_3cx"]);
          const status = statusDoUsuario(operador);
          const visual = statusVisual(status);
          const recebeLeads = booleano(operador["recebe_leads"]);

          return (
            <article
              key={id || nome}
              className={`rounded-[26px] border bg-white p-5 shadow-sm ${visual.card}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${visual.ponto}`}
                    />
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${visual.badge}`}
                    >
                      {statusLabel(status)}
                    </span>
                  </div>

                  <h3 className="mt-4 truncate text-lg font-black text-slate-950">
                    {nome}
                  </h3>
                  <p className="mt-1 truncate text-xs font-bold text-slate-500">
                    {email || "Sem e-mail cadastrado"}
                  </p>
                </div>

                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <UserRound className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span>Ramal 3CX</span>
                  <strong className="text-slate-950">
                    {ramal || "Não cadastrado"}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span>Recebe leads</span>
                  <strong
                    className={
                      recebeLeads ? "text-emerald-700" : "text-red-700"
                    }
                  >
                    {recebeLeads ? "Sim" : "Não"}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span>Atualizado</span>
                  <strong className="text-right text-slate-950">
                    {formatarDataHora(
                      operador["status_operacional_atualizado_em"],
                    )}
                  </strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EventosLista({
  eventos,
  usuarios,
  titulo,
  descricao,
}: {
  eventos: Registro[];
  usuarios: Registro[];
  titulo: string;
  descricao: string;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
          {titulo}
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{descricao}</p>
      </div>

      {eventos.length ? (
        <div className="divide-y divide-slate-100">
          {eventos.map((evento, index) => {
            const statusNovo = texto(evento["status_novo"]).toLowerCase();
            const visual = statusVisual(statusNovo || "disponivel");

            return (
              <article key={texto(evento["id"]) || index} className="p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${visual.badge}`}
                      >
                        {eventoLabel(evento)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                        Origem: {texto(evento["origem"]) || "3cx_webhook"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-black text-slate-950">
                      {usuarioNome(evento, usuarios)}
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                      {texto(evento["motivo"]) ||
                        "Evento recebido pelo monitor 3CX."}
                    </p>
                  </div>

                  <div className="shrink-0 text-sm font-bold text-slate-500 lg:text-right">
                    <p className="inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {formatarDataHora(dataDoRegistro(evento))}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-10 text-center">
          <Clock3 className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-lg font-black text-slate-950">
            Nenhum evento encontrado
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Quando o webhook `/api/3cx/status` receber eventos, eles aparecerão
            aqui.
          </p>
        </div>
      )}
    </section>
  );
}

function ProximosPassos() {
  return (
    <aside className="space-y-5">
      <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <h2 className="font-black text-blue-950">Integração plugável</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
              A interface já fica pronta para telefonia. No próximo bloco, a
              base real de chamadas deve consultar o provedor ativo do tipo
              telefonia, permitindo trocar 3CX por outro fornecedor no futuro.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Atalhos</h2>

        <div className="mt-4 space-y-3">
          <Link
            href="/dashboard/3cx?aba=ligacoes"
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-slate-100"
          >
            <span className="inline-flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-blue-700" />
              Ligações
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/dashboard/3cx/historico"
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-slate-100"
          >
            <span className="inline-flex items-center gap-2">
              <History className="h-4 w-4 text-blue-700" />
              Histórico
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/dashboard/3cx/classificacoes"
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-slate-100"
          >
            <span className="inline-flex items-center gap-2">
              <Tags className="h-4 w-4 text-blue-700" />
              Classificações
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </aside>
  );
}

function MonitorView({
  usuarios,
  eventos,
  integracaoAtiva,
}: {
  usuarios: Registro[];
  eventos: Registro[];
  integracaoAtiva: boolean;
}) {
  const operadoresComRamal = usuarios.filter((usuario) =>
    texto(usuario["ramal_3cx"]),
  );
  const operadoresSemRamal = usuarios.length - operadoresComRamal.length;
  const operadoresEmLigacao = usuarios.filter(
    (usuario) => statusDoUsuario(usuario) === "em_ligacao",
  );
  const operadoresDisponiveis = usuarios.filter(
    (usuario) =>
      statusDoUsuario(usuario) === "disponivel" &&
      booleano(usuario["recebe_leads"]),
  );

  const eventosHoje = eventos.filter((evento) =>
    ehHoje(dataDoRegistro(evento)),
  );
  const IconeIntegracao = integracaoAtiva ? Wifi : WifiOff;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <CardResumo
          titulo="Ligações hoje"
          valor={eventosHoje.length}
          detalhe="Eventos recebidos hoje"
          icon={PhoneForwarded}
          tom="blue"
        />
        <CardResumo
          titulo="Em ligação"
          valor={operadoresEmLigacao.length}
          detalhe="Bloqueados agora"
          icon={PhoneCall}
          tom="orange"
        />
        <CardResumo
          titulo="Disponíveis"
          valor={operadoresDisponiveis.length}
          detalhe="Aptos a receber leads"
          icon={CheckCircle2}
          tom="emerald"
        />
        <CardResumo
          titulo="Operadores"
          valor={usuarios.length}
          detalhe={`${operadoresComRamal.length} com ramal`}
          icon={UsersRound}
          tom="slate"
        />
        <CardResumo
          titulo="Sem classificação"
          valor="—"
          detalhe="Próximo bloco"
          icon={PhoneMissed}
          tom="red"
        />
        <CardResumo
          titulo="Integração"
          valor={integracaoAtiva ? "Ativa" : "Off"}
          detalhe={integracaoAtiva ? "Webhook habilitado" : "Ver integrações"}
          icon={IconeIntegracao}
          tom={integracaoAtiva ? "emerald" : "red"}
        />
      </section>

      {operadoresSemRamal > 0 ? (
        <section className="rounded-[26px] border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
            <div>
              <h2 className="font-black text-orange-950">
                Existem usuários sem ramal 3CX
              </h2>
              <p className="mt-1 text-sm font-bold leading-6 text-orange-800">
                {operadoresSemRamal} usuário(s) ativo(s) ainda não têm
                ramal_3cx. Para o webhook identificar corretamente cada ligação,
                o ramal precisa estar preenchido no cadastro do usuário.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Operadores3CX operadores={usuarios} />
          <EventosLista
            eventos={eventos.slice(0, 12)}
            usuarios={usuarios}
            titulo="Últimos eventos recebidos do 3CX"
            descricao="Eventos do webhook que mudam o status operacional do operador."
          />
        </div>

        <ProximosPassos />
      </section>
    </div>
  );
}

function LigacoesView({
  eventos,
  usuarios,
}: {
  eventos: Registro[];
  usuarios: Registro[];
}) {
  const eventosHoje = eventos.filter((evento) =>
    ehHoje(dataDoRegistro(evento)),
  );
  const iniciadasHoje = eventosHoje.filter(
    (evento) => texto(evento["status_novo"]).toLowerCase() === "em_ligacao",
  );
  const finalizadasHoje = eventosHoje.filter(
    (evento) => texto(evento["status_novo"]).toLowerCase() === "disponivel",
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <CardResumo
          titulo="Ligações hoje"
          valor={eventosHoje.length}
          detalhe="Eventos do webhook"
          icon={PhoneCall}
          tom="blue"
        />
        <CardResumo
          titulo="Iniciadas"
          valor={iniciadasHoje.length}
          detalhe="Entrou em ligação"
          icon={PhoneIncoming}
          tom="orange"
        />
        <CardResumo
          titulo="Finalizadas"
          valor={finalizadasHoje.length}
          detalhe="Voltou disponível"
          icon={PhoneOff}
          tom="emerald"
        />
        <CardResumo
          titulo="Atendidas"
          valor="—"
          detalhe="Depende da base real"
          icon={CheckCircle2}
          tom="emerald"
        />
        <CardResumo
          titulo="Perdidas"
          valor="—"
          detalhe="Depende da base real"
          icon={PhoneMissed}
          tom="red"
        />
        <CardResumo
          titulo="Tempo médio"
          valor="—"
          detalhe="Próximo bloco"
          icon={Timer}
          tom="slate"
        />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              Filtros de chamadas
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Visual pronto para período, operador, status, tipo, telefone e
              lead vinculado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              disabled
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400"
            >
              <option>Hoje</option>
            </select>
            <select
              disabled
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400"
            >
              <option>Todos operadores</option>
            </select>
            <select
              disabled
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400"
            >
              <option>Todos status</option>
            </select>
            <input
              disabled
              placeholder="Telefone, lead ou cliente"
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400"
            />
          </div>
        </div>
      </section>

      <EventosLista
        eventos={eventos.slice(0, 25)}
        usuarios={usuarios}
        titulo="Prévia de ligações"
        descricao="Enquanto a base real de chamadas não é criada, esta lista usa os eventos recebidos pelo webhook de status."
      />

      <section className="rounded-[30px] border border-orange-200 bg-orange-50 p-6 shadow-sm">
        <div className="flex gap-4">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-orange-700" />
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-orange-950">
              Falta criar a base real de chamadas
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-orange-800">
              Hoje o Flow sabe quando o operador entra ou sai de ligação. Para
              atendidas, perdidas, duração, gravação, telefone, lead vinculado e
              classificação, precisamos criar as tabelas e APIs de telefonia.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function HistoricoView({
  eventos,
  usuarios,
}: {
  eventos: Registro[];
  usuarios: Registro[];
}) {
  const eventosHoje = eventos.filter((evento) =>
    ehHoje(dataDoRegistro(evento)),
  );
  const eventosInicio = eventos.filter(
    (evento) => texto(evento["status_novo"]).toLowerCase() === "em_ligacao",
  );
  const eventosFim = eventos.filter(
    (evento) => texto(evento["status_novo"]).toLowerCase() === "disponivel",
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardResumo
          titulo="Eventos hoje"
          valor={eventosHoje.length}
          detalhe="Recebidos pelo webhook"
          icon={History}
          tom="blue"
        />
        <CardResumo
          titulo="Inícios"
          valor={eventosInicio.length}
          detalhe="Operador entrou em ligação"
          icon={PhoneIncoming}
          tom="orange"
        />
        <CardResumo
          titulo="Finalizações"
          valor={eventosFim.length}
          detalhe="Operador voltou disponível"
          icon={PhoneOff}
          tom="emerald"
        />
        <CardResumo
          titulo="Auditoria"
          valor="Ativa"
          detalhe="Registro operacional"
          icon={FileSearch}
          tom="slate"
        />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              Consulta de histórico
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Estrutura preparada para consultar por lead, usuário, período,
              telefone e resultado.
            </p>
          </div>

          <Link
            href="/dashboard/sistema/auditoria"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15"
          >
            Abrir auditoria geral <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <EventosLista
        eventos={eventos}
        usuarios={usuarios}
        titulo="Histórico operacional 3CX"
        descricao="Eventos registrados a partir do webhook do 3CX."
      />
    </div>
  );
}

function ClassificacoesView({
  eventos,
  usuarios,
}: {
  eventos: Registro[];
  usuarios: Registro[];
}) {
  const classificacoes = [
    {
      titulo: "Atendimento válido",
      descricao: "Cliente falou com o operador e houve atendimento útil.",
      icon: CheckCircle2,
      tom: "emerald" as const,
    },
    {
      titulo: "Não atendeu",
      descricao: "Chamada realizada, mas cliente não atendeu.",
      icon: PhoneMissed,
      tom: "orange" as const,
    },
    {
      titulo: "Número inválido",
      descricao: "Telefone incorreto, inexistente ou sem WhatsApp/ligação.",
      icon: PhoneOff,
      tom: "red" as const,
    },
    {
      titulo: "Retorno",
      descricao: "Cliente pediu contato em outro horário.",
      icon: Clock3,
      tom: "blue" as const,
    },
    {
      titulo: "Agendamento",
      descricao: "Ligação resultou em agendamento no Flow.",
      icon: Link2,
      tom: "emerald" as const,
    },
    {
      titulo: "Venda/resgate",
      descricao: "Ligação relacionada a venda, resgate ou confirmação.",
      icon: BarChart3,
      tom: "blue" as const,
    },
    {
      titulo: "Outros",
      descricao: "Classificação manual para casos fora do padrão.",
      icon: Tags,
      tom: "slate" as const,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardResumo
          titulo="Tipos padrão"
          valor={classificacoes.length}
          detalhe="Régua operacional"
          icon={Tags}
          tom="blue"
        />
        <CardResumo
          titulo="Sem classificação"
          valor="—"
          detalhe="Entra com base real"
          icon={AlertTriangle}
          tom="orange"
        />
        <CardResumo
          titulo="Vínculos"
          valor="—"
          detalhe="Lead, agenda ou venda"
          icon={Link2}
          tom="slate"
        />
        <CardResumo
          titulo="Auditoria"
          valor="Pronta"
          detalhe="Ações serão registradas"
          icon={ShieldCheck}
          tom="emerald"
        />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
            Régua de classificação das chamadas
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Estas são as classificações que vamos usar na base real de chamadas.
          </p>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {classificacoes.map((item) => (
            <article
              key={item.titulo}
              className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-blue-700">
                  <item.icon className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-black text-slate-950">{item.titulo}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {item.descricao}
                  </p>
                  <span className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                    Preparado para salvar
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <EventosLista
        eventos={eventos.slice(0, 10)}
        usuarios={usuarios}
        titulo="Eventos aguardando base de classificação"
        descricao="Quando criarmos telefonia_chamadas e telefonia_classificacoes, os botões de classificação entram aqui."
      />
    </div>
  );
}

export async function CentralTelefoniaPage({ aba }: { aba: AbaTelefonia }) {
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
    .maybeSingle();

  if (!usuarioInterno) {
    redirect("/login");
  }

  const [{ data: usuarios }, { data: eventos }, { data: integracao3CX }] =
    await Promise.all([
      supabase
        .from("usuarios_internos")
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("usuario_status_logs")
        .select("*")
        .eq("origem", "3cx_webhook")
        .order("criado_em", { ascending: false })
        .limit(80),
      supabase
        .from("integracoes_configuracoes")
        .select("*")
        .eq("chave", "3cx")
        .maybeSingle(),
    ]);

  const usuariosNormalizados = ((usuarios || []) as Registro[]).filter(
    (usuario) => {
      const perfil = texto(usuario["perfil"]).toLowerCase();

      return !["cliente", "externo"].includes(perfil);
    },
  );

  const eventosNormalizados = (eventos || []) as Registro[];
  const integracaoAtiva = booleano(
    (integracao3CX as Registro | null)?.["ativo"],
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <div className="grid gap-0 xl:grid-cols-[1fr_380px]">
            <div className="p-6 lg:p-7">
              <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                    Central telefônica
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950 lg:text-4xl">
                    Controle 3CX
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                    Monitor operacional de ramais, ligações, histórico,
                    classificações e preparação da telefonia plugável do Flow
                    Sales.
                  </p>
                </div>

                <Link
                  href="/dashboard/configuracoes/integracoes"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
                >
                  Configurar integração
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6">
                <Abas aba={aba} />
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative z-10">
                <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/15">
                  <PhoneCall className="h-7 w-7 text-cyan-200" />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                  Operação em tempo real
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                  Telefonia conectada ao processo comercial.
                </h2>
                <p className="mt-3 text-sm font-bold leading-6 text-blue-100">
                  A ligação precisa conversar com lead, agenda, venda e resgate.
                  Esta tela prepara essa estrutura.
                </p>
              </div>
            </div>
          </div>
        </section>

        {aba === "monitor" ? (
          <MonitorView
            usuarios={usuariosNormalizados}
            eventos={eventosNormalizados}
            integracaoAtiva={integracaoAtiva}
          />
        ) : null}

        {aba === "ligacoes" ? (
          <LigacoesView
            eventos={eventosNormalizados}
            usuarios={usuariosNormalizados}
          />
        ) : null}

        {aba === "historico" ? (
          <HistoricoView
            eventos={eventosNormalizados}
            usuarios={usuariosNormalizados}
          />
        ) : null}

        {aba === "classificacoes" ? (
          <ClassificacoesView
            eventos={eventosNormalizados}
            usuarios={usuariosNormalizados}
          />
        ) : null}
      </div>
    </main>
  );
}
