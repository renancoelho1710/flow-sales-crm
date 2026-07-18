import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  History,
  MessageCircle,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneMissed,
  Search,
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
import { ConfirmSubmitButton } from "@/components/telefonia/ConfirmSubmitButton";

type Registro = Record<string, unknown>;

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

type Aba3CX = "monitor" | "ligacoes";

type CardResumoProps = {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icon: LucideIcon;
  tom: "blue" | "emerald" | "orange" | "red" | "slate";
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

function classificacaoLabel(valor: unknown) {
  const normalizado = texto(valor);

  return (
    CLASSIFICACOES_3CX.find((item) => item.valor === normalizado)?.label ||
    normalizado.replaceAll("_", " ") ||
    "Pendente"
  );
}

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function parametro(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? texto(valor[0]) : texto(valor);
}

function booleano(valor: unknown) {
  if (typeof valor === "boolean") return valor;

  const normalizado = texto(valor).toLowerCase();

  return ["true", "1", "sim", "s", "yes"].includes(normalizado);
}

function numero(valor: unknown) {
  const convertido = Number(valor);

  return Number.isFinite(convertido) ? convertido : 0;
}

function dataDoRegistro(registro: Registro) {
  return (
    texto(registro.iniciou_em) ||
    texto(registro.criado_em) ||
    texto(registro.created_at) ||
    texto(registro.atualizado_em) ||
    texto(registro.status_operacional_atualizado_em)
  );
}

function dataValida(valor: unknown) {
  const bruto = texto(valor);

  if (!bruto) return null;

  const data = new Date(bruto);

  if (Number.isNaN(data.getTime())) return null;

  return data;
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

function pegarAba(valor: string | string[] | undefined): Aba3CX {
  return parametro(valor) === "ligacoes" ? "ligacoes" : "monitor";
}

function statusDoUsuario(usuario: Registro) {
  const administrativo = texto(usuario.status_administrativo).toLowerCase();
  const operacional = texto(usuario.status_operacional).toLowerCase();

  if (administrativo && administrativo !== "disponivel") {
    return administrativo;
  }

  return operacional || "disponivel";
}

function statusUsuarioLabel(status: string) {
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

function statusChamadaLabel(status: string) {
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

  return mapa[status] || status.replaceAll("_", " ");
}

function direcaoLabel(direcao: string) {
  const mapa: Record<string, string> = {
    entrada: "Entrada",
    saida: "Saída",
    interna: "Interna",
    desconhecida: "Não informada",
  };

  return mapa[direcao] || direcao;
}

function statusVisual(status: string) {
  if (
    status === "em_ligacao" ||
    status === "em_andamento" ||
    status === "tocando"
  ) {
    return {
      badge: "border-orange-200 bg-orange-50 text-orange-700",
      ponto: "bg-orange-500",
      card: "border-orange-200",
    };
  }

  if (
    status === "disponivel" ||
    status === "finalizada" ||
    status === "atendida"
  ) {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      ponto: "bg-emerald-500",
      card: "border-emerald-200",
    };
  }

  if (
    status === "perdida" ||
    status === "falhou" ||
    status === "cancelada" ||
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

function usuarioNome(usuarioId: unknown, usuarios: Registro[]) {
  const usuario = usuarios.find((item) => texto(item.id) === texto(usuarioId));

  return texto(usuario?.nome) || "Operador não identificado";
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

function mediaDuracao(chamadas: Registro[]) {
  const duracoes = chamadas
    .map((chamada) => numero(chamada.duracao_segundos))
    .filter((valor) => valor > 0);

  if (!duracoes.length) return "—";

  const total = duracoes.reduce((acc, item) => acc + item, 0);

  return formatarDuracao(Math.round(total / duracoes.length));
}

function ehUuid(valor: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    texto(valor),
  );
}

function normalizarTelefone(valor: unknown) {
  let numeros = texto(valor).replace(/\D/g, "");

  if (numeros.length > 11 && numeros.startsWith("55")) {
    numeros = numeros.slice(2);
  }

  return numeros;
}

function telefonesPossiveisBusca(valor: unknown) {
  const original = texto(valor).replace(/\D/g, "");
  const normalizado = normalizarTelefone(original);

  return Array.from(
    new Set(
      [
        original,
        normalizado,
        normalizado ? `55${normalizado}` : "",
        normalizado.startsWith("55") ? normalizado.slice(2) : "",
        original.startsWith("55") ? original.slice(2) : "",
        original && !original.startsWith("55") ? `55${original}` : "",
      ].filter(Boolean),
    ),
  );
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

function temVinculo(chamada: Registro) {
  return Boolean(
    texto(chamada.lead_id) ||
    texto(chamada.cliente_id) ||
    texto(chamada.agendamento_id) ||
    texto(chamada.venda_id),
  );
}

function vinculoLabel(chamada: Registro) {
  if (texto(chamada.venda_id)) return "Venda";
  if (texto(chamada.agendamento_id)) return "Agendamento";
  if (texto(chamada.lead_id)) return "Lead";
  if (texto(chamada.cliente_id)) return "Cliente";

  return "Sem vínculo";
}

async function classificarChamada(formData: FormData) {
  "use server";

  const chamadaId = texto(formData.get("chamada_id"));
  const classificacao = texto(formData.get("classificacao"));
  const observacao = texto(formData.get("observacao"));

  const permitidas = CLASSIFICACOES_3CX.map((item) => item.valor) as string[];

  if (!chamadaId || !permitidas.includes(classificacao)) {
    redirect("/dashboard/3cx?aba=ligacoes");
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

  redirect("/dashboard/3cx?aba=ligacoes");
}

async function buscarLeadParaVinculo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  consulta: string,
) {
  const termo = texto(consulta);
  const numeros = termo.replace(/\D/g, "");

  if (!termo) return null;

  if (ehUuid(termo)) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, nome, telefone, telefone_normalizado, status, criado_em")
      .eq("id", termo)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar lead por ID: ${error.message}`);
    }

    if (data) return data as Registro;
  }

  if (numeros.length >= 8) {
    const telefones = telefonesPossiveisBusca(numeros);

    const { data, error } = await supabase
      .from("leads")
      .select("id, nome, telefone, telefone_normalizado, status, criado_em")
      .in("telefone_normalizado", telefones)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar lead por telefone: ${error.message}`);
    }

    if (data) return data as Registro;
  }

  const { data, error } = await supabase
    .from("leads")
    .select("id, nome, telefone, telefone_normalizado, status, criado_em")
    .ilike("nome", `%${termo}%`)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar lead por nome: ${error.message}`);
  }

  return (data || null) as Registro | null;
}

async function aplicarVinculoLeadNaChamada({
  supabase,
  chamada,
  lead,
  usuarioInterno,
  origem,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  chamada: Registro;
  lead: Registro;
  usuarioInterno: Registro;
  origem: "automatico" | "manual";
}) {
  const chamadaId = texto(chamada.id);

  const [{ data: agendamento }, { data: venda }] = await Promise.all([
    supabase
      .from("lead_agendamentos")
      .select("id, lead_id, status, data_agendamento, loja, criado_em")
      .eq("lead_id", texto(lead.id))
      .order("data_agendamento", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("vendas_acompanhamento")
      .select(
        "id, lead_id, agendamento_id, placa, cliente, loja, data_venda, status, criado_em",
      )
      .eq("lead_id", texto(lead.id))
      .order("data_venda", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { error: erroUpdate } = await supabase
    .from("telefonia_chamadas")
    .update({
      lead_id: texto(lead.id),
      agendamento_id:
        texto(agendamento?.id) || texto(venda?.agendamento_id) || null,
      venda_id: texto(venda?.id) || null,
      origem_vinculo: origem,
      nome_cliente:
        texto(chamada.nome_cliente) ||
        texto(lead.nome) ||
        texto(venda?.cliente) ||
        null,
    })
    .eq("id", chamadaId);

  if (erroUpdate) {
    throw new Error(`Erro ao vincular chamada: ${erroUpdate.message}`);
  }

  await supabase
    .from("telefonia_vinculos")
    .delete()
    .eq("chamada_id", chamadaId);

  const vinculos = [
    {
      chamada_id: chamadaId,
      tipo_vinculo: "lead",
      entidade_id: texto(lead.id),
      vinculado_por: texto(usuarioInterno.id),
      motivo:
        origem === "automatico"
          ? "Vínculo automático por telefone."
          : "Vínculo manual informado pelo usuário.",
    },
  ];

  if (texto(agendamento?.id) || texto(venda?.agendamento_id)) {
    vinculos.push({
      chamada_id: chamadaId,
      tipo_vinculo: "agendamento",
      entidade_id: texto(agendamento?.id) || texto(venda?.agendamento_id),
      vinculado_por: texto(usuarioInterno.id),
      motivo:
        origem === "automatico"
          ? "Vínculo automático por lead relacionado."
          : "Vínculo manual com agendamento relacionado ao lead.",
    });
  }

  if (texto(venda?.id)) {
    vinculos.push({
      chamada_id: chamadaId,
      tipo_vinculo: "venda",
      entidade_id: texto(venda.id),
      vinculado_por: texto(usuarioInterno.id),
      motivo:
        origem === "automatico"
          ? "Vínculo automático por venda relacionada ao lead."
          : "Vínculo manual com venda relacionada ao lead.",
    });
  }

  const { error: erroVinculo } = await supabase
    .from("telefonia_vinculos")
    .upsert(vinculos, {
      onConflict: "chamada_id,tipo_vinculo,entidade_id",
      ignoreDuplicates: true,
    });

  if (erroVinculo) {
    throw new Error(`Erro ao salvar vínculo: ${erroVinculo.message}`);
  }
}

async function vincularChamadaAutomaticamente(formData: FormData) {
  "use server";

  const chamadaId = texto(formData.get("chamada_id"));

  if (!chamadaId) {
    redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=erro");
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

  const { data: chamada, error: erroChamada } = await supabase
    .from("telefonia_chamadas")
    .select("*")
    .eq("id", chamadaId)
    .maybeSingle();

  if (erroChamada) {
    throw new Error(`Erro ao buscar chamada: ${erroChamada.message}`);
  }

  if (!chamada) {
    redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=chamada_nao_encontrada");
  }

  const telefoneOriginal = texto(chamada.telefone_cliente).replace(/\\D/g, "");
  const telefone = normalizarTelefone(
    chamada.telefone_normalizado || chamada.telefone_cliente,
  );

  if (!telefone && !telefoneOriginal) {
    redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=sem_telefone");
  }

  const telefonesPossiveis = Array.from(
    new Set(
      [
        telefone,
        telefone ? `55${telefone}` : "",
        telefone.startsWith("55") ? telefone.slice(2) : "",
        telefoneOriginal,
        telefoneOriginal.startsWith("55") ? telefoneOriginal.slice(2) : "",
        telefoneOriginal && !telefoneOriginal.startsWith("55")
          ? `55${telefoneOriginal}`
          : "",
      ].filter(Boolean),
    ),
  );

  const { data: lead, error: erroLead } = await supabase
    .from("leads")
    .select("id, nome, telefone, telefone_normalizado, status, criado_em")
    .in("telefone_normalizado", telefonesPossiveis)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroLead) {
    throw new Error(`Erro ao buscar lead: ${erroLead.message}`);
  }

  if (!lead) {
    redirect(
      `/dashboard/3cx?aba=ligacoes&msg_vinculo=lead_nao_encontrado&busca=${telefone || telefoneOriginal}`,
    );
  }

  const [{ data: agendamento }, { data: venda }] = await Promise.all([
    supabase
      .from("lead_agendamentos")
      .select("id, lead_id, status, data_agendamento, loja, criado_em")
      .eq("lead_id", lead.id)
      .order("data_agendamento", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("vendas_acompanhamento")
      .select(
        "id, lead_id, agendamento_id, placa, cliente, loja, data_venda, status, criado_em",
      )
      .eq("lead_id", lead.id)
      .order("data_venda", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const atualizacaoChamada = {
    lead_id: lead.id,
    agendamento_id: agendamento?.id || venda?.agendamento_id || null,
    venda_id: venda?.id || null,
    origem_vinculo: "automatico",
    nome_cliente: chamada.nome_cliente || lead.nome || venda?.cliente || null,
  };

  const { error: erroUpdate } = await supabase
    .from("telefonia_chamadas")
    .update(atualizacaoChamada)
    .eq("id", chamadaId);

  if (erroUpdate) {
    throw new Error(`Erro ao vincular chamada: ${erroUpdate.message}`);
  }

  const vinculos = [
    {
      chamada_id: chamadaId,
      tipo_vinculo: "lead",
      entidade_id: lead.id,
      vinculado_por: usuarioInterno.id,
      motivo: "Vínculo automático por telefone.",
    },
  ];

  if (agendamento?.id || venda?.agendamento_id) {
    vinculos.push({
      chamada_id: chamadaId,
      tipo_vinculo: "agendamento",
      entidade_id: agendamento?.id || venda.agendamento_id,
      vinculado_por: usuarioInterno.id,
      motivo: "Vínculo automático por lead relacionado.",
    });
  }

  if (venda?.id) {
    vinculos.push({
      chamada_id: chamadaId,
      tipo_vinculo: "venda",
      entidade_id: venda.id,
      vinculado_por: usuarioInterno.id,
      motivo: "Vínculo automático por venda relacionada ao lead.",
    });
  }

  await supabase
    .from("telefonia_vinculos")
    .delete()
    .eq("chamada_id", chamadaId);

  const { error: erroVinculo } = await supabase
    .from("telefonia_vinculos")
    .upsert(vinculos, {
      onConflict: "chamada_id,tipo_vinculo,entidade_id",
      ignoreDuplicates: true,
    });

  if (erroVinculo) {
    throw new Error(`Erro ao salvar vínculo: ${erroVinculo.message}`);
  }

  revalidatePath("/dashboard/3cx");
  revalidatePath("/dashboard/3cx/classificacoes");

  redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=ok");
}

async function removerVinculoChamada(formData: FormData) {
  "use server";

  const chamadaId = texto(formData.get("chamada_id"));

  if (!chamadaId) {
    redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=erro");
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

  const { error: erroUpdate } = await supabase
    .from("telefonia_chamadas")
    .update({
      lead_id: null,
      cliente_id: null,
      agendamento_id: null,
      venda_id: null,
      origem_vinculo: null,
    })
    .eq("id", chamadaId);

  if (erroUpdate) {
    throw new Error(`Erro ao limpar vínculo da chamada: ${erroUpdate.message}`);
  }

  const { error: erroDelete } = await supabase
    .from("telefonia_vinculos")
    .delete()
    .eq("chamada_id", chamadaId);

  if (erroDelete) {
    throw new Error(`Erro ao remover vínculos: ${erroDelete.message}`);
  }

  revalidatePath("/dashboard/3cx");
  revalidatePath("/dashboard/3cx/classificacoes");

  redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=removido");
}

async function vincularChamadaManual(formData: FormData) {
  "use server";

  const chamadaId = texto(formData.get("chamada_id"));
  const consulta = texto(formData.get("consulta"));

  if (!chamadaId || !consulta) {
    redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=erro");
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

  const { data: chamada, error: erroChamada } = await supabase
    .from("telefonia_chamadas")
    .select("*")
    .eq("id", chamadaId)
    .maybeSingle();

  if (erroChamada) {
    throw new Error(`Erro ao buscar chamada: ${erroChamada.message}`);
  }

  if (!chamada) {
    redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=chamada_nao_encontrada");
  }

  const lead = await buscarLeadParaVinculo(supabase, consulta);

  if (!lead) {
    redirect(
      `/dashboard/3cx?aba=ligacoes&msg_vinculo=lead_nao_encontrado&busca=${encodeURIComponent(
        consulta,
      )}`,
    );
  }

  await aplicarVinculoLeadNaChamada({
    supabase,
    chamada: chamada as Registro,
    lead,
    usuarioInterno: usuarioInterno as Registro,
    origem: "manual",
  });

  revalidatePath("/dashboard/3cx");
  revalidatePath("/dashboard/3cx/classificacoes");

  redirect("/dashboard/3cx?aba=ligacoes&msg_vinculo=ok");
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

function Abas({ aba }: { aba: Aba3CX }) {
  const itemBase =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition";

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/dashboard/3cx"
        className={
          aba === "monitor"
            ? `${itemBase} bg-slate-950 text-white shadow-lg shadow-slate-900/15`
            : `${itemBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`
        }
      >
        <Activity className="h-4 w-4" />
        Monitor
      </Link>

      <Link
        href="/dashboard/3cx?aba=ligacoes"
        className={
          aba === "ligacoes"
            ? `${itemBase} bg-slate-950 text-white shadow-lg shadow-slate-900/15`
            : `${itemBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`
        }
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

function Operadores3CX({ operadores }: { operadores: Registro[] }) {
  if (!operadores.length) {
    return (
      <section className="rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <WifiOff className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-3 text-xl font-black text-slate-950">
          Nenhum operador encontrado
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Cadastre ramais em usuários internos para o monitor 3CX ficar
          completo.
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
          Status operacional vindo do Flow e atualizado pelo webhook do 3CX.
        </p>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
        {operadores.map((operador) => {
          const id = texto(operador.id);
          const nome = texto(operador.nome) || "Operador";
          const email = texto(operador.email);
          const ramal = texto(operador.ramal_3cx);
          const status = statusDoUsuario(operador);
          const visual = statusVisual(status);
          const recebeLeads = booleano(operador.recebe_leads);

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
                      {statusUsuarioLabel(status)}
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
                      operador.status_operacional_atualizado_em,
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

function MonitorView({
  usuarios,
  chamadas,
  integracaoAtiva,
}: {
  usuarios: Registro[];
  chamadas: Registro[];
  integracaoAtiva: boolean;
}) {
  const operadoresComRamal = usuarios.filter((usuario) =>
    texto(usuario.ramal_3cx),
  );
  const operadoresSemRamal = usuarios.length - operadoresComRamal.length;
  const operadoresEmLigacao = usuarios.filter(
    (usuario) => statusDoUsuario(usuario) === "em_ligacao",
  );
  const operadoresDisponiveis = usuarios.filter(
    (usuario) =>
      statusDoUsuario(usuario) === "disponivel" &&
      booleano(usuario.recebe_leads),
  );
  const chamadasHoje = chamadas.filter((chamada) =>
    ehHoje(dataDoRegistro(chamada)),
  );
  const chamadasSemClassificacao = chamadas.filter(
    (chamada) =>
      ["finalizada", "atendida", "perdida"].includes(
        texto(chamada.status).toLowerCase(),
      ) && !texto(chamada.classificacao_id),
  );

  const IconeIntegracao = integracaoAtiva ? Wifi : WifiOff;

  return (
    <div className="space-y-5">
      {avisoVinculo ? (
        <section
          className={
            avisoVinculo === "ok"
              ? "rounded-[26px] border border-emerald-200 bg-emerald-50 p-5"
              : "rounded-[26px] border border-orange-200 bg-orange-50 p-5"
          }
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={
                avisoVinculo === "ok"
                  ? "mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                  : "mt-0.5 h-5 w-5 shrink-0 text-orange-700"
              }
            />
            <div>
              <h2
                className={
                  avisoVinculo === "ok"
                    ? "font-black text-emerald-950"
                    : "font-black text-orange-950"
                }
              >
                {avisoVinculo === "ok"
                  ? "Chamada vinculada com sucesso"
                  : avisoVinculo === "removido"
                    ? "Vínculo removido com sucesso"
                    : "Não foi possível vincular automaticamente"}
              </h2>
              <p
                className={
                  avisoVinculo === "ok"
                    ? "mt-1 text-sm font-bold leading-6 text-emerald-800"
                    : "mt-1 text-sm font-bold leading-6 text-orange-800"
                }
              >
                {avisoVinculo === "ok"
                  ? "O Flow encontrou o lead pelo telefone e salvou o vínculo."
                  : avisoVinculo === "removido"
                    ? "A chamada voltou para Sem vínculo e pode ser vinculada novamente."
                    : "O Flow tentou buscar pelo telefone, mas não encontrou lead correspondente."}
              </p>
            </div>
          </div>
        </section>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <CardResumo
          titulo="Ligações hoje"
          valor={chamadasHoje.length}
          detalhe="Base real telefonia_chamadas"
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
          valor={chamadasSemClassificacao.length}
          detalhe="Chamadas finalizadas"
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
                ramal_3cx.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Operadores3CX operadores={usuarios} />

          <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black tracking-[-0.03em] text-slate-950">
                  <PhoneCall className="h-5 w-5 text-blue-700" />
                  Últimas chamadas reais
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Chamadas salvas em telefonia_chamadas.
                </p>
              </div>

              <Link
                href="/dashboard/3cx?aba=ligacoes"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Ver ligações <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {chamadas.length ? (
              <div className="divide-y divide-slate-100">
                {chamadas.slice(0, 8).map((chamada) => {
                  const status = texto(chamada.status).toLowerCase();
                  const visual = statusVisual(status);

                  return (
                    <article key={texto(chamada.id)} className="p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${visual.badge}`}
                            >
                              {statusChamadaLabel(status)}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                              {direcaoLabel(texto(chamada.direcao))}
                            </span>
                          </div>

                          <h3 className="mt-3 text-base font-black text-slate-950">
                            {texto(chamada.nome_cliente) ||
                              telefoneFormatado(chamada.telefone_cliente)}
                          </h3>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                            {usuarioNome(chamada.usuario_id, usuarios)} • Ramal{" "}
                            {texto(chamada.ramal) || "—"} •{" "}
                            {formatarDuracao(chamada.duracao_segundos)}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-bold text-slate-500 lg:text-right">
                          {formatarDataHora(dataDoRegistro(chamada))}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center">
                <PhoneCall className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  Nenhuma chamada real registrada ainda
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Quando `/api/3cx/chamadas` receber eventos, eles aparecerão
                  aqui.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <h2 className="font-black text-blue-950">Base real ativa</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
                  As ligações agora vêm da tabela telefonia_chamadas. O próximo
                  passo é salvar classificação e vínculo com lead, agenda, venda
                  ou resgate.
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
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function LigacoesView({
  chamadas,
  classificacoes,
  usuarios,
  params,
}: {
  chamadas: Registro[];
  classificacoes: Registro[];
  usuarios: Registro[];
  params: Record<string, string | string[] | undefined>;
}) {
  const periodo = parametro(params.periodo) || "hoje";
  const operador = parametro(params.operador) || "todos";
  const status = parametro(params.status) || "todos";
  const direcao = parametro(params.direcao) || "todos";
  const vinculo = parametro(params.vinculo) || "todos";
  const busca = parametro(params.busca).toLowerCase();
  const avisoVinculo = parametro(params.msg_vinculo);

  const classificacaoPorChamada = new Map<string, Registro>();

  for (const item of classificacoes) {
    const chamadaId = texto(item.chamada_id);

    if (chamadaId && !classificacaoPorChamada.has(chamadaId)) {
      classificacaoPorChamada.set(chamadaId, item);
    }
  }

  const chamadasFiltradas = chamadas.filter((chamada) => {
    const data = dataDoRegistro(chamada);
    const statusChamada = texto(chamada.status).toLowerCase();
    const direcaoChamada = texto(chamada.direcao).toLowerCase();
    const usuarioId = texto(chamada.usuario_id);
    const nomeOperador = usuarioNome(usuarioId, usuarios).toLowerCase();

    if (periodo === "hoje" && !ehHoje(data)) return false;
    if (periodo === "7d" && !dentroDosUltimosDias(data, 7)) return false;
    if (periodo === "30d" && !dentroDosUltimosDias(data, 30)) return false;

    if (operador !== "todos" && usuarioId !== operador) return false;
    if (status !== "todos" && statusChamada !== status) return false;
    if (direcao !== "todos" && direcaoChamada !== direcao) return false;

    if (vinculo === "com_vinculo" && !temVinculo(chamada)) return false;
    if (vinculo === "sem_vinculo" && temVinculo(chamada)) return false;
    if (
      vinculo === "sem_classificacao" &&
      classificacaoPorChamada.has(texto(chamada.id))
    ) {
      return false;
    }

    if (busca) {
      const textoBusca = [
        nomeOperador,
        texto(chamada.ramal),
        texto(chamada.telefone_cliente),
        texto(chamada.telefone_normalizado),
        texto(chamada.nome_cliente),
        texto(chamada.provedor_chamada_id),
        texto(chamada.observacao),
      ]
        .join(" ")
        .toLowerCase();

      if (!textoBusca.includes(busca)) return false;
    }

    return true;
  });

  const chamadasHoje = chamadas.filter((chamada) =>
    ehHoje(dataDoRegistro(chamada)),
  );
  const chamadasAtendidas = chamadasFiltradas.filter((chamada) =>
    ["atendida", "finalizada"].includes(texto(chamada.status).toLowerCase()),
  );
  const chamadasPerdidas = chamadasFiltradas.filter(
    (chamada) => texto(chamada.status).toLowerCase() === "perdida",
  );
  const chamadasEmAndamento = chamadasFiltradas.filter((chamada) =>
    ["tocando", "em_andamento"].includes(texto(chamada.status).toLowerCase()),
  );
  const chamadasSemClassificacao = chamadasFiltradas.filter(
    (chamada) =>
      ["finalizada", "atendida", "perdida"].includes(
        texto(chamada.status).toLowerCase(),
      ) && !classificacaoPorChamada.has(texto(chamada.id)),
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <CardResumo
          titulo="Ligações hoje"
          valor={chamadasHoje.length}
          detalhe="Base real"
          icon={PhoneCall}
          tom="blue"
        />
        <CardResumo
          titulo="Filtro atual"
          valor={chamadasFiltradas.length}
          detalhe="Chamadas encontradas"
          icon={Search}
          tom="slate"
        />
        <CardResumo
          titulo="Atendidas"
          valor={chamadasAtendidas.length}
          detalhe="Atendida/finalizada"
          icon={CheckCircle2}
          tom="emerald"
        />
        <CardResumo
          titulo="Perdidas"
          valor={chamadasPerdidas.length}
          detalhe="Cliente não atendeu"
          icon={PhoneMissed}
          tom="red"
        />
        <CardResumo
          titulo="Em andamento"
          valor={chamadasEmAndamento.length}
          detalhe="Tocando ou ativa"
          icon={PhoneIncoming}
          tom="orange"
        />
        <CardResumo
          titulo="Tempo médio"
          valor={mediaDuracao(chamadasAtendidas)}
          detalhe="Chamadas com duração"
          icon={Timer}
          tom="slate"
        />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              Filtros de ligações
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Agora esta tela usa a tabela real telefonia_chamadas.
            </p>
          </div>

          <form className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-[120px_190px_150px_130px_150px_240px_auto_auto]">
            <input type="hidden" name="aba" value="ligacoes" />

            <select
              name="periodo"
              defaultValue={periodo}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="hoje">Hoje</option>
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
              <option value="todos">Todos</option>
            </select>

            <select
              name="operador"
              defaultValue={operador}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="todos">Todos operadores</option>
              {usuarios.map((usuario) => (
                <option key={texto(usuario.id)} value={texto(usuario.id)}>
                  {texto(usuario.nome) || "Operador"}
                </option>
              ))}
            </select>

            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="todos">Todos status</option>
              <option value="registrada">Registrada</option>
              <option value="tocando">Tocando</option>
              <option value="em_andamento">Em andamento</option>
              <option value="atendida">Atendida</option>
              <option value="perdida">Perdida</option>
              <option value="finalizada">Finalizada</option>
              <option value="falhou">Falhou</option>
              <option value="cancelada">Cancelada</option>
            </select>

            <select
              name="direcao"
              defaultValue={direcao}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="todos">Direção</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="interna">Interna</option>
              <option value="desconhecida">Não informada</option>
            </select>

            <select
              name="vinculo"
              defaultValue={vinculo}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="todos">Todos vínculos</option>
              <option value="com_vinculo">Com vínculo</option>
              <option value="sem_vinculo">Sem vínculo</option>
              <option value="sem_classificacao">Sem classificação</option>
            </select>

            <input
              name="busca"
              defaultValue={parametro(params.busca)}
              placeholder="Telefone, cliente, ramal..."
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
              href="/dashboard/3cx?aba=ligacoes"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 hover:bg-slate-50"
            >
              Limpar
            </Link>
          </form>
        </div>
      </section>

      {chamadasSemClassificacao.length > 0 ? (
        <section className="rounded-[26px] border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
            <div>
              <h2 className="font-black text-orange-950">
                {chamadasSemClassificacao.length} chamada(s) finalizada(s) sem
                classificação
              </h2>
              <p className="mt-1 text-sm font-bold leading-6 text-orange-800">
                O próximo bloco vai ativar o botão de classificar e salvar em
                telefonia_classificacoes.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              Lista de ligações reais
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Registros vindos de telefonia_chamadas.
            </p>
          </div>

          <Link
            href="/dashboard/3cx/classificacoes"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Ver classificações <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {chamadasFiltradas.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1360px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Cliente</th>
                  <th className="px-5 py-4">Operador</th>
                  <th className="px-5 py-4">Data/hora</th>
                  <th className="px-5 py-4">Duração</th>
                  <th className="px-5 py-4">Vínculo</th>
                  <th className="px-5 py-4">Classificação</th>
                  <th className="px-5 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chamadasFiltradas.map((chamada) => {
                  const statusChamada = texto(chamada.status).toLowerCase();
                  const visual = statusVisual(statusChamada);
                  const classificacao = classificacaoPorChamada.get(
                    texto(chamada.id),
                  );

                  return (
                    <tr
                      key={texto(chamada.id)}
                      className="align-top hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${visual.badge}`}
                        >
                          {statusChamadaLabel(statusChamada)}
                        </span>
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {direcaoLabel(texto(chamada.direcao))}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">
                          {texto(chamada.nome_cliente) ||
                            "Cliente não informado"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {telefoneFormatado(chamada.telefone_cliente)}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          ID 3CX: {texto(chamada.provedor_chamada_id) || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">
                          {usuarioNome(chamada.usuario_id, usuarios)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Ramal {texto(chamada.ramal) || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="inline-flex items-center gap-1 text-sm font-bold text-slate-600">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          {formatarDataHora(dataDoRegistro(chamada))}
                        </p>
                        {texto(chamada.finalizou_em) ? (
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Fim: {formatarDataHora(chamada.finalizou_em)}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">
                          {formatarDuracao(chamada.duracao_segundos)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            temVinculo(chamada)
                              ? "inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"
                              : "inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700"
                          }
                        >
                          {vinculoLabel(chamada)}
                        </span>

                        {temVinculo(chamada) ? (
                          <div className="mt-2 space-y-2">
                            <form action={removerVinculoChamada}>
                              <input
                                type="hidden"
                                name="chamada_id"
                                value={texto(chamada.id)}
                              />
                              <ConfirmSubmitButton
                                message="Deseja mesmo remover este vínculo? A chamada ficará sem lead, agendamento e venda vinculados."
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-[11px] font-black text-red-700 hover:bg-red-100"
                              >
                                Remover vínculo
                              </ConfirmSubmitButton>
                            </form>

                            <details className="rounded-xl border border-slate-200 bg-white p-2">
                              <summary className="cursor-pointer text-[11px] font-black text-slate-700">
                                Trocar vínculo
                              </summary>

                              <form
                                action={vincularChamadaManual}
                                className="mt-2 grid gap-1"
                              >
                                <input
                                  type="hidden"
                                  name="chamada_id"
                                  value={texto(chamada.id)}
                                />
                                <input
                                  name="consulta"
                                  placeholder="Novo nome, telefone ou ID"
                                  className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-600"
                                />
                                <ConfirmSubmitButton
                                  message="Deseja mesmo trocar este vínculo? O vínculo atual será substituído pelo novo lead informado."
                                  className="inline-flex h-8 items-center justify-center rounded-lg bg-slate-950 px-3 text-[11px] font-black text-white hover:bg-slate-800"
                                >
                                  Trocar
                                </ConfirmSubmitButton>
                              </form>
                            </details>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            <form action={vincularChamadaAutomaticamente}>
                              <input
                                type="hidden"
                                name="chamada_id"
                                value={texto(chamada.id)}
                              />
                              <button
                                type="submit"
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-[11px] font-black text-blue-700 hover:bg-blue-100"
                              >
                                Auto vincular
                              </button>
                            </form>

                            <form
                              action={vincularChamadaManual}
                              className="grid gap-1"
                            >
                              <input
                                type="hidden"
                                name="chamada_id"
                                value={texto(chamada.id)}
                              />
                              <input
                                name="consulta"
                                placeholder="Nome, telefone ou ID"
                                className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-600"
                              />
                              <button
                                type="submit"
                                className="inline-flex h-8 items-center justify-center rounded-lg bg-slate-950 px-3 text-[11px] font-black text-white hover:bg-slate-800"
                              >
                                Vincular manual
                              </button>
                            </form>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {classificacao ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            {texto(classificacao.classificacao).replaceAll(
                              "_",
                              " ",
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                            Pendente
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <form
                          action={classificarChamada}
                          className="flex items-center justify-end gap-2"
                        >
                          <input
                            type="hidden"
                            name="chamada_id"
                            value={texto(chamada.id)}
                          />

                          <select
                            name="classificacao"
                            defaultValue={
                              texto(classificacao?.classificacao) ||
                              "atendimento_valido"
                            }
                            className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-blue-600"
                          >
                            {CLASSIFICACOES_3CX.map((item) => (
                              <option key={item.valor} value={item.valor}>
                                {item.label}
                              </option>
                            ))}
                          </select>

                          <input
                            name="observacao"
                            placeholder="Obs."
                            className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-600"
                          />

                          <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
                          >
                            {classificacao ? "Atualizar" : "Classificar"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <PhoneMissed className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Nenhuma ligação encontrada
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Ajuste os filtros ou envie uma chamada para `/api/3cx/chamadas`.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <h2 className="font-black text-blue-950">
              Ligações já estão na base real
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
              Agora faltam os próximos dois botões funcionais: classificar
              chamada e vincular chamada a lead, cliente, agendamento ou venda.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function Page({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams || {});
  const aba = pegarAba(params.aba);

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
    { data: usuarios },
    { data: chamadas },
    { data: classificacoes },
    { data: integracao3CX },
  ] = await Promise.all([
    supabase
      .from("usuarios_internos")
      .select("*")
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("telefonia_chamadas")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(300),
    supabase
      .from("telefonia_classificacoes")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(500),
    supabase
      .from("integracoes_configuracoes")
      .select("*")
      .eq("chave", "3cx")
      .maybeSingle(),
  ]);

  const usuariosNormalizados = ((usuarios || []) as Registro[]).filter(
    (usuario) => {
      const perfil = texto(usuario.perfil).toLowerCase();

      return !["cliente", "externo"].includes(perfil);
    },
  );

  const chamadasNormalizadas = (chamadas || []) as Registro[];
  const classificacoesNormalizadas = (classificacoes || []) as Registro[];
  const integracaoAtiva = booleano((integracao3CX as Registro | null)?.ativo);

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
                    Monitor operacional de ramais, ligações reais, histórico e
                    classificação.
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
                  Telefonia conectada ao Flow.
                </h2>
                <p className="mt-3 text-sm font-bold leading-6 text-blue-100">
                  A ligação agora já entra na base real e poderá ser
                  classificada e vinculada ao processo comercial.
                </p>
              </div>
            </div>
          </div>
        </section>

        {aba === "ligacoes" ? (
          <LigacoesView
            chamadas={chamadasNormalizadas}
            classificacoes={classificacoesNormalizadas}
            usuarios={usuariosNormalizados}
            params={params}
          />
        ) : (
          <MonitorView
            usuarios={usuariosNormalizados}
            chamadas={chamadasNormalizadas}
            integracaoAtiva={integracaoAtiva}
          />
        )}
      </div>
    </main>
  );
}
