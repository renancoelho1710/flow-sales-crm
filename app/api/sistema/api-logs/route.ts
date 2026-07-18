import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UsuarioInterno = {
  id?: string;
  nome?: string;
  email?: string;
  perfil?: string;
};

function podeGerenciar(usuario: UsuarioInterno | null, email?: string | null) {
  const perfil = String(usuario?.perfil || "").toLowerCase();

  return (
    ["adm", "admin", "suporte", "gestor"].includes(perfil) ||
    String(email || "").toLowerCase() === "renan@azulveiculos.com.br"
  );
}

async function usuarioAtual(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, interno: null };

  let interno: UsuarioInterno | null = null;

  const { data: porAuth } = await supabase
    .from("usuarios_internos")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  interno = porAuth || null;

  if (!interno && user.email) {
    const { data: porEmail } = await supabase
      .from("usuarios_internos")
      .select("*")
      .ilike("email", user.email)
      .maybeSingle();

    interno = porEmail || null;
  }

  return { user, interno };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, interno } = await usuarioAtual(supabase);

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    if (!podeGerenciar(interno, user.email)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para ver logs da API." },
        { status: 403 },
      );
    }

    const params = request.nextUrl.searchParams;
    const limit = Math.min(Number(params.get("limit") || 80), 200);
    const status = String(params.get("status") || "").trim();
    const rota = String(params.get("rota") || "").trim();

    let query = supabase
      .from("api_logs")
      .select(
        `
        id,
        token_id,
        nome_token,
        metodo,
        rota,
        status,
        sucesso,
        ip,
        user_agent,
        duracao_ms,
        erro,
        metadata,
        criado_em
      `,
      )
      .order("criado_em", { ascending: false })
      .limit(limit);

    if (status === "sucesso") query = query.eq("sucesso", true);
    if (status === "erro") query = query.eq("sucesso", false);
    if (rota) query = query.ilike("rota", `%${rota}%`);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      logs: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao carregar logs da API.",
      },
      { status: 500 },
    );
  }
}
