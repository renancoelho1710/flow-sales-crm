import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Payload3CX = Record<string, unknown>;
type Registro = Record<string, unknown>;

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function numero(valor: unknown) {
  const convertido = Number(valor);

  return Number.isFinite(convertido) ? convertido : null;
}

function dataIso(valor: unknown) {
  const bruto = texto(valor);

  if (!bruto) return null;

  const data = new Date(bruto);

  if (Number.isNaN(data.getTime())) return null;

  return data.toISOString();
}

function tokenRecebido(request: Request) {
  return (
    request.headers.get("x-flow-3cx-token") ||
    request.headers.get("x-3cx-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();
}

function supabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ou URL do Supabase não configurada.",
    );
  }

  return createSupabaseAdminClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function buscarIntegracao3CX(
  supabase: ReturnType<typeof supabaseAdmin>,
) {
  const { data, error } = await supabase
    .from("integracoes_configuracoes")
    .select("id, chave, ativo, token_criptografado, parametros")
    .eq("chave", "3cx")
    .maybeSingle();

  if (error) throw error;

  return (data || null) as Registro | null;
}

function validarToken3CX(recebido: string, integracao: Registro | null) {
  const envToken =
    process.env.FLOW_3CX_STATUS_TOKEN ||
    process.env.THREECX_STATUS_TOKEN ||
    process.env.MONITOR_3CX_TOKEN ||
    "";

  const parametros = (integracao?.parametros || {}) as Registro;

  const tokensValidos = [
    envToken,
    parametros.webhook_token,
    parametros.flow_webhook_token,
    integracao?.token_criptografado,
  ]
    .map((item) => texto(item))
    .filter(Boolean);

  if (tokensValidos.length === 0) return false;

  return tokensValidos.includes(recebido);
}

function normalizarTelefone(valor: unknown) {
  let numeros = texto(valor).replace(/\D/g, "");

  if (numeros.length > 11 && numeros.startsWith("55")) {
    numeros = numeros.slice(2);
  }

  return numeros || null;
}

function normalizarDirecao(body: Payload3CX) {
  const bruto = texto(
    body.direcao ||
      body.direction ||
      body.tipo ||
      body.call_type ||
      body.type ||
      body.sentido,
  ).toLowerCase();

  if (
    ["entrada", "incoming", "inbound", "recebida", "received"].includes(bruto)
  ) {
    return "entrada";
  }

  if (
    ["saida", "saída", "outgoing", "outbound", "realizada", "sent"].includes(
      bruto,
    )
  ) {
    return "saida";
  }

  if (["interna", "internal"].includes(bruto)) {
    return "interna";
  }

  return "desconhecida";
}

function normalizarStatus(body: Payload3CX) {
  const bruto = texto(
    body.status ||
      body.evento ||
      body.event ||
      body.call_status ||
      body.estado ||
      body.state,
  ).toLowerCase();

  if (
    [
      "ringing",
      "ring",
      "incoming",
      "outgoing",
      "tocando",
      "chamando",
      "calling",
    ].includes(bruto)
  ) {
    return "tocando";
  }

  if (
    [
      "connected",
      "answered",
      "answer",
      "call_start",
      "start",
      "em_ligacao",
      "em_ligação",
      "busy",
      "ocupado",
      "in_call",
    ].includes(bruto)
  ) {
    return "em_andamento";
  }

  if (["atendida", "answered_call"].includes(bruto)) {
    return "atendida";
  }

  if (
    [
      "missed",
      "no_answer",
      "not_answered",
      "nao_atendeu",
      "não_atendeu",
      "perdida",
    ].includes(bruto)
  ) {
    return "perdida";
  }

  if (["failed", "falhou", "erro", "error"].includes(bruto)) {
    return "falhou";
  }

  if (["cancelled", "canceled", "cancelada"].includes(bruto)) {
    return "cancelada";
  }

  if (
    [
      "hangup",
      "ended",
      "end",
      "finished",
      "idle",
      "available",
      "disponivel",
      "disponível",
      "call_end",
      "finalizada",
    ].includes(bruto)
  ) {
    return "finalizada";
  }

  return "registrada";
}

function pegarChamadaId(body: Payload3CX) {
  return (
    texto(
      body.provedor_chamada_id ||
        body.call_id ||
        body.callid ||
        body.callId ||
        body.id_chamada ||
        body.uniqueid ||
        body.unique_id ||
        body.session_id ||
        body.id,
    ) || null
  );
}

function pegarEventoId(body: Payload3CX) {
  return (
    texto(
      body.provedor_evento_id ||
        body.event_id ||
        body.eventId ||
        body.id_evento ||
        body.sequence ||
        body.seq,
    ) || null
  );
}

function pegarRamal(body: Payload3CX) {
  return (
    texto(
      body.ramal ||
        body.extension ||
        body.ext ||
        body.numero ||
        body.phone ||
        body.from_extension ||
        body.to_extension,
    ) || null
  );
}

function pegarTelefoneCliente(body: Payload3CX) {
  return (
    texto(
      body.telefone_cliente ||
        body.telefone ||
        body.numero_cliente ||
        body.customer_number ||
        body.external_number ||
        body.caller ||
        body.callee ||
        body.from ||
        body.to ||
        body.phone_number,
    ) || null
  );
}

async function buscarUsuarioPorPayload(
  supabase: ReturnType<typeof supabaseAdmin>,
  body: Payload3CX,
) {
  const usuarioId = texto(body.usuario_id);
  const ramal = pegarRamal(body);

  if (usuarioId) {
    const { data, error } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo, ramal_3cx")
      .eq("id", usuarioId)
      .eq("ativo", true)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as Registro;
  }

  if (ramal) {
    const { data, error } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo, ramal_3cx")
      .eq("ramal_3cx", ramal)
      .eq("ativo", true)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as Registro;
  }

  return null;
}

function montarDadosChamada(
  body: Payload3CX,
  usuario: Registro | null,
  chamadaId: string,
) {
  const telefoneCliente = pegarTelefoneCliente(body);
  const status = normalizarStatus(body);

  const iniciouEm =
    dataIso(body.iniciou_em) ||
    dataIso(body.started_at) ||
    dataIso(body.start_time) ||
    dataIso(body.call_start) ||
    (["tocando", "em_andamento", "atendida", "registrada"].includes(status)
      ? new Date().toISOString()
      : null);

  const atendeuEm =
    dataIso(body.atendeu_em) ||
    dataIso(body.answered_at) ||
    dataIso(body.answer_time) ||
    (["em_andamento", "atendida"].includes(status)
      ? new Date().toISOString()
      : null);

  const finalizouEm =
    dataIso(body.finalizou_em) ||
    dataIso(body.ended_at) ||
    dataIso(body.end_time) ||
    dataIso(body.call_end) ||
    (["finalizada", "perdida", "falhou", "cancelada"].includes(status)
      ? new Date().toISOString()
      : null);

  return {
    provedor: "3cx",
    provedor_chamada_id: chamadaId,
    provedor_evento_id: pegarEventoId(body),
    usuario_id: texto(usuario?.id) || null,
    ramal: pegarRamal(body),
    direcao: normalizarDirecao(body),
    status,
    telefone_cliente: telefoneCliente,
    telefone_normalizado: normalizarTelefone(telefoneCliente),
    nome_cliente:
      texto(
        body.nome_cliente || body.customer_name || body.cliente || body.name,
      ) || null,
    iniciou_em: iniciouEm,
    atendeu_em: atendeuEm,
    finalizou_em: finalizouEm,
    duracao_segundos:
      numero(body.duracao_segundos) ||
      numero(body.duration_seconds) ||
      numero(body.duration) ||
      0,
    tempo_toque_segundos:
      numero(body.tempo_toque_segundos) ||
      numero(body.ring_seconds) ||
      numero(body.ring_duration) ||
      0,
    gravacao_url:
      texto(body.gravacao_url || body.recording_url || body.recording) || null,
    observacao: texto(body.observacao || body.note || body.notes) || null,
    dados_brutos: body,
  };
}

async function salvarEventoTelefonia({
  supabase,
  chamadaId,
  body,
  usuario,
  sucesso,
  erro,
}: {
  supabase: ReturnType<typeof supabaseAdmin>;
  chamadaId: string | null;
  body: Payload3CX;
  usuario: Registro | null;
  sucesso: boolean;
  erro?: string;
}) {
  await supabase.from("telefonia_eventos").insert({
    chamada_id: chamadaId,
    provedor: "3cx",
    tipo_evento:
      texto(
        body.evento ||
          body.event ||
          body.status ||
          body.call_status ||
          body.state,
      ) || "chamada",
    provedor_evento_id: pegarEventoId(body),
    usuario_id: texto(usuario?.id) || null,
    ramal: pegarRamal(body),
    payload: body,
    processado_em: new Date().toISOString(),
    sucesso,
    erro: erro || null,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    rota: "/api/3cx/chamadas",
    metodo: "POST",
    descricao: "Recebe eventos/chamadas do 3CX e salva em telefonia_chamadas.",
    headers: ["x-flow-3cx-token", "x-3cx-token", "Authorization: Bearer TOKEN"],
    exemplo: {
      call_id: "abc-123",
      evento: "connected",
      ramal: "101",
      telefone_cliente: "11999999999",
      direcao: "saida",
    },
  });
}

export async function POST(request: Request) {
  const supabase = supabaseAdmin();
  let body: Payload3CX = {};

  try {
    const recebido = tokenRecebido(request);
    const integracao = await buscarIntegracao3CX(supabase);

    if (!integracao?.ativo) {
      return NextResponse.json(
        {
          ok: false,
          erro: "Integração 3CX está desativada em Configurações > Integrações.",
        },
        { status: 403 },
      );
    }

    if (!validarToken3CX(recebido, integracao)) {
      return NextResponse.json(
        {
          ok: false,
          erro: "Token do webhook 3CX inválido ou não configurado.",
        },
        { status: 401 },
      );
    }

    body = (await request.json().catch(() => ({}))) as Payload3CX;

    const usuario = await buscarUsuarioPorPayload(supabase, body);
    const chamadaId =
      pegarChamadaId(body) ||
      pegarEventoId(body) ||
      `${pegarRamal(body) || "sem-ramal"}-${Date.now()}`;

    const dadosChamada = montarDadosChamada(body, usuario, chamadaId);

    const { data: chamadaExistente, error: erroBusca } = await supabase
      .from("telefonia_chamadas")
      .select("*")
      .eq("provedor", "3cx")
      .eq("provedor_chamada_id", chamadaId)
      .maybeSingle();

    if (erroBusca) throw erroBusca;

    let chamadaSalva: Registro | null = null;

    if (chamadaExistente) {
      const existente = chamadaExistente as Registro;

      const { data, error } = await supabase
        .from("telefonia_chamadas")
        .update({
          usuario_id: dadosChamada.usuario_id || existente.usuario_id || null,
          ramal: dadosChamada.ramal || existente.ramal || null,
          provedor_evento_id:
            dadosChamada.provedor_evento_id ||
            existente.provedor_evento_id ||
            null,
          direcao:
            dadosChamada.direcao !== "desconhecida"
              ? dadosChamada.direcao
              : texto(existente.direcao) || "desconhecida",
          status:
            dadosChamada.status || texto(existente.status) || "registrada",
          telefone_cliente:
            dadosChamada.telefone_cliente || existente.telefone_cliente || null,
          telefone_normalizado:
            dadosChamada.telefone_normalizado ||
            existente.telefone_normalizado ||
            null,
          nome_cliente:
            dadosChamada.nome_cliente || existente.nome_cliente || null,
          iniciou_em: dadosChamada.iniciou_em || existente.iniciou_em || null,
          atendeu_em: dadosChamada.atendeu_em || existente.atendeu_em || null,
          finalizou_em:
            dadosChamada.finalizou_em || existente.finalizou_em || null,
          duracao_segundos:
            dadosChamada.duracao_segundos || existente.duracao_segundos || 0,
          tempo_toque_segundos:
            dadosChamada.tempo_toque_segundos ||
            existente.tempo_toque_segundos ||
            0,
          gravacao_url:
            dadosChamada.gravacao_url || existente.gravacao_url || null,
          observacao: dadosChamada.observacao || existente.observacao || null,
          dados_brutos: {
            ...(existente.dados_brutos as Registro),
            ultimo_payload: body,
          },
        })
        .eq("id", texto(existente.id))
        .select("*")
        .single();

      if (error) throw error;
      chamadaSalva = data as Registro;
    } else {
      const { data, error } = await supabase
        .from("telefonia_chamadas")
        .insert(dadosChamada)
        .select("*")
        .single();

      if (error) throw error;
      chamadaSalva = data as Registro;
    }

    await salvarEventoTelefonia({
      supabase,
      chamadaId: texto(chamadaSalva?.id),
      body,
      usuario,
      sucesso: true,
    });

    return NextResponse.json({
      ok: true,
      chamada: chamadaSalva,
      usuario_identificado: usuario
        ? {
            id: usuario.id,
            nome: usuario.nome,
            ramal_3cx: usuario.ramal_3cx,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro ao registrar chamada 3CX:", error);

    try {
      await salvarEventoTelefonia({
        supabase,
        chamadaId: null,
        body,
        usuario: null,
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } catch {
      // Não bloqueia a resposta caso falhe o log do erro.
    }

    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao registrar chamada 3CX.",
      },
      { status: 500 },
    );
  }
}
