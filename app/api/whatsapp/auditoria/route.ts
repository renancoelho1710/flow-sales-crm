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

type AnyRecord = Record<string, any>;

const PREVIEWS_TECNICOS = [
  "carregando",
  "wds-ic-delivered",
  "wds-ic-read",
  "wds-ic-pending",
  "default-contact-refreshed",
  "mensagem apagada",
];

function normalizar(valor?: string | null) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function podeVerEquipe(usuario: UsuarioInterno) {
  return ["adm", "suporte", "gerente", "supervisor"].includes(normalizar(usuario.perfil));
}

function previewTecnico(valor?: string | null) {
  const texto = normalizar(valor)
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!texto) return true;

  return PREVIEWS_TECNICOS.some((item) => texto === item || texto.includes(item));
}

function minutosDesde(valor?: string | null) {
  if (!valor) return 0;
  const diff = Date.now() - new Date(valor).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function statusOperacional(conversa: AnyRecord) {
  if (previewTecnico(conversa.ultima_mensagem_preview)) return "mensagem_tecnica_ignorada";

  if (conversa.ultima_direcao === "recebida" && conversa.cliente_respondeu) {
    return "cliente_aguardando_resposta";
  }

  if (conversa.ultima_direcao === "enviada") {
    return "aguardando_cliente";
  }

  if (!conversa.lead_id) {
    return "sem_lead_vinculado";
  }

  return "em_monitoramento";
}

async function usuarioLogado(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, usuario: null, error: "Usuário não autenticado." };

  const { data: usuario, error } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (error) return { user, usuario: null, error: error.message };
  if (!usuario) return { user, usuario: null, error: "Usuário interno não encontrado ou inativo." };

  return { user, usuario: usuario as UsuarioInterno, error: null };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sessao = await usuarioLogado(supabase);

  if (!sessao.user) {
    return NextResponse.json({ ok: false, erro: sessao.error }, { status: 401 });
  }

  if (!sessao.usuario) {
    return NextResponse.json({ ok: false, erro: sessao.error }, { status: 403 });
  }

  const usuario = sessao.usuario;
  const gestao = podeVerEquipe(usuario);

  const statusFiltro = request.nextUrl.searchParams.get("status") || "aguardando_resposta";
  const busca = normalizar(request.nextUrl.searchParams.get("busca"));
  const limite = Math.min(Number(request.nextUrl.searchParams.get("limite") || 120), 250);

  let query = supabase
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
    .order("atualizado_em", { ascending: false })
    .limit(limite);

  if (!gestao) {
    query = query.eq("usuario_id", usuario.id);
  }

  const { data: conversasRaw, error: conversasError } = await query;

  if (conversasError) {
    return NextResponse.json(
      { ok: false, erro: "Erro ao buscar conversas WhatsApp.", detalhe: conversasError.message },
      { status: 500 }
    );
  }

  let conversas = (conversasRaw || []) as AnyRecord[];

  const usuarioIds = Array.from(new Set(conversas.map((item: AnyRecord) => item.usuario_id).filter(Boolean)));
  const leadIds = Array.from(new Set(conversas.map((item: AnyRecord) => item.lead_id).filter(Boolean)));

  const { data: usuarios } = usuarioIds.length
    ? await supabase.from("usuarios_internos").select("id, nome, email, perfil").in("id", usuarioIds)
    : { data: [] };

  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, nome, telefone, telefone_normalizado, etapa, veiculo_interesse, responsavel_id, atendente_resgate_id")
        .in("id", leadIds)
    : { data: [] };

  const usuariosPorId = new Map((usuarios || []).map((item: AnyRecord) => [item.id, item]));
  const leadsPorId = new Map((leads || []).map((item: AnyRecord) => [item.id, item]));

  conversas = conversas.map((conversa: AnyRecord) => {
    const status = statusOperacional(conversa);
    const lead = conversa.lead_id ? leadsPorId.get(conversa.lead_id) : null;
    const atendente = conversa.usuario_id ? usuariosPorId.get(conversa.usuario_id) : null;
    const mensagemLimpa = !previewTecnico(conversa.ultima_mensagem_preview);

    return {
      ...conversa,
      usuario_nome: atendente?.nome || "Sem atendente",
      usuario_email: atendente?.email || null,
      usuario_perfil: atendente?.perfil || null,
      lead_nome: lead?.nome || null,
      lead_telefone: lead?.telefone || lead?.telefone_normalizado || null,
      lead_veiculo: lead?.veiculo_interesse || null,
      lead_etapa: lead?.etapa || null,
      status_operacional_whatsapp: status,
      mensagem_limpa: mensagemLimpa,
      minutos_aguardando:
        status === "cliente_aguardando_resposta" ? minutosDesde(conversa.ultima_mensagem_em || conversa.atualizado_em) : 0,
    };
  });

  if (busca) {
    conversas = conversas.filter((item: AnyRecord) => {
      const texto = normalizar(
        [
          item.nome_contato,
          item.telefone_normalizado,
          item.ultima_mensagem_preview,
          item.usuario_nome,
          item.lead_nome,
          item.lead_veiculo,
        ].join(" ")
      );

      return texto.includes(busca);
    });
  }

  if (statusFiltro === "aguardando_resposta") {
    conversas = conversas.filter((item: AnyRecord) => item.status_operacional_whatsapp === "cliente_aguardando_resposta");
  } else if (statusFiltro === "aguardando_cliente") {
    conversas = conversas.filter((item: AnyRecord) => item.status_operacional_whatsapp === "aguardando_cliente");
  } else if (statusFiltro === "fora_da_base") {
    conversas = conversas.filter((item: AnyRecord) => !item.lead_id);
  } else if (statusFiltro === "com_lead") {
    conversas = conversas.filter((item: AnyRecord) => Boolean(item.lead_id));
  }

  const todasValidas: AnyRecord[] = ((conversasRaw || []) as AnyRecord[]).map((conversa: AnyRecord) => {
    const status = statusOperacional(conversa);

    return {
      ...conversa,
      status_operacional_whatsapp: status,
      mensagem_limpa: !previewTecnico(conversa.ultima_mensagem_preview),
      minutos_aguardando:
        status === "cliente_aguardando_resposta" ? minutosDesde(conversa.ultima_mensagem_em || conversa.atualizado_em) : 0,
    };
  });

  let conectores: AnyRecord[] = [];
  try {
    const { data: conectoresData } = await supabase
      .from("whatsapp_conectores")
      .select(
        "id, nome, identificador, status, usuario_id, ultimo_heartbeat_em, ultima_captura_em, total_conversas_capturadas, total_clientes_aguardando"
      )
      .order("ultimo_heartbeat_em", { ascending: false, nullsFirst: false })
      .limit(50);

    conectores = (conectoresData || []) as AnyRecord[];
  } catch {
    conectores = [];
  }

  const conectoresUsuarioIds = Array.from(new Set(conectores.map((item: AnyRecord) => item.usuario_id).filter(Boolean)));
  const { data: usuariosConectores } = conectoresUsuarioIds.length
    ? await supabase.from("usuarios_internos").select("id, nome, email").in("id", conectoresUsuarioIds)
    : { data: [] };
  const usuarioConectorPorId = new Map((usuariosConectores || []).map((item: AnyRecord) => [item.id, item]));

  const conectoresComUsuario: AnyRecord[] = conectores.map((conector: AnyRecord) => ({
    ...conector,
    usuario_nome: conector.usuario_id ? usuarioConectorPorId.get(conector.usuario_id)?.nome || null : null,
  }));

  const agora = Date.now();
  const conectoresOnline = conectores.filter((conector: AnyRecord) => {
    if (!conector.ultimo_heartbeat_em) return false;
    const diff = agora - new Date(conector.ultimo_heartbeat_em).getTime();
    return diff <= 3 * 60 * 1000;
  }).length;

  const resumo = {
    total_conversas: todasValidas.length,
    aguardando_resposta: todasValidas.filter((item: AnyRecord) => item.status_operacional_whatsapp === "cliente_aguardando_resposta").length,
    aguardando_cliente: todasValidas.filter((item: AnyRecord) => item.status_operacional_whatsapp === "aguardando_cliente").length,
    fora_da_base: todasValidas.filter((item: AnyRecord) => !item.lead_id).length,
    com_lead: todasValidas.filter((item: AnyRecord) => Boolean(item.lead_id)).length,
    mensagens_tecnicas_ignoradas: todasValidas.filter((item: AnyRecord) => item.status_operacional_whatsapp === "mensagem_tecnica_ignorada").length,
    conectores_online: conectoresOnline,
    conectores_offline: Math.max(0, conectoresComUsuario.length - conectoresOnline),
    maior_espera_minutos: Math.max(0, ...todasValidas.map((item: AnyRecord) => Number(item.minutos_aguardando || 0))),
  };

  return NextResponse.json({
    ok: true,
    gerado_em: new Date().toISOString(),
    permissao_gestao: gestao,
    resumo,
    conversas,
    conectores: conectoresComUsuario,
  });
}
