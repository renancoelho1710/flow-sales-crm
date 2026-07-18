import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  id?: string;
  acao?: "lida" | "resolvida" | "ignorada" | "popup_fechado";
  motivo?: string;
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const id = String(body.id || "").trim();
    const acao = body.acao || "lida";

    if (!id) {
      return NextResponse.json(
        { ok: false, erro: "Notificação não informada." },
        { status: 400 }
      );
    }

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
      .select("id, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    if (!usuarioInterno) {
      return NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado ou inativo." },
        { status: 403 }
      );
    }

    const agora = new Date().toISOString();
    const atualizacao: Record<string, string | null> = {};

    if (acao === "popup_fechado") {
      atualizacao.popup_fechado_em = agora;
      atualizacao.popup_fechado_por = usuarioInterno.id;
      atualizacao.popup_fechado_motivo = body.motivo || "fechado_no_popup";
    }

    if (acao === "lida") {
      atualizacao.status = "lida";
      atualizacao.lida_em = agora;
    }

    if (acao === "resolvida") {
      atualizacao.status = "resolvida";
      atualizacao.lida_em = agora;
      atualizacao.resolvida_em = agora;
    }

    if (acao === "ignorada") {
      atualizacao.status = "ignorada";
    }

    const { data, error } = await supabase
      .from("notificacoes_operacionais")
      .update(atualizacao)
      .eq("id", id)
      .eq("usuario_id", usuarioInterno.id)
      .select("id, status, popup_fechado_em")
      .single();

    if (error) {
      console.error("Erro ao marcar notificação:", error);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível atualizar a notificação." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      notificacao: data,
    });
  } catch (error) {
    console.error("Erro inesperado ao marcar notificação:", error);

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao marcar notificação." },
      { status: 500 }
    );
  }
}
