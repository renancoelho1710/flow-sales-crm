import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  History,
  MessageCircle,
  PhoneCall,
  PhoneMissed,
  Search,
  ShieldCheck,
  Tags,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Registro = Record<string, unknown>;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const CLASSIFICACOES_3CX = [
  { valor: "atendimento_valido", label: "Atendimento válido" },
  { valor: "nao_atendeu", label: "Não atendeu" },
  { valor: "numero_invalido", label: "Número inválido" },
  { valor: "retorno", label: "Retorno" },
  { valor: "agendamento", label: "Agendamento" },
  { valor: "venda_resgate", label: "Venda/resgate" },
  { valor: "outros", label: "Outros" },
] as const;

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

function classificacaoLabel(valor: unknown) {
  const normalizado = texto(valor);

  return (
    CLASSIFICACOES_3CX.find((item) => item.valor === normalizado)?.label ||
    normalizado.replaceAll("_", " ") ||
    "Pendente"
  );
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

  return mapa[normalizado] || normalizado;
}

function statusVisual(status: unknown) {
  const normalizado = texto(status).toLowerCase();

  if (["finalizada", "atendida"].includes(normalizado)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["perdida", "falhou", "cancelada"].includes(normalizado)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (["tocando", "em_andamento"].includes(normalizado)) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
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

  return resto ? `${minutos}min ${resto}s` : `${minutos}min`;
}

function usuarioNome(usuarioId: unknown, usuarios: Registro[]) {
  const usuario = usuarios.find((item) => texto(item.id) === texto(usuarioId));

  return texto(usuario?.nome) || "Operador não identificado";
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

async function classificarChamada(formData: FormData) {
  "use server";

  const chamadaId = texto(formData.get("chamada_id"));
  const classificacao = texto(formData.get("classificacao"));
  const observacao = texto(formData.get("observacao"));

  const permitidas = CLASSIFICACOES_3CX.map((item) => item.valor) as string[];

  if (!chamadaId || !permitidas.includes(classificacao)) {
    redirect("/dashboard/3cx/classificacoes");
  }

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

  const { data: existente } = await supabase
    .from("telefonia_classificacoes")
    .select("id")
    .eq("chamada_id", chamadaId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existente?.id) {
    const { error } = await supabase
      .from("telefonia_classificacoes")
      .update({
        classificacao,
        observacao: observacao || null,
        classificado_por: texto(usuarioInterno.id) || null,
        classificado_em: new Date().toISOString(),
      })
      .eq("id", existente.id);

    if (error) {
      throw new Error(`Erro ao atualizar classificação: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("telefonia_classificacoes").insert({
      chamada_id: chamadaId,
      classificacao,
      observacao: observacao || null,
      classificado_por: texto(usuarioInterno.id) || null,
    });

    if (error) {
      throw new Error(`Erro ao classificar chamada: ${error.message}`);
    }
  }

  revalidatePath("/dashboard/3cx");
  revalidatePath("/dashboard/3cx/classificacoes");

  redirect("/dashboard/3cx/classificacoes");
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
  icon: typeof Tags;
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
        <PhoneCall className="h-4 w-4" />
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
        className={`${itemBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
      >
        <History className="h-4 w-4" />
        Histórico
      </Link>

      <Link
        href="/dashboard/3cx/classificacoes"
        className={`${itemBase} bg-slate-950 text-white shadow-lg shadow-slate-900/15`}
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

function FormClassificacao({
  chamada,
  classificacao,
}: {
  chamada: Registro;
  classificacao?: Registro;
}) {
  return (
    <form
      action={classificarChamada}
      className="grid gap-2 xl:grid-cols-[180px_1fr_auto]"
    >
      <input type="hidden" name="chamada_id" value={texto(chamada.id)} />

      <select
        name="classificacao"
        defaultValue={
          texto(classificacao?.classificacao) || "atendimento_valido"
        }
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-blue-600"
      >
        {CLASSIFICACOES_3CX.map((item) => (
          <option key={item.valor} value={item.valor}>
            {item.label}
          </option>
        ))}
      </select>

      <input
        name="observacao"
        defaultValue={texto(classificacao?.observacao)}
        placeholder="Observação rápida"
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-600"
      />

      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
      >
        {classificacao ? "Atualizar" : "Classificar"}
      </button>
    </form>
  );
}

export default async function Page({ searchParams }: PageProps) {
  const params: Record<string, string | string[] | undefined> = (await searchParams) ?? {};
  const periodo = parametro(params.periodo) || "todos";
  const filtro = parametro(params.filtro) || "pendentes";
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

  const [{ data: chamadas }, { data: classificacoes }, { data: usuarios }] =
    await Promise.all([
      supabase
        .from("telefonia_chamadas")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(400),
      supabase
        .from("telefonia_classificacoes")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(600),
      supabase
        .from("usuarios_internos")
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

  const chamadasNormalizadas = (chamadas || []) as Registro[];
  const classificacoesNormalizadas = (classificacoes || []) as Registro[];
  const usuariosNormalizados = (usuarios || []) as Registro[];
  const classificacaoPorChamada = montarClassificacaoPorChamada(
    classificacoesNormalizadas,
  );

  const chamadasClassificaveis = chamadasNormalizadas.filter((chamada) =>
    ["finalizada", "atendida", "perdida"].includes(
      texto(chamada.status).toLowerCase(),
    ),
  );

  const chamadasFiltradas = chamadasClassificaveis.filter((chamada) => {
    const classificacao = classificacaoPorChamada.get(texto(chamada.id));
    const data = dataDaChamada(chamada);

    if (periodo === "hoje" && !ehHoje(data)) return false;
    if (periodo === "7d" && !dentroDosUltimosDias(data, 7)) return false;
    if (periodo === "30d" && !dentroDosUltimosDias(data, 30)) return false;

    if (filtro === "pendentes" && classificacao) return false;
    if (filtro === "classificadas" && !classificacao) return false;

    if (
      CLASSIFICACOES_3CX.some((item) => item.valor === filtro) &&
      texto(classificacao?.classificacao) !== filtro
    ) {
      return false;
    }

    if (busca) {
      const textoBusca = [
        texto(chamada.nome_cliente),
        texto(chamada.telefone_cliente),
        texto(chamada.telefone_normalizado),
        texto(chamada.ramal),
        texto(chamada.provedor_chamada_id),
        usuarioNome(chamada.usuario_id, usuariosNormalizados),
        texto(classificacao?.classificacao),
        texto(classificacao?.observacao),
      ]
        .join(" ")
        .toLowerCase();

      if (!textoBusca.includes(busca)) return false;
    }

    return true;
  });

  const totalPendentes = chamadasClassificaveis.filter(
    (chamada) => !classificacaoPorChamada.has(texto(chamada.id)),
  ).length;

  const totalClassificadas = chamadasClassificaveis.filter((chamada) =>
    classificacaoPorChamada.has(texto(chamada.id)),
  ).length;

  const classificadasHoje = classificacoesNormalizadas.filter((item) =>
    ehHoje(item.classificado_em),
  ).length;

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
                    Classificações 3CX
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                    Classifique chamadas reais, acompanhe pendências e deixe o
                    histórico pronto para auditoria.
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
                  <Tags className="h-7 w-7 text-cyan-200" />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                  Auditoria comercial
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                  Toda ligação com resultado.
                </h2>
                <p className="mt-3 text-sm font-bold leading-6 text-blue-100">
                  A ligação finalizada não fica solta: ela ganha classificação e
                  depois vínculo com lead, agenda ou venda.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <CardResumo
            titulo="Pendentes"
            valor={totalPendentes}
            detalhe="Finalizadas sem classificação"
            icon={AlertTriangle}
            tom="orange"
          />
          <CardResumo
            titulo="Classificadas"
            valor={totalClassificadas}
            detalhe="Com resultado salvo"
            icon={CheckCircle2}
            tom="emerald"
          />
          <CardResumo
            titulo="Hoje"
            valor={classificadasHoje}
            detalhe="Classificadas no dia"
            icon={Clock3}
            tom="blue"
          />
          <CardResumo
            titulo="Elegíveis"
            valor={chamadasClassificaveis.length}
            detalhe="Atendidas, finalizadas ou perdidas"
            icon={PhoneCall}
            tom="slate"
          />
          <CardResumo
            titulo="Filtro"
            valor={chamadasFiltradas.length}
            detalhe="Chamadas na lista"
            icon={Search}
            tom="slate"
          />
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                Filtros
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Controle as chamadas pendentes, classificadas ou por tipo de
                classificação.
              </p>
            </div>

            <form className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-[130px_190px_260px_auto_auto]">
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
                name="filtro"
                defaultValue={filtro}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="pendentes">Pendentes</option>
                <option value="classificadas">Classificadas</option>
                <option value="todos">Todas</option>
                {CLASSIFICACOES_3CX.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                name="busca"
                defaultValue={parametro(params.busca)}
                placeholder="Telefone, cliente, operador..."
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
                href="/dashboard/3cx/classificacoes"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                Limpar
              </Link>
            </form>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              Chamadas para classificação
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Lista real baseada em telefonia_chamadas e
              telefonia_classificacoes.
            </p>
          </div>

          {chamadasFiltradas.length ? (
            <div className="divide-y divide-slate-100">
              {chamadasFiltradas.map((chamada) => {
                const classificacao = classificacaoPorChamada.get(
                  texto(chamada.id),
                );

                return (
                  <article key={texto(chamada.id)} className="p-5">
                    <div className="grid gap-5 xl:grid-cols-[1fr_520px] xl:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusVisual(
                              chamada.status,
                            )}`}
                          >
                            {statusChamadaLabel(chamada.status)}
                          </span>

                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                            {direcaoLabel(chamada.direcao)}
                          </span>

                          {classificacao ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                              {classificacaoLabel(classificacao.classificacao)}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                              Pendente
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-lg font-black text-slate-950">
                          {texto(chamada.nome_cliente) ||
                            "Cliente não informado"}
                        </h3>

                        <div className="mt-2 grid gap-2 text-sm font-bold text-slate-600 md:grid-cols-2">
                          <p>{telefoneFormatado(chamada.telefone_cliente)}</p>
                          <p>
                            {usuarioNome(
                              chamada.usuario_id,
                              usuariosNormalizados,
                            )}{" "}
                            · Ramal {texto(chamada.ramal) || "—"}
                          </p>
                          <p className="inline-flex items-center gap-1">
                            <Clock3 className="h-4 w-4 text-slate-400" />
                            {formatarDataHora(dataDaChamada(chamada))}
                          </p>
                          <p>
                            Duração: {formatarDuracao(chamada.duracao_segundos)}
                          </p>
                        </div>

                        <p className="mt-2 text-xs font-bold text-slate-400">
                          ID 3CX: {texto(chamada.provedor_chamada_id) || "—"}
                        </p>

                        {classificacao?.observacao ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                              Observação
                            </p>
                            <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                              {texto(classificacao.observacao)}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-blue-700" />
                          <h4 className="text-sm font-black text-slate-950">
                            Resultado da ligação
                          </h4>
                        </div>

                        <FormClassificacao
                          chamada={chamada}
                          classificacao={classificacao}
                        />

                        {classificacao ? (
                          <p className="mt-3 text-xs font-bold text-slate-500">
                            Última classificação:{" "}
                            {formatarDataHora(classificacao.classificado_em)}
                          </p>
                        ) : (
                          <p className="mt-3 text-xs font-bold text-orange-700">
                            Ainda sem classificação.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center">
              <PhoneMissed className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-lg font-black text-slate-950">
                Nenhuma chamada encontrada
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Ajuste os filtros ou classifique novas ligações pela aba
                Ligações.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <h2 className="font-black text-blue-950">
                Classificação real ativa
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
                Agora as classificações são salvas em telefonia_classificacoes.
                O próximo bloco é criar o vínculo da chamada com lead,
                agendamento, venda ou resgate.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
