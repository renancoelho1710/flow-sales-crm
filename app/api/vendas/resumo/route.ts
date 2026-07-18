import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type VendaResumo = {
  loja: string | null;
  vendedor_nome: string | null;
  operador_nome: string | null;
  conferencia_status: string | null;
  validacao_status: string | null;
  presente_acompanhamento: boolean | null;
  presente_vendidos: boolean | null;
  operador_id: string | null;
  agendamento_id: string | null;
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function podeGerenciar(perfil?: string | null) {
  return [
    "adm",
    "admin",
    "suporte",
    "gerente",
    "supervisor",
    "gestor",
  ].includes(String(perfil || "").toLowerCase());
}

async function buscarUsuarioInterno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
) {
  const { data: porAuth } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, loja, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (porAuth) return porAuth;

  if (user.email) {
    const { data: porEmail } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, loja, ativo")
      .ilike("email", user.email)
      .eq("ativo", true)
      .maybeSingle();

    if (porEmail) return porEmail;
  }

  if (String(user.email || "").toLowerCase() === "renan@azulveiculos.com.br") {
    return {
      id: user.id,
      nome: "Renan",
      email: user.email || "",
      perfil: "adm",
      loja: null,
      ativo: true,
    };
  }

  return null;
}

function somarMapa(
  mapa: Map<string, number>,
  chave: string | null | undefined,
) {
  const nome = texto(chave) || "Não informado";
  mapa.set(nome, (mapa.get(nome) || 0) + 1);
}

function top(mapa: Map<string, number>) {
  return Array.from(mapa.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Não autenticado." },
        { status: 401 },
      );
    }

    const usuario = await buscarUsuarioInterno(supabase, user);

    if (!usuario) {
      return NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const visao = url.searchParams.get("visao") || "acompanhamento";

    const podeGerenciarVendas = podeGerenciar(usuario.perfil);

    let query = supabase
      .from("vendas_acompanhamento")
      .select(
        "loja, vendedor_nome, operador_nome, conferencia_status, validacao_status, presente_acompanhamento, presente_vendidos, operador_id, agendamento_id",
      )
      .limit(10000);

    if (!podeGerenciarVendas) {
      query = query.eq("operador_id", usuario.id);
    }

    if (visao === "acompanhamento") {
      query = query.eq("presente_acompanhamento", true);
    }

    if (visao === "status") {
      query = query.ilike("origem_status", "%statuscorreio%");
    }

    if (visao === "pendentes_resgate") {
      query = query
        .eq("presente_acompanhamento", true)
        .or("operador_id.is.null,validacao_status.eq.pendente");
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const vendas = (data || []) as VendaResumo[];

    const porLoja = new Map<string, number>();
    const porVendedor = new Map<string, number>();
    const porOperador = new Map<string, number>();

    for (const venda of vendas) {
      somarMapa(porLoja, venda.loja);
      somarMapa(porVendedor, venda.vendedor_nome);
      somarMapa(porOperador, venda.operador_nome);
    }

    const total = vendas.length;

    const pendentes = vendas.filter(
      (venda) =>
        !venda.validacao_status || venda.validacao_status === "pendente",
    ).length;

    const semOperador = vendas.filter((venda) => !venda.operador_id).length;

    const prontas = vendas.filter(
      (venda) =>
        Boolean(venda.operador_id) &&
        Boolean(venda.agendamento_id) &&
        venda.validacao_status === "validado",
    ).length;

    const confirmadas = vendas.filter(
      (venda) => venda.conferencia_status === "confirmado",
    ).length;

    const validadas = vendas.filter(
      (venda) => venda.validacao_status === "validado",
    ).length;

    const recusadas = vendas.filter(
      (venda) => venda.validacao_status === "recusado",
    ).length;

    const semAgendamento = vendas.filter(
      (venda) => !venda.agendamento_id,
    ).length;

    return NextResponse.json({
      ok: true,
      resumo: {
        total,
        pendentes,
        sem_operador: semOperador,
        prontas,
        confirmadas,
        validadas,
        recusadas,
        sem_agendamento: semAgendamento,
        por_loja: top(porLoja),
        por_vendedor: top(porVendedor),
        por_operador: top(porOperador),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao carregar resumo de vendas.",
      },
      { status: 500 },
    );
  }
}
