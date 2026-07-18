import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UsuarioInterno = {
  id: string;
  nome: string | null;
  email: string | null;
  perfil: string | null;
  loja?: string | null;
  ativo?: boolean | null;
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function paginaSegura(valor: string | null) {
  const n = Number(valor || 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function pageSizeSeguro(valor: string | null) {
  const n = Number(valor || 25);

  if ([25, 50, 100].includes(n)) return n;
  return 25;
}

function podeVerAuditoria(perfil?: string | null) {
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

    if (!usuario || !podeVerAuditoria(usuario.perfil)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para ver auditoria." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    const busca = texto(params.get("busca")).replace(/[%(),]/g, "");
    const modulo = texto(params.get("modulo"));
    const acao = texto(params.get("acao"));
    const usuarioFiltro = texto(params.get("usuario")).replace(/[%(),]/g, "");

    const page = paginaSegura(params.get("page"));
    const pageSize = pageSizeSeguro(params.get("pageSize"));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("sistema_auditoria")
      .select(
        "id, modulo, acao, entidade, entidade_id, usuario_id, usuario_nome, usuario_email, descricao, metadata, criado_em",
        { count: "exact" },
      );

    if (busca) {
      query = query.or(
        [
          `modulo.ilike.%${busca}%`,
          `acao.ilike.%${busca}%`,
          `entidade.ilike.%${busca}%`,
          `entidade_id.ilike.%${busca}%`,
          `usuario_nome.ilike.%${busca}%`,
          `usuario_email.ilike.%${busca}%`,
          `descricao.ilike.%${busca}%`,
        ].join(","),
      );
    }

    if (modulo && modulo !== "todos") {
      query = query.ilike("modulo", `%${modulo}%`);
    }

    if (acao && acao !== "todos") {
      query = query.ilike("acao", `%${acao}%`);
    }

    if (usuarioFiltro) {
      query = query.or(
        [
          `usuario_nome.ilike.%${usuarioFiltro}%`,
          `usuario_email.ilike.%${usuarioFiltro}%`,
        ].join(","),
      );
    }

    const { data, error, count } = await query
      .order("criado_em", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      logs: data || [],
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
          error instanceof Error
            ? error.message
            : "Erro ao carregar auditoria.",
      },
      { status: 500 },
    );
  }
}
