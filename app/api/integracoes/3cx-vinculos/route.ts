import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente", "supervisor"].includes(String(perfil || "").trim().toLowerCase());
}

async function getContexto() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, usuario: null, erro: NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 }) };

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuario) return { supabase, usuario: null, erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado ou inativo." }, { status: 403 }) };
  if (!perfilGestao(usuario.perfil)) return { supabase, usuario, erro: NextResponse.json({ ok: false, erro: "Você não tem permissão para gerenciar vínculos 3CX." }, { status: 403 }) };
  return { supabase, usuario, erro: null };
}

export async function GET() {
  try {
    const { supabase, erro } = await getContexto();
    if (erro) return erro;

    const { data, error } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo, ramal_3cx")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao buscar vínculos 3CX:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar usuários/vínculos 3CX." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, usuarios: data || [] });
  } catch (error) {
    console.error("Erro inesperado em vínculos 3CX:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao buscar vínculos 3CX." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const usuarioId = String(body?.usuario_id || "").trim();
    const ramal = String(body?.ramal_3cx || "").replace(/\D/g, "").trim();

    if (!usuarioId) {
      return NextResponse.json({ ok: false, erro: "Usuário não informado." }, { status: 400 });
    }

    const { supabase, usuario, erro } = await getContexto();
    if (erro || !usuario) return erro;

    if (ramal) {
      const { data: existente, error: existenteError } = await supabase
        .from("usuarios_internos")
        .select("id, nome")
        .eq("ramal_3cx", ramal)
        .neq("id", usuarioId)
        .maybeSingle();

      if (existenteError) throw existenteError;
      if (existente) {
        return NextResponse.json({ ok: false, erro: `Este ramal já está vinculado a ${existente.nome}.` }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from("usuarios_internos")
      .update({
        ramal_3cx: ramal || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", usuarioId)
      .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo, ramal_3cx")
      .single();

    if (error) {
      console.error("Erro ao salvar ramal 3CX:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível salvar ramal 3CX." }, { status: 500 });
    }

    await supabase.from("configuracoes_auditoria").insert({
      usuario_id: usuario.id,
      acao: "vincular_ramal_3cx",
      modulo: "integracoes",
      entidade: "usuarios_internos",
      entidade_id: usuarioId,
      valor_novo: { ramal_3cx: ramal || null, usuario: data.nome },
    }).then(() => null);

    return NextResponse.json({ ok: true, usuario: data });
  } catch (error) {
    console.error("Erro inesperado ao salvar ramal 3CX:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao salvar ramal 3CX." }, { status: 500 });
  }
}
