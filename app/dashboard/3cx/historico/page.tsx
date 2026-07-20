import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  History,
  Link2,
  MessageCircle,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Search,
  ShieldCheck,
  Tags,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Registro = Record<string, unknown>;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type LinhaHistorico = {
  id: string;
  tipo: "chamada" | "classificacao" | "vinculo";
  titulo: string;
  detalhe: string;
  data: string;
  chamada: Registro;
  referencia?: Registro;
  tom: "blue" | "emerald" | "orange" | "red" | "slate";
};

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function parametro(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? texto(valor[0]) : texto(valor);
}

function numero(valor: unknown) {
  const convertido = Number(valor);

  return Number.isFinite(convertido) ? convertido : 0;
}

function dataValida(valor: unknown) {
  const bruto = texto(valor);

  if (!bruto) return null;

  const data = new Date(bruto);

  if (Number.isNaN(data.getTime())) return null;

  return data;
}

function dataDaChamada(chamada: Registro) {
  return (
    texto(chamada.iniciou_em) ||
    texto(chamada.criado_em) ||
    texto(chamada.atualizado_em)
  );
}

function formatarDataHora(valor: unknown) {
  const data = dataValida(valor);

  if (!data) return "Sem horário";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function ehHoje(valor: unknown) {
  const data = dataValida(valor);

  if (!data) return false;

  const hoje = new Date();

  const formato = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return formato.format(data) === formato.format(hoje);
}

function dentroDosUltimosDias(valor: unknown, dias: number) {
  const data = dataValida(valor);

  if (!data) return false;

  const limite = new Date();
  limite.setDate(limite.getDate() - dias);

  return data >= limite;
}

function statusChamadaLabel(status: unknown) {
  const normalizado = texto(status).toLowerCase();

  const mapa: Record<string, string> = {
    registrada: "Registrada",
    tocando: "Tocando",
    em_andamento: "Em andamento",
    atendida: "Atendida",
    perdida: "Perdida",
    ocupado: "Ocupado",
    falhou: "Falhou",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };

  return mapa[normalizado] || normalizado.replaceAll("_", " ");
}

function direcaoLabel(direcao: unknown) {
  const normalizado = texto(direcao).toLowerCase();

  const mapa: Record<string, string> = {
    entrada: "Entrada",
    saida: "Saída",
    interna: "Interna",
    desconhecida: "Não informada",
  };

  return mapa[normalizado] || normalizado || "Não informada";
}

function classificacaoLabel(valor: unknown) {
  const normalizado = texto(valor);

  const mapa: Record<string, string> = {
    atendimento_valido: "Atendimento válido",
    nao_atendeu: "Não atendeu",
    numero_invalido: "Número inválido",
    retorno: "Retorno",
    agendamento: "Agendamento",
    venda_resgate: "Venda/resgate",
    outros: "Outros",
  };

  return (
    mapa[normalizado] || normalizado.replaceAll("_", " ") || "Sem classificação"
  );
}

function vinculoLabel(valor: unknown) {
  const normalizado = texto(valor);

  const mapa: Record<string, string> = {
    lead: "Lead",
    cliente: "Cliente",
    agendamento: "Agendamento",
    venda: "Venda",
  };

  return mapa[normalizado] || normalizado || "Vínculo";
}

function statusTom(status: unknown): LinhaHistorico["tom"] {
  const normalizado = texto(status).toLowerCase();

  if (["finalizada", "atendida"].includes(normalizado)) return "emerald";
  if (["perdida", "falhou", "cancelada"].includes(normalizado)) return "red";
  if (["tocando", "em_andamento"].includes(normalizado)) return "orange";

  return "blue";
}

function telefoneFormatado(valor: unknown) {
  const numeros = texto(valor).replace(/\D/g, "");

  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }

  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return texto(valor) || "Sem telefone";
}

function formatarDuracao(segundos: unknown) {
  const total = numero(segundos);

  if (!total) return "—";

  if (total < 60) return `${total}s`;

  const minutos = Math.floor(total / 60);
  const resto = total % 60;

  if (minutos < 60) return resto ? `${minutos}min ${resto}s` : `${minutos}min`;

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  return minutosRestantes ? `${horas}h ${minutosRestantes}min` : `${horas}h`;
}

function usuarioNome(usuarioId: unknown, usuarios: Registro[]) {
  const usuario = usuarios.find((item) => texto(item.id) === texto(usuarioId));

  return texto(usuario?.nome) || "Operador não identificado";
}

function usuarioEmail(usuarioId: unknown, usuarios: Registro[]) {
  const usuario = usuarios.find((item) => texto(item.id) === texto(usuarioId));

  return texto(usuario?.email);
}

function iconPorTipo(tipo: LinhaHistorico["tipo"]): LucideIcon {
  if (tipo === "classificacao") return Tags;
  if (tipo === "vinculo") return Link2;

  return PhoneCall;
}

function corPorTom(tom: LinhaHistorico["tom"]) {
  const mapa = {
    blue: {
      icon: "border-blue-200 bg-blue-50 text-blue-700",
      badge: "border-blue-200 bg-blue-50 text-blue-700",
      linha: "bg-blue-100",
    },
    emerald: {
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      linha: "bg-emerald-100",
    },
    orange: {
      icon: "border-orange-200 bg-orange-50 text-orange-700",
      badge: "border-orange-200 bg-orange-50 text-orange-700",
      linha: "bg-orange-100",
    },
    red: {
      icon: "border-red-200 bg-red-50 text-red-700",
      badge: "border-red-200 bg-red-50 text-red-700",
      linha: "bg-red-100",
    },
    slate: {
      icon: "border-slate-200 bg-slate-50 text-slate-700",
      badge: "border-slate-200 bg-slate-50 text-slate-700",
      linha: "bg-slate-100",
    },
  };

  return mapa[tom];
}

function montarClassificacaoPorChamada(classificacoes: Registro[]) {
  const mapa = new Map<string, Registro>();

  for (const item of classificacoes) {
    const chamadaId = texto(item.chamada_id);

    if (chamadaId && !mapa.has(chamadaId)) {
      mapa.set(chamadaId, item);
    }
  }

  return mapa;
}

function montarVinculosPorChamada(vinculos: Registro[]) {
  const mapa = new Map<string, Registro[]>();

  for (const item of vinculos) {
    const chamadaId = texto(item.chamada_id);

    if (!chamadaId) continue;

    const lista = mapa.get(chamadaId) || [];
    lista.push(item);
    mapa.set(chamadaId, lista);
  }

  return mapa;
}

function montarHistorico({
  chamadas,
  classificacoes,
  vinculos,
}: {
  chamadas: Registro[];
  classificacoes: Registro[];
  vinculos: Registro[];
}) {
  const chamadasPorId = new Map(
    chamadas.map((chamada) => [texto(chamada.id), chamada]),
  );
  const linhas: LinhaHistorico[] = [];

  for (const chamada of chamadas) {
    const chamadaId = texto(chamada.id);
    const status = texto(chamada.status).toLowerCase();

    linhas.push({
      id: `${chamadaId}-criada`,
      tipo: "chamada",
      titulo: "Chamada registrada",
      detalhe: `${statusChamadaLabel(status)} · ${direcaoLabel(chamada.direcao)} · Ramal ${
        texto(chamada.ramal) || "—"
      }`,
      data: dataDaChamada(chamada),
      chamada,
      tom: statusTom(status),
    });

    if (texto(chamada.finalizou_em)) {
      linhas.push({
        id: `${chamadaId}-finalizada`,
        tipo: "chamada",
        titulo: "Chamada finalizada",
        detalhe: `${statusChamadaLabel(status)} · Duração ${formatarDuracao(
          chamada.duracao_segundos,
        )}`,
        data: texto(chamada.finalizou_em),
        chamada,
        tom: statusTom(status),
      });
    }
  }

  for (const classificacao of classificacoes) {
    const chamada = chamadasPorId.get(texto(classificacao.chamada_id));

    if (!chamada) continue;

    linhas.push({
      id:
        texto(classificacao.id) ||
        `${texto(classificacao.chamada_id)}-classificacao`,
      tipo: "classificacao",
      titulo: "Chamada classificada",
      detalhe: classificacaoLabel(classificacao.classificacao),
      data:
        texto(classificacao.classificado_em) || texto(classificacao.criado_em),
      chamada,
      referencia: classificacao,
      tom: "emerald",
    });
  }

  for (const vinculo of vinculos) {
    const chamada = chamadasPorId.get(texto(vinculo.chamada_id));

    if (!chamada) continue;

    linhas.push({
      id: texto(vinculo.id) || `${texto(vinculo.chamada_id)}-vinculo`,
      tipo: "vinculo",
      titulo: "Vínculo criado",
      detalhe: `${vinculoLabel(vinculo.tipo_vinculo)} · ${texto(vinculo.motivo) || "Sem motivo"}`,
      data: texto(vinculo.vinculado_em) || texto(vinculo.criado_em),
      chamada,
      referencia: vinculo,
      tom: "blue",
    });
  }

  return linhas.sort((a, b) => {
    const dataA = dataValida(a.data)?.getTime() || 0;
    const dataB = dataValida(b.data)?.getTime() || 0;

    return dataB - dataA;
  });
}

function CardResumo({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tom,
}: {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icon: LucideIcon;
  tom: "blue" | "emerald" | "orange" | "red" | "slate";
}) {
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

function Abas() {
  const itemBase =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition";

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/dashboard/3cx"
        className={`${itemBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
      >
        <Activity className="h-4 w-4" />
        Monitor
      </Link>

      <Link
        href="/dashboard/3cx?aba=ligacoes"
        className={`${itemBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
      >
        <PhoneCall className="h-4 w-4" />
        Ligações
      </Link>

      <Link
        href="/dashboard/3cx/historico"
        className={`${itemBase} bg-slate-950 text-white shadow-lg shadow-slate-900/15`}
      >
        <History className="h-4 w-4" />
        Histórico
      </Link>

      <Link
        href="/dashboard/3cx/classificacoes"
        className={`${itemBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
      >
        <Tags className="h-4 w-4" />
        Classificações
      </Link>

      <Link
        href="/dashboard/3cx/whatsapp"
        className={`${itemBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Link>
    </div>
  );
}

function LinhaHistoricoCard({
  linha,
  usuarios,
  classificacao,
  vinculos,
}: {
  linha: LinhaHistorico;
  usuarios: Registro[];
  classificacao?: Registro;
  vinculos: Registro[];
}) {
  const Icon = iconPorTipo(linha.tipo);
  const cores = corPorTom(linha.tom);
  const chamada = linha.chamada;
  const operador = usuarioNome(chamada.usuario_id, usuarios);
  const emailOperador = usuarioEmail(chamada.usuario_id, usuarios);

  return (
    <article className="relative rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`absolute left-8 top-[76px] h-[calc(100%-92px)] w-0.5 ${cores.linha}`}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${cores.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${cores.badge}`}
              >
                {linha.tipo === "chamada"
                  ? statusChamadaLabel(chamada.status)
                  : linha.tipo === "classificacao"
                    ? "Classificação"
                    : "Vínculo"}
              </span>

              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                {direcaoLabel(chamada.direcao)}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-black tracking-[-0.03em] text-slate-950">
              {linha.titulo}
            </h3>

            <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
              {linha.detalhe}
            </p>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Cliente
                </p>
                <p className="mt-1 truncate text-slate-950">
                  {texto(chamada.nome_cliente) || "Cliente não informado"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Telefone
                </p>
                <p className="mt-1 text-slate-950">
                  {telefoneFormatado(chamada.telefone_cliente)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Operador
                </p>
                <p className="mt-1 truncate text-slate-950">{operador}</p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Ramal
                </p>
                <p className="mt-1 text-slate-950">
                  {texto(chamada.ramal) || "—"}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">
                ID 3CX: {texto(chamada.provedor_chamada_id) || "—"}
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">
                Duração: {formatarDuracao(chamada.duracao_segundos)}
              </span>

              {classificacao ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                  {classificacaoLabel(classificacao.classificacao)}
                </span>
              ) : null}

              {vinculos.length ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
                  {vinculos
                    .map((item) => vinculoLabel(item.tipo_vinculo))
                    .join(" + ")}
                </span>
              ) : null}
            </div>

            {texto(classificacao?.observacao) ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Observação da classificação
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                  {texto(classificacao?.observacao)}
                </p>
              </div>
            ) : null}

            {emailOperador ? (
              <p className="mt-3 text-xs font-bold text-slate-400">
                {emailOperador}
              </p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 lg:text-right">
          <span className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-slate-400" />
            {formatarDataHora(linha.data)}
          </span>
        </div>
      </div>
    </article>
  );
}

export default async function Page({ searchParams }: PageProps) {
  const params: Record<string, string | string[] | undefined> = (await searchParams) ?? {};
  const periodo = parametro(params.periodo) || "todos";
  const tipo = parametro(params.tipo) || "todos";
  const busca = parametro(params.busca).toLowerCase();

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

  const [
    { data: chamadas },
    { data: classificacoes },
    { data: vinculos },
    { data: usuarios },
  ] = await Promise.all([
    supabase
      .from("telefonia_chamadas")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(350),
    supabase
      .from("telefonia_classificacoes")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(600),
    supabase
      .from("telefonia_vinculos")
      .select("*")
      .order("vinculado_em", { ascending: false })
      .limit(800),
    supabase
      .from("usuarios_internos")
      .select("*")
      .eq("ativo", true)
      .order("nome", { ascending: true }),
  ]);

  const chamadasNormalizadas = (chamadas || []) as Registro[];
  const classificacoesNormalizadas = (classificacoes || []) as Registro[];
  const vinculosNormalizados = (vinculos || []) as Registro[];
  const usuariosNormalizados = (usuarios || []) as Registro[];

  const classificacaoPorChamada = montarClassificacaoPorChamada(
    classificacoesNormalizadas,
  );
  const vinculosPorChamada = montarVinculosPorChamada(vinculosNormalizados);

  const historico = montarHistorico({
    chamadas: chamadasNormalizadas,
    classificacoes: classificacoesNormalizadas,
    vinculos: vinculosNormalizados,
  });

  const historicoFiltrado = historico.filter((linha) => {
    const chamada = linha.chamada;
    const classificacao = classificacaoPorChamada.get(texto(chamada.id));
    const vinculosDaChamada = vinculosPorChamada.get(texto(chamada.id)) || [];

    if (periodo === "hoje" && !ehHoje(linha.data)) return false;
    if (periodo === "7d" && !dentroDosUltimosDias(linha.data, 7)) return false;
    if (periodo === "30d" && !dentroDosUltimosDias(linha.data, 30))
      return false;

    if (tipo !== "todos" && linha.tipo !== tipo) return false;

    if (busca) {
      const textoBusca = [
        linha.titulo,
        linha.detalhe,
        texto(chamada.nome_cliente),
        texto(chamada.telefone_cliente),
        texto(chamada.telefone_normalizado),
        texto(chamada.ramal),
        texto(chamada.provedor_chamada_id),
        texto(chamada.status),
        texto(chamada.direcao),
        usuarioNome(chamada.usuario_id, usuariosNormalizados),
        texto(classificacao?.classificacao),
        texto(classificacao?.observacao),
        ...vinculosDaChamada.map(
          (item) => `${texto(item.tipo_vinculo)} ${texto(item.entidade_id)}`,
        ),
      ]
        .join(" ")
        .toLowerCase();

      if (!textoBusca.includes(busca)) return false;
    }

    return true;
  });

  const chamadasHoje = chamadasNormalizadas.filter((chamada) =>
    ehHoje(dataDaChamada(chamada)),
  );
  const chamadasFinalizadas = chamadasNormalizadas.filter((chamada) =>
    ["finalizada", "atendida", "perdida"].includes(
      texto(chamada.status).toLowerCase(),
    ),
  );
  const totalClassificadas = classificacoesNormalizadas.length;
  const totalVinculos = vinculosNormalizados.length;

  return (
    <main className="flow-premium-page min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
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
                    Histórico 3CX
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                    Linha do tempo real com chamadas, classificações e vínculos
                    salvos no Flow.
                  </p>
                </div>

                <Link
                  href="/dashboard/3cx?aba=ligacoes"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
                >
                  Ver ligações
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6">
                <Abas />
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative z-10">
                <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/15">
                  <History className="h-7 w-7 text-cyan-200" />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                  Auditoria da ligação
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                  Tudo que aconteceu na chamada.
                </h2>
                <p className="mt-3 text-sm font-bold leading-6 text-blue-100">
                  O histórico mostra quando a chamada entrou, foi finalizada,
                  classificada e vinculada.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <CardResumo
            titulo="Chamadas hoje"
            valor={chamadasHoje.length}
            detalhe="Registros do dia"
            icon={PhoneIncoming}
            tom="blue"
          />
          <CardResumo
            titulo="Finalizadas"
            valor={chamadasFinalizadas.length}
            detalhe="Atendidas, finalizadas ou perdidas"
            icon={CheckCircle2}
            tom="emerald"
          />
          <CardResumo
            titulo="Classificações"
            valor={totalClassificadas}
            detalhe="Resultados salvos"
            icon={Tags}
            tom="orange"
          />
          <CardResumo
            titulo="Vínculos"
            valor={totalVinculos}
            detalhe="Lead, agenda ou venda"
            icon={Link2}
            tom="slate"
          />
          <CardResumo
            titulo="Histórico"
            valor={historicoFiltrado.length}
            detalhe="Eventos no filtro"
            icon={History}
            tom="slate"
          />
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                Filtros do histórico
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Consulte por período, tipo de evento, operador, ramal, telefone
                ou cliente.
              </p>
            </div>

            <form className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-[130px_180px_280px_auto_auto]">
              <select
                name="periodo"
                defaultValue={periodo}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="todos">Todos</option>
                <option value="hoje">Hoje</option>
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
              </select>

              <select
                name="tipo"
                defaultValue={tipo}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="todos">Todos eventos</option>
                <option value="chamada">Chamadas</option>
                <option value="classificacao">Classificações</option>
                <option value="vinculo">Vínculos</option>
              </select>

              <input
                name="busca"
                defaultValue={parametro(params.busca)}
                placeholder="Cliente, telefone, ramal, operador..."
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
              />

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
              >
                <Search className="h-4 w-4" />
                Filtrar
              </button>

              <Link
                href="/dashboard/3cx/historico"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                Limpar
              </Link>
            </form>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {historicoFiltrado.length ? (
              historicoFiltrado.map((linha) => {
                const classificacao = classificacaoPorChamada.get(
                  texto(linha.chamada.id),
                );
                const vinculosDaChamada =
                  vinculosPorChamada.get(texto(linha.chamada.id)) || [];

                return (
                  <LinhaHistoricoCard
                    key={linha.id}
                    linha={linha}
                    usuarios={usuariosNormalizados}
                    classificacao={classificacao}
                    vinculos={vinculosDaChamada}
                  />
                );
              })
            ) : (
              <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <PhoneMissed className="mx-auto h-10 w-10 text-slate-300" />
                <h2 className="mt-3 text-xl font-black text-slate-950">
                  Nenhum evento encontrado
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Ajuste os filtros ou aguarde novas chamadas do 3CX.
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <h2 className="font-black text-blue-950">
                    Histórico real ativo
                  </h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
                    Esta tela usa telefonia_chamadas, telefonia_classificacoes e
                    telefonia_vinculos.
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

            <section className="rounded-[30px] border border-orange-100 bg-orange-50 p-5">
              <h2 className="font-black text-orange-950">
                Próximo ajuste recomendado
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-orange-800">
                Criar auditoria permanente para remoção e troca de vínculo. Hoje
                o histórico mostra os vínculos atuais, mas a remoção ainda limpa
                o registro antigo.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
