import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UsuarioInterno = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
};

function inicioDiaIso(data?: string | null) {
  if (!data) return null;

  const valor = new Date(`${data}T00:00:00.000-03:00`);

  if (Number.isNaN(valor.getTime())) return null;

  return valor.toISOString();
}

function fimDiaIso(data?: string | null) {
  if (!data) return null;

  const valor = new Date(`${data}T23:59:59.999-03:00`);

  if (Number.isNaN(valor.getTime())) return null;

  return valor.toISOString();
}

function podeVerEquipe(usuario: UsuarioInterno) {
  return ["adm", "suporte", "gerente", "supervisor"].includes(usuario.perfil);
}

function contar<T>(lista: T[], filtro: (item: T) => boolean) {
  return lista.filter(filtro).length;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Usuário não autenticado.",
      },
      { status: 401 }
    );
  }

  const { data: usuarioLogado, error: usuarioError } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (usuarioError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao validar usuário logado.",
        detalhe: usuarioError.message,
      },
      { status: 500 }
    );
  }

  if (!usuarioLogado) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Usuário interno não encontrado ou inativo.",
      },
      { status: 403 }
    );
  }

  const usuario = usuarioLogado as UsuarioInterno;
  const podeVerTodos = podeVerEquipe(usuario);

  const searchParams = request.nextUrl.searchParams;

  const atendenteId = searchParams.get("atendente_id");
  const statusAuditoria = searchParams.get("status_auditoria");
  const filtro3cx = searchParams.get("filtro_3cx");
  const filtroBase = searchParams.get("filtro_base");
  const filtroResposta = searchParams.get("filtro_resposta");
  const filtroSemResposta = searchParams.get("filtro_sem_resposta");
  const dataInicio = inicioDiaIso(searchParams.get("data_inicio"));
  const dataFim = fimDiaIso(searchParams.get("data_fim"));

  const usuarioFiltro =
    podeVerTodos && atendenteId && atendenteId !== "todos"
      ? atendenteId
      : !podeVerTodos
        ? usuario.id
        : null;

  let queryConectores = supabase
    .from("whatsapp_conectores")
    .select(
      `
      id,
      usuario_id,
      nome_dispositivo,
      identificador_maquina,
      numero_whatsapp,
      numero_whatsapp_normalizado,
      status,
      status_localizacao,
      ip_publico,
      latitude,
      longitude,
      precisao_metros,
      ultima_sincronizacao_em,
      ultimo_heartbeat_em,
      bloqueado,
      bloqueado_motivo,
      ativo,
      criado_em
    `
    )
    .order("ultimo_heartbeat_em", { ascending: false, nullsFirst: false });

  if (usuarioFiltro) {
    queryConectores = queryConectores.eq("usuario_id", usuarioFiltro);
  }

  const { data: conectores, error: conectoresError } = await queryConectores;

  if (conectoresError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar conectores WhatsApp.",
        detalhe: conectoresError.message,
      },
      { status: 500 }
    );
  }

  let queryConversas = supabase
    .from("whatsapp_conversas")
    .select(
      `
      id,
      conector_id,
      usuario_id,
      contato_id,
      lead_id,
      telefone_normalizado,
      nome_contato,
      cliente_esta_na_base,
      teve_ligacao_3cx,
      falou_no_telefone,
      teve_whatsapp,
      cliente_respondeu,
      whatsapp_sem_3cx,
      conversa_fora_da_base,
      c2s_nao_atualizado,
      primeira_mensagem_em,
      ultima_mensagem_em,
      ultima_mensagem_preview,
      ultima_direcao,
      status_auditoria,
      revisado,
      revisado_por,
      revisado_em,
      criado_em,
      atualizado_em
    `
    )
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
    .limit(500);

  if (usuarioFiltro) {
    queryConversas = queryConversas.eq("usuario_id", usuarioFiltro);
  }

  if (statusAuditoria && statusAuditoria !== "todos") {
    queryConversas = queryConversas.eq("status_auditoria", statusAuditoria);
  }

  if (filtro3cx === "com_3cx") {
    queryConversas = queryConversas.eq("teve_ligacao_3cx", true);
  }

  if (filtro3cx === "sem_3cx") {
    queryConversas = queryConversas.eq("teve_ligacao_3cx", false);
  }

  if (filtroBase === "na_base") {
    queryConversas = queryConversas.eq("cliente_esta_na_base", true);
  }

  if (filtroBase === "fora_da_base") {
    queryConversas = queryConversas.eq("cliente_esta_na_base", false);
  }

  if (filtroResposta === "respondeu") {
    queryConversas = queryConversas.eq("cliente_respondeu", true);
  }

  if (filtroResposta === "nao_respondeu") {
    queryConversas = queryConversas.eq("cliente_respondeu", false);
  }

  if (filtroSemResposta === "sim") {
    queryConversas = queryConversas
      .eq("cliente_respondeu", false)
      .eq("ultima_direcao", "enviada");
  }

  if (dataInicio) {
    queryConversas = queryConversas.gte("ultima_mensagem_em", dataInicio);
  }

  if (dataFim) {
    queryConversas = queryConversas.lte("ultima_mensagem_em", dataFim);
  }

  const { data: conversas, error: conversasError } = await queryConversas;

  if (conversasError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar conversas WhatsApp.",
        detalhe: conversasError.message,
      },
      { status: 500 }
    );
  }

  let queryAlertas = supabase
    .from("whatsapp_auditoria_alertas")
    .select(
      `
      id,
      conversa_id,
      lead_id,
      usuario_id,
      conector_id,
      tipo,
      severidade,
      titulo,
      descricao,
      telefone_normalizado,
      status,
      resolvido_por,
      resolvido_em,
      criado_em
    `
    )
    .order("criado_em", { ascending: false })
    .limit(200);

  if (usuarioFiltro) {
    queryAlertas = queryAlertas.eq("usuario_id", usuarioFiltro);
  }

  if (dataInicio) {
    queryAlertas = queryAlertas.gte("criado_em", dataInicio);
  }

  if (dataFim) {
    queryAlertas = queryAlertas.lte("criado_em", dataFim);
  }

  const { data: alertas, error: alertasError } = await queryAlertas;

  if (alertasError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar alertas WhatsApp.",
        detalhe: alertasError.message,
      },
      { status: 500 }
    );
  }

  const usuarioIds = Array.from(
    new Set([
      ...(conectores || []).map((item) => item.usuario_id).filter(Boolean),
      ...(conversas || []).map((item) => item.usuario_id).filter(Boolean),
      ...(alertas || []).map((item) => item.usuario_id).filter(Boolean),
    ])
  );

  let usuarios: UsuarioInterno[] = [];

  if (usuarioIds.length > 0) {
    const { data: usuariosEncontrados } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo")
      .in("id", usuarioIds);

    usuarios = (usuariosEncontrados || []) as UsuarioInterno[];
  }

  const usuariosMap = new Map(usuarios.map((item) => [item.id, item]));

  const conectoresFormatados = (conectores || []).map((conector) => {
    const dono = usuariosMap.get(conector.usuario_id);

    return {
      ...conector,
      usuario_nome: dono?.nome || "Sem usuário",
      usuario_email: dono?.email || null,
      online:
        conector.status === "online" &&
        conector.ultimo_heartbeat_em &&
        Date.now() - new Date(conector.ultimo_heartbeat_em).getTime() <= 1000 * 60 * 3,
    };
  });

  const conversasFormatadas = (conversas || []).map((conversa) => {
    const dono = usuariosMap.get(conversa.usuario_id);

    return {
      ...conversa,
      usuario_nome: dono?.nome || "Sem usuário",
      usuario_email: dono?.email || null,
    };
  });

  const alertasFormatados = (alertas || []).map((alerta) => {
    const dono = usuariosMap.get(alerta.usuario_id);

    return {
      ...alerta,
      usuario_nome: dono?.nome || "Sem usuário",
      usuario_email: dono?.email || null,
    };
  });

  const resumo = {
    conectores_total: conectoresFormatados.length,
    conectores_online: contar(conectoresFormatados, (item) => item.online === true),
    conectores_offline: contar(
      conectoresFormatados,
      (item) => item.status !== "online" || item.online !== true
    ),
    conectores_bloqueados: contar(conectoresFormatados, (item) => item.bloqueado === true),

    conversas_total: conversasFormatadas.length,
    clientes_na_base: contar(conversasFormatadas, (item) => item.cliente_esta_na_base === true),
    conversas_fora_da_base: contar(
      conversasFormatadas,
      (item) => item.conversa_fora_da_base === true || item.cliente_esta_na_base === false
    ),
    com_ligacao_3cx: contar(conversasFormatadas, (item) => item.teve_ligacao_3cx === true),
    sem_ligacao_3cx: contar(conversasFormatadas, (item) => item.teve_ligacao_3cx === false),
    cliente_respondeu: contar(conversasFormatadas, (item) => item.cliente_respondeu === true),
    whatsapp_sem_3cx: contar(conversasFormatadas, (item) => item.whatsapp_sem_3cx === true),
    c2s_nao_atualizado: contar(conversasFormatadas, (item) => item.c2s_nao_atualizado === true),
    clientes_sem_resposta: contar(
      conversasFormatadas,
      (item) => item.cliente_respondeu === false && item.ultima_direcao === "enviada"
    ),

    alertas_total: alertasFormatados.length,
    alertas_abertos: contar(alertasFormatados, (item) => item.status === "aberto"),
    alertas_criticos: contar(alertasFormatados, (item) => item.severidade === "critica"),
    alertas_altos: contar(alertasFormatados, (item) => item.severidade === "alta"),
  };

  const porAtendente = usuarios.map((atendente) => {
    const conversasAtendente = conversasFormatadas.filter(
      (item) => item.usuario_id === atendente.id
    );

    const conectoresAtendente = conectoresFormatados.filter(
      (item) => item.usuario_id === atendente.id
    );

    const alertasAtendente = alertasFormatados.filter(
      (item) => item.usuario_id === atendente.id
    );

    return {
      usuario_id: atendente.id,
      nome: atendente.nome,
      email: atendente.email,
      perfil: atendente.perfil,
      conectores: conectoresAtendente.length,
      conectores_online: contar(conectoresAtendente, (item) => item.online === true),
      conversas: conversasAtendente.length,
      clientes_na_base: contar(
        conversasAtendente,
        (item) => item.cliente_esta_na_base === true
      ),
      fora_da_base: contar(
        conversasAtendente,
        (item) => item.conversa_fora_da_base === true
      ),
      cliente_respondeu: contar(
        conversasAtendente,
        (item) => item.cliente_respondeu === true
      ),
      whatsapp_sem_3cx: contar(
        conversasAtendente,
        (item) => item.whatsapp_sem_3cx === true
      ),
      clientes_sem_resposta: contar(
        conversasAtendente,
        (item) => item.cliente_respondeu === false && item.ultima_direcao === "enviada"
      ),
      alertas_abertos: contar(alertasAtendente, (item) => item.status === "aberto"),
    };
  });

  return NextResponse.json({
    ok: true,
    filtros: {
      atendente_id: usuarioFiltro || "todos",
      status_auditoria: statusAuditoria || "todos",
      filtro_3cx: filtro3cx || "todos",
      filtro_base: filtroBase || "todos",
      filtro_resposta: filtroResposta || "todos",
      filtro_sem_resposta: filtroSemResposta || "todos",
      data_inicio: searchParams.get("data_inicio"),
      data_fim: searchParams.get("data_fim"),
    },
    usuario_logado: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      pode_ver_todos: podeVerTodos,
    },
    resumo,
    por_atendente: porAtendente,
    conectores: conectoresFormatados,
    conversas: conversasFormatadas,
    alertas: alertasFormatados,
  });
}
