import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StatusPermitido = "disponivel" | "offline" | "ocupado";

function normalizarStatus(valor: unknown): StatusPermitido | null {
  const status = String(valor || "").trim().toLowerCase();
  if (status === "disponivel" || status === "offline" || status === "ocupado") return status;
  return null;
}

async function getUsuarioInterno() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      usuarioInterno: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 }),
    };
  }

  const { data: usuarioInterno, error } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (error || !usuarioInterno) {
    return {
      supabase,
      usuarioInterno: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado ou inativo." }, { status: 403 }),
    };
  }

  return { supabase, usuarioInterno, erro: null };
}

export async function GET() {
  const { usuarioInterno, erro } = await getUsuarioInterno();
  if (erro || !usuarioInterno) return erro;

  return NextResponse.json({ ok: true, usuario: usuarioInterno });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const status = normalizarStatus(body?.status);

    if (!status) {
      return NextResponse.json(
        { ok: false, erro: "Status inválido. O operador só pode escolher disponível, ocupado ou offline." },
        { status: 400 }
      );
    }

    const { supabase, usuarioInterno, erro } = await getUsuarioInterno();
    if (erro || !usuarioInterno) return erro;

    if (usuarioInterno.status_administrativo && usuarioInterno.status_administrativo !== "disponivel") {
      return NextResponse.json(
        { ok: false, erro: "Seu status administrativo impede alteração manual de status." },
        { status: 403 }
      );
    }

    const { data: regraStatus, error: regraError } = await supabase
      .from("operacao_status_tipos")
      .select("chave, bloqueia_recebimento_leads, permite_operador_aplicar, ativo")
      .eq("chave", status)
      .eq("ativo", true)
      .maybeSingle();

    if (regraError || !regraStatus) {
      return NextResponse.json({ ok: false, erro: "Regra de status não encontrada." }, { status: 404 });
    }

    if (!regraStatus.permite_operador_aplicar) {
      return NextResponse.json(
        { ok: false, erro: "Este status não pode ser aplicado pelo operador." },
        { status: 403 }
      );
    }

    const recebeLeadsNovo = !regraStatus.bloqueia_recebimento_leads;

    const { data: atualizado, error: updateError } = await supabase
      .from("usuarios_internos")
      .update({
        status_operacional: status,
        status_operacional_atualizado_em: new Date().toISOString(),
        recebe_leads: recebeLeadsNovo,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", usuarioInterno.id)
      .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo")
      .single();

    if (updateError) {
      console.error("Erro ao atualizar status próprio:", updateError);
      return NextResponse.json({ ok: false, erro: "Não foi possível atualizar seu status." }, { status: 500 });
    }

    await supabase.from("usuario_status_logs").insert({
      usuario_id: usuarioInterno.id,
      status_anterior: usuarioInterno.status_operacional,
      status_novo: status,
      origem: "usuario_topo",
      motivo: status === "offline" ? "Usuário ficou offline pelo topo." : status === "ocupado" ? "Usuário ficou ocupado pelo topo." : "Usuário ficou disponível pelo topo.",
      aplicado_por: usuarioInterno.id,
      bloqueou_recebimento_leads: regraStatus.bloqueia_recebimento_leads,
      recebe_leads_anterior: usuarioInterno.recebe_leads,
      recebe_leads_novo: recebeLeadsNovo,
    });

    return NextResponse.json({ ok: true, usuario: atualizado });
  } catch (error) {
    console.error("Erro inesperado ao alterar status próprio:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao alterar status." }, { status: 500 });
  }
}
