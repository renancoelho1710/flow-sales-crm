import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function perfilSupervisor(perfil?: string | null) {
  return ["adm", "admin", "supervisor", "gerente", "suporte"].includes(
    String(perfil || "").toLowerCase()
  );
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const { data: usuarioInterno } = await supabase
      .from("usuarios_internos")
      .select("id, nome, perfil, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    if (!usuarioInterno) {
      return NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado ou inativo." },
        { status: 403 }
      );
    }

    const podeVerOperacional = perfilSupervisor(usuarioInterno.perfil);

    let query = supabase
      .from("notificacoes_operacionais")
      .select(
        `
        id,
        usuario_id,
        lead_id,
        agendamento_id,
        tipo,
        titulo,
        mensagem,
        prioridade,
        status,
        acao_url,
        som_ativo,
        som_volume,
        popup_ativo,
        popup_fechado_em,
        popup_fechado_por,
        popup_fechado_motivo,
        data_disparo,
        criado_em
        `
      )
      .in("status", ["pendente", "lida"])
      .lte("data_disparo", new Date().toISOString())
      .order("data_disparo", { ascending: false })
      .limit(30);

    if (!podeVerOperacional) {
      query = query.eq("usuario_id", usuarioInterno.id);
    }

    const { data: notificacoes, error } = await query;

    if (error) {
      console.error("Erro ao buscar notificações:", error);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível buscar notificações." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      usuario_id: usuarioInterno.id,
      perfil: usuarioInterno.perfil,
      total: notificacoes?.filter((item: any) => item.status === "pendente").length || 0,
      notificacoes: notificacoes || [],
    });
  } catch (error) {
    console.error("Erro inesperado ao listar notificações:", error);

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao listar notificações." },
      { status: 500 }
    );
  }
}
