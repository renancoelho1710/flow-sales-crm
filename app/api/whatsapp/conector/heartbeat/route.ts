import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type HeartbeatBody = {
  token?: string;
  conector_id?: string;
  status?: "online" | "offline" | "erro" | "bloqueado";
  numero_whatsapp?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  precisao_metros?: number | string | null;
  mensagem?: string | null;
};

function somenteNumeros(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function pegarIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}

function numeroOuNull(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return null;

  const numero = Number(valor);

  if (Number.isNaN(numero)) return null;

  return numero;
}

function minutosDeHora(valor?: string | null) {
  if (!valor) return null;

  const [hora, minuto] = valor.split(":").map(Number);

  if (Number.isNaN(hora) || Number.isNaN(minuto)) return null;

  return hora * 60 + minuto;
}

function minutoAtualSaoPaulo() {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hora = Number(partes.find((parte) => parte.type === "hour")?.value || 0);
  const minuto = Number(partes.find((parte) => parte.type === "minute")?.value || 0);

  return hora * 60 + minuto;
}

function estaDentroDoHorario(inicio?: string | null, fim?: string | null) {
  const inicioMin = minutosDeHora(inicio);
  const fimMin = minutosDeHora(fim);

  if (inicioMin === null || fimMin === null) return true;

  const agora = minutoAtualSaoPaulo();

  if (inicioMin <= fimMin) {
    return agora >= inicioMin && agora <= fimMin;
  }

  return agora >= inicioMin || agora <= fimMin;
}

async function avaliarAcesso(params: {
  usuario: {
    id: string;
    modo_bloqueio_localizacao?: string | null;
    bloquear_sem_localizacao?: boolean | null;
    bloquear_fora_horario?: boolean | null;
    horario_inicio_padrao?: string | null;
    horario_fim_padrao?: string | null;
    permite_acesso_externo?: boolean | null;
  };
  latitude: number | null;
  longitude: number | null;
}) {
  const supabase = createAdminClient();

  const { usuario, latitude, longitude } = params;

  const modo = usuario.modo_bloqueio_localizacao || "alertar";
  const temLocalizacao = latitude !== null && longitude !== null;

  const { data: temExcecao } = await supabase.rpc("usuario_tem_excecao_acesso_ativa", {
    usuario_id_param: usuario.id,
    latitude_param: latitude,
    longitude_param: longitude,
  });

  if (usuario.bloquear_fora_horario) {
    const dentroHorario = estaDentroDoHorario(
      usuario.horario_inicio_padrao,
      usuario.horario_fim_padrao
    );

    if (!dentroHorario && !temExcecao) {
      return {
        permitido: false,
        bloqueado: true,
        status_localizacao: "bloqueada",
        motivo: "fora_do_horario",
        mensagem:
          "Acesso fora do horário liberado pelo responsável. Solicite liberação para entrar.",
      };
    }
  }

  if (modo === "livre" || usuario.permite_acesso_externo || temExcecao) {
    return {
      permitido: true,
      bloqueado: false,
      status_localizacao: temLocalizacao ? "permitida" : "sem_localizacao",
      motivo: temExcecao ? "excecao_temporaria" : "acesso_livre",
      mensagem: null,
    };
  }

  if (!temLocalizacao) {
    if (usuario.bloquear_sem_localizacao || modo === "bloquear") {
      return {
        permitido: false,
        bloqueado: true,
        status_localizacao: "sem_localizacao",
        motivo: "sem_localizacao",
        mensagem:
          "Localização não informada. Solicite liberação ao responsável para entrar.",
      };
    }

    return {
      permitido: true,
      bloqueado: false,
      status_localizacao: "sem_localizacao",
      motivo: "sem_localizacao_alerta",
      mensagem: null,
    };
  }

  const { data: localPermitido } = await supabase.rpc("usuario_localizacao_permitida", {
    usuario_id_param: usuario.id,
    latitude_param: latitude,
    longitude_param: longitude,
  });

  if (localPermitido) {
    return {
      permitido: true,
      bloqueado: false,
      status_localizacao: "permitida",
      motivo: "localizacao_permitida",
      mensagem: null,
    };
  }

  if (modo === "bloquear") {
    return {
      permitido: false,
      bloqueado: true,
      status_localizacao: "bloqueada",
      motivo: "fora_da_area",
      mensagem:
        "Localização fora da área liberada pelo responsável. Solicite liberação para entrar.",
    };
  }

  return {
    permitido: true,
    bloqueado: false,
    status_localizacao: "fora_da_area",
    motivo: "fora_da_area_alerta",
    mensagem: null,
  };
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  let body: HeartbeatBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        erro: "Body inválido. Envie JSON.",
      },
      { status: 400 }
    );
  }

  const token = String(body.token || "").trim();
  const conectorId = String(body.conector_id || "").trim();

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Token do conector é obrigatório.",
      },
      { status: 400 }
    );
  }

  if (!conectorId) {
    return NextResponse.json(
      {
        ok: false,
        erro: "conector_id é obrigatório.",
      },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(token);

  const { data: tokenRegistro, error: tokenError } = await supabase
    .from("whatsapp_conector_tokens")
    .select("id, usuario_id, ativo, expira_em")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao validar token.",
        detalhe: tokenError.message,
      },
      { status: 500 }
    );
  }

  if (!tokenRegistro || !tokenRegistro.ativo) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Token inválido ou inativo.",
      },
      { status: 401 }
    );
  }

  if (tokenRegistro.expira_em && new Date(tokenRegistro.expira_em) < new Date()) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Token expirado.",
      },
      { status: 401 }
    );
  }

  const { data: conector, error: conectorError } = await supabase
    .from("whatsapp_conectores")
    .select("id, usuario_id, token_id, dispositivo_id, ativo")
    .eq("id", conectorId)
    .eq("token_id", tokenRegistro.id)
    .maybeSingle();

  if (conectorError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar conector.",
        detalhe: conectorError.message,
      },
      { status: 500 }
    );
  }

  if (!conector || !conector.ativo) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Conector não encontrado ou inativo.",
      },
      { status: 404 }
    );
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios_internos")
    .select(
      `
      id,
      nome,
      email,
      perfil,
      ativo,
      modo_bloqueio_localizacao,
      bloquear_sem_localizacao,
      bloquear_fora_horario,
      horario_inicio_padrao,
      horario_fim_padrao,
      permite_acesso_externo
    `
    )
    .eq("id", conector.usuario_id)
    .maybeSingle();

  if (usuarioError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar usuário.",
        detalhe: usuarioError.message,
      },
      { status: 500 }
    );
  }

  if (!usuario || !usuario.ativo) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Usuário inativo ou não encontrado.",
      },
      { status: 403 }
    );
  }

  const ipPublico = pegarIp(request);
  const userAgent = request.headers.get("user-agent");

  const latitude = numeroOuNull(body.latitude);
  const longitude = numeroOuNull(body.longitude);
  const precisaoMetros = numeroOuNull(body.precisao_metros);

  const avaliacao = await avaliarAcesso({
    usuario,
    latitude,
    longitude,
  });

  const statusInformado = body.status || "online";
  const statusFinal = avaliacao.bloqueado ? "bloqueado" : statusInformado;

  const numeroWhatsapp = String(body.numero_whatsapp || "").trim() || null;
  const numeroWhatsappNormalizado = somenteNumeros(numeroWhatsapp);

  await supabase
    .from("whatsapp_conectores")
    .update({
      status: statusFinal,
      status_localizacao: avaliacao.status_localizacao,
      numero_whatsapp: numeroWhatsapp,
      numero_whatsapp_normalizado: numeroWhatsappNormalizado || null,
      ip_publico: ipPublico,
      latitude,
      longitude,
      precisao_metros: precisaoMetros,
      ultimo_heartbeat_em: new Date().toISOString(),
      ultima_sincronizacao_em: new Date().toISOString(),
      bloqueado: avaliacao.bloqueado,
      bloqueado_motivo: avaliacao.bloqueado ? avaliacao.motivo : null,
    })
    .eq("id", conector.id);

  await supabase.from("whatsapp_conector_heartbeats").insert({
    conector_id: conector.id,
    usuario_id: usuario.id,
    status: statusFinal,
    ip_publico: ipPublico,
    latitude,
    longitude,
    precisao_metros: precisaoMetros,
    status_localizacao: avaliacao.status_localizacao,
    mensagem: avaliacao.mensagem || body.mensagem || null,
  });

  await supabase.from("usuario_logs_acesso").insert({
    usuario_id: usuario.id,
    dispositivo_id: conector.dispositivo_id,
    origem: "conector_whatsapp",
    ip_publico: ipPublico,
    user_agent: userAgent,
    latitude,
    longitude,
    precisao_metros: precisaoMetros,
    permitido: avaliacao.permitido,
    bloqueado: avaliacao.bloqueado,
    motivo: avaliacao.motivo,
    mensagem_usuario: avaliacao.mensagem,
  });

  if (avaliacao.bloqueado) {
    await supabase.from("whatsapp_auditoria_alertas").insert({
      usuario_id: usuario.id,
      conector_id: conector.id,
      tipo: "conector_fora_da_area",
      severidade: "alta",
      titulo: "Conector bloqueado por localização",
      descricao: avaliacao.mensagem,
      status: "aberto",
    });
  }

  return NextResponse.json({
    ok: true,
    conector_id: conector.id,
    usuario_id: usuario.id,
    status: statusFinal,
    permitido: avaliacao.permitido,
    bloqueado: avaliacao.bloqueado,
    status_localizacao: avaliacao.status_localizacao,
    mensagem: avaliacao.mensagem,
  });
}
