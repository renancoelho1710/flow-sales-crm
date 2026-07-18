import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload3CX = {
  ramal?: string;
  extension?: string;
  numero?: string;
  phone?: string;
  usuario_id?: string;
  evento?: string;
  event?: string;
  status?: string;
  em_ligacao?: boolean;
  motivo?: string;
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function normalizarEvento(body: Payload3CX) {
  const bruto = texto(body.evento || body.event || body.status).toLowerCase();

  if (typeof body.em_ligacao === "boolean") {
    return body.em_ligacao ? "em_ligacao" : "disponivel";
  }

  if (["ringing", "ring", "incoming", "outgoing", "connected", "answered", "call_start", "start", "em_ligacao", "busy", "ocupado"].includes(bruto)) {
    return "em_ligacao";
  }

  if (["hangup", "ended", "end", "finished", "idle", "available", "disponivel", "call_end"].includes(bruto)) {
    return "disponivel";
  }

  return null;
}

function tokenRecebido(request: Request) {
  return (
    request.headers.get("x-flow-3cx-token") ||
    request.headers.get("x-3cx-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();
}

async function buscarIntegracao3CX(supabase: any) {
  const { data, error } = await supabase
    .from("integracoes_configuracoes")
    .select("id, chave, ativo, token_criptografado, parametros")
    .eq("chave", "3cx")
    .maybeSingle();

  if (error) throw error;
  return data;
}

function validarToken3CX(recebido: string, integracao: any) {
  const envToken =
    process.env.FLOW_3CX_STATUS_TOKEN ||
    process.env.THREECX_STATUS_TOKEN ||
    process.env.MONITOR_3CX_TOKEN ||
    "";

  const parametros = integracao?.parametros || {};
  const tokensValidos = [
    envToken,
    parametros.webhook_token,
    parametros.flow_webhook_token,
    integracao?.token_criptografado,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (tokensValidos.length === 0) return false;
  return tokensValidos.includes(recebido);
}

async function buscarUsuarioPorPayload(supabase: any, body: Payload3CX) {
  const usuarioId = texto(body.usuario_id);
  const ramal = texto(body.ramal || body.extension || body.numero || body.phone);

  if (usuarioId) {
    const { data, error } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo, ramal_3cx")
      .eq("id", usuarioId)
      .eq("ativo", true)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (ramal) {
    const { data, error } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo, ramal_3cx")
      .eq("ramal_3cx", ramal)
      .eq("ativo", true)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
}

async function regraStatus(supabase: any, chave: string) {
  const { data, error } = await supabase
    .from("operacao_status_tipos")
    .select("chave, bloqueia_recebimento_leads, ativo")
    .eq("chave", chave)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function POST(request: Request) {
  try {
    const recebido = tokenRecebido(request);
    const supabase = await createClient();
    const integracao = await buscarIntegracao3CX(supabase);

    if (!integracao?.ativo) {
      return NextResponse.json(
        {
          ok: false,
          erro: "Integração 3CX está desativada em Configurações > Integrações.",
        },
        { status: 403 }
      );
    }

    if (!validarToken3CX(recebido, integracao)) {
      return NextResponse.json(
        {
          ok: false,
          erro: "Token do webhook 3CX inválido ou não configurado em Configurações > Integrações.",
        },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Payload3CX;
    const statusNovo = normalizarEvento(body);

    if (!statusNovo) {
      return NextResponse.json(
        { ok: false, erro: "Evento 3CX inválido. Envie connected/ringing para em_ligacao ou hangup/ended para disponivel." },
        { status: 400 }
      );
    }

    const usuario = await buscarUsuarioPorPayload(supabase, body);

    if (!usuario) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não encontrado pelo usuario_id ou ramal_3cx informado." },
        { status: 404 }
      );
    }

    if (usuario.status_administrativo && usuario.status_administrativo !== "disponivel") {
      return NextResponse.json({ ok: true, ignorado: true, motivo: "Status administrativo não está disponível.", usuario });
    }

    if (statusNovo === "disponivel" && usuario.status_operacional !== "em_ligacao") {
      return NextResponse.json({ ok: true, ignorado: true, motivo: "Fim de ligação ignorado porque o usuário não estava em ligação.", usuario });
    }

    const regra = await regraStatus(supabase, statusNovo);
    if (!regra) {
      return NextResponse.json({ ok: false, erro: `Regra de status ${statusNovo} não encontrada.` }, { status: 404 });
    }

    const recebeLeadsNovo = !regra.bloqueia_recebimento_leads;

    const { data: atualizado, error: updateError } = await supabase
      .from("usuarios_internos")
      .update({
        status_operacional: statusNovo,
        status_operacional_atualizado_em: new Date().toISOString(),
        recebe_leads: recebeLeadsNovo,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", usuario.id)
      .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo, ramal_3cx")
      .single();

    if (updateError) {
      console.error("Erro ao atualizar status via 3CX:", updateError);
      return NextResponse.json({ ok: false, erro: "Não foi possível atualizar status via 3CX." }, { status: 500 });
    }

    await supabase.from("usuario_status_logs").insert({
      usuario_id: usuario.id,
      status_anterior: usuario.status_operacional,
      status_novo: statusNovo,
      origem: "3cx_webhook",
      motivo: texto(body.motivo) || (statusNovo === "em_ligacao" ? "Ligação detectada pelo 3CX." : "Fim de ligação detectado pelo 3CX."),
      aplicado_por: null,
      bloqueou_recebimento_leads: regra.bloqueia_recebimento_leads,
      recebe_leads_anterior: usuario.recebe_leads,
      recebe_leads_novo: recebeLeadsNovo,
    });

    return NextResponse.json({ ok: true, usuario: atualizado });
  } catch (error) {
    console.error("Erro inesperado no webhook/status 3CX:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado no webhook/status 3CX." }, { status: 500 });
  }
}
