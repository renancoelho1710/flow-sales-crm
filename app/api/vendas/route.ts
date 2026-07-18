import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UsuarioInterno = {
  id: string;
  nome: string | null;
  email: string | null;
  perfil: string | null;
  loja: string | null;
  ativo: boolean | null;
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function numero(valor: string | null) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}

function paginaSegura(valor: string | null) {
  const n = Number(valor || 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function pageSizeSeguro(valor: string | null) {
  const n = Number(valor || 25);

  if (n === 50) return 50;
  return 25;
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
): Promise<UsuarioInterno | null> {
  const { data: porAuth } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, loja, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (porAuth) return porAuth as UsuarioInterno;

  if (user.email) {
    const { data: porEmail } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, loja, ativo")
      .ilike("email", user.email)
      .eq("ativo", true)
      .maybeSingle();

    if (porEmail) return porEmail as UsuarioInterno;
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
    const searchParams = url.searchParams;

    const busca = texto(searchParams.get("busca"));
    const visao = searchParams.get("visao") || "todos";
    const status = searchParams.get("status") || "todos";
    const conferencia = searchParams.get("conferencia") || "todos";
    const validacao = searchParams.get("validacao") || "todos";
    const statusProposta = texto(searchParams.get("status_proposta"));
    const loja = texto(searchParams.get("loja"));
    const vendedor = texto(searchParams.get("vendedor"));
    const operador = texto(searchParams.get("operador"));
    const carro = texto(searchParams.get("carro"));
    const origemStatus = texto(searchParams.get("origem_status"));
    const dataInicio = texto(searchParams.get("data_inicio"));
    const dataFim = texto(searchParams.get("data_fim"));
    const valorMin = numero(searchParams.get("valor_min"));
    const valorMax = numero(searchParams.get("valor_max"));

    const page = paginaSegura(searchParams.get("page"));
    const pageSize = pageSizeSeguro(searchParams.get("pageSize"));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const podeGerenciarVendas = podeGerenciar(usuario.perfil);

    let query = supabase
      .from("vendas_acompanhamento")
      .select("*", { count: "exact" });

    if (!podeGerenciarVendas) {
      query = query.eq("operador_id", usuario.id);
    }

    if (visao === "status") {
      query = query.or(
        [
          "numero_proposta.not.is.null",
          "status_proposta.not.is.null",
          "origem_status.not.is.null",
        ].join(","),
      );
    }

    if (visao === "acompanhamento") {
      query = query.eq("presente_acompanhamento", true);
    }

    if (visao === "pendentes_resgate") {
      query = query
        .eq("presente_acompanhamento", true)
        .or("operador_id.is.null,validacao_status.eq.pendente");
    }

    if (busca) {
      const termo = busca.replace(/[%(),]/g, "");
      query = query.or(
        [
          `placa.ilike.%${termo}%`,
          `cliente.ilike.%${termo}%`,
          `vendedor_nome.ilike.%${termo}%`,
          `veiculo.ilike.%${termo}%`,
          `numero_proposta.ilike.%${termo}%`,
        ].join(","),
      );
    }

    if (status !== "todos") {
      query = query.eq("status", status);
    }

    if (conferencia !== "todos") {
      query = query.eq("conferencia_status", conferencia);
    }

    if (validacao !== "todos") {
      query = query.eq("validacao_status", validacao);
    }

    if (statusProposta) {
      query = query.ilike("status_proposta", `%${statusProposta}%`);
    }

    if (loja) {
      query = query.ilike("loja", `%${loja}%`);
    }

    if (vendedor) {
      query = query.ilike("vendedor_nome", `%${vendedor}%`);
    }

    if (operador) {
      query = query.ilike("operador_nome", `%${operador}%`);
    }

    if (carro) {
      query = query.ilike("veiculo", `%${carro}%`);
    }

    if (origemStatus) {
      query = query.ilike("origem_status", `%${origemStatus}%`);
    }

    if (dataInicio) {
      query = query.gte("data_venda", dataInicio);
    }

    if (dataFim) {
      query = query.lte("data_venda", dataFim);
    }

    if (valorMin > 0) {
      query = query.gte("total_valor_acompanhamento", valorMin);
    }

    if (valorMax > 0) {
      query = query.lte("total_valor_acompanhamento", valorMax);
    }

    const { data, error, count } = await query
      .order("conferencia_status", { ascending: true })
      .order("data_venda", { ascending: false, nullsFirst: false })
      .order("atualizado_em", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      pode_gerenciar: podeGerenciarVendas,
      usuario,
      vendas: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error ? error.message : "Erro ao carregar vendas.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    if (!usuario || !podeGerenciar(usuario.perfil)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para alterar vendas." },
        { status: 403 },
      );
    }

    const body = await request.json();

    const payload = {
      placa: texto(body.placa).toUpperCase(),
      veiculo: texto(body.veiculo) || null,
      cliente: texto(body.cliente) || null,
      vendedor_nome: texto(body.vendedor_nome) || null,
      vendedor_email: texto(body.vendedor_email) || null,
      loja: texto(body.loja) || null,
      data_venda: texto(body.data_venda) || null,
      instituicao: texto(body.instituicao) || null,
      status: texto(body.status) || "pendente",
      conferencia_status: texto(body.conferencia_status) || "divergente",
      observacao: texto(body.observacao) || null,
      atualizado_por: usuario.id,
      atualizado_em: new Date().toISOString(),
    };

    if (!payload.placa) {
      return NextResponse.json(
        { ok: false, erro: "Informe a placa da venda." },
        { status: 400 },
      );
    }

    if (body.id) {
      const { data, error } = await supabase
        .from("vendas_acompanhamento")
        .update(payload)
        .eq("id", body.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true, venda: data });
    }

    const { data, error } = await supabase
      .from("vendas_acompanhamento")
      .insert({
        ...payload,
        origem: "manual",
        criado_por: usuario.id,
        criado_em: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, venda: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro: error instanceof Error ? error.message : "Erro ao salvar venda.",
      },
      { status: 500 },
    );
  }
}
