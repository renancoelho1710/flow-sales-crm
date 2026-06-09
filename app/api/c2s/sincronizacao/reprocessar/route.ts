import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reprocessarHistoricosPendentesC2S } from "@/lib/c2s/sincronizacao";

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente", "supervisor"].includes(String(perfil || "").toLowerCase());
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from("usuarios_internos")
      .select("id, nome, perfil, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .maybeSingle();

    if (!usuario || !perfilGestao(usuario.perfil)) {
      return NextResponse.json({ ok: false, erro: "Acesso restrito à gestão." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const limite = Math.min(Number(body?.limite || 25), 100);
    const resultado = await reprocessarHistoricosPendentesC2S({ supabase, limite });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao reprocessar C2S:", error);
    return NextResponse.json(
      { ok: false, erro: error instanceof Error ? error.message : "Erro inesperado ao reprocessar C2S." },
      { status: 500 }
    );
  }
}
