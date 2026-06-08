import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UsuarioInterno = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string | null;
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

  if (!user) return { usuario: null, error: "Usuário não autenticado." };

  const { data: usuario, error } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (error) return { usuario: null, error: error.message };
  if (!usuario) return { usuario: null, error: "Usuário interno não encontrado ou inativo." };

  return { usuario: usuario as UsuarioInterno, error: null };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sessao = await usuarioLogado(supabase);

  if (!sessao.usuario) {
    return NextResponse.json({ ok: false, erro: sessao.error }, { status: 401 });
  }

  const usuario = sessao.usuario;
  const statusFiltro = request.nextUrl.searchParams.get("status") || "aguardando_resposta";
  const busca = normalizar(request.nextUrl.searchParams.get("busca"));
  const limite = Math.min(Number(request.nextUrl.searchParams.get("limite") || 80), 200);

  const { data: conversasRaw, error } = await supabase
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
    .eq("usuario_id", usuario.id)
    .order("atualizado_em", { ascending: false })
    .limit(limite);

  if (error) {
    return NextResponse.json(
      { ok: false, erro: "Erro ao buscar pendências WhatsApp.", detalhe: error.message },
      { status: 500 }
    );
  }

  let conversas: AnyRecord[] = ((conversasRaw || []) as AnyRecord[]).map((conversa: AnyRecord) => {
    const status = statusOperacional(conversa);
    return {
      ...conversa,
      status_operacional_whatsapp: status,
      mensagem_limpa: !previewTecnico(conversa.ultima_mensagem_preview),
      minutos_aguardando: status === "cliente_aguardando_resposta" ? minutosDesde(conversa.ultima_mensagem_em || conversa.atualizado_em) : 0,
    };
  });

  const leadIds = Array.from(new Set(conversas.map((item) => item.lead_id).filter(Boolean)));

  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, nome, telefone, telefone_normalizado, etapa, veiculo_interesse, responsavel_id, atendente_resgate_id")
        .in("id", leadIds)
    : { data: [] as AnyRecord[] };

  const leadsPorId = new Map((leads || []).map((item: AnyRecord) => [item.id, item]));

  conversas = conversas.map((conversa: AnyRecord) => {
    const lead = conversa.lead_id ? leadsPorId.get(conversa.lead_id) : null;

    return {
      ...conversa,
      lead_nome: lead?.nome || null,
      lead_telefone: lead?.telefone || lead?.telefone_normalizado || null,
      lead_veiculo: lead?.veiculo_interesse || null,
      lead_etapa: lead?.etapa || null,
    };
  });

  if (busca) {
    conversas = conversas.filter((item: AnyRecord) => {
      const texto = normalizar(
        [
          item.nome_contato,
          item.telefone_normalizado,
          item.ultima_mensagem_preview,
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
  } else if (statusFiltro === "sem_lead") {
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
      minutos_aguardando: status === "cliente_aguardando_resposta" ? minutosDesde(conversa.ultima_mensagem_em || conversa.atualizado_em) : 0,
    };
  });

  return NextResponse.json({
    ok: true,
    gerado_em: new Date().toISOString(),
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
    resumo: {
      total_conversas: todasValidas.length,
      aguardando_resposta: todasValidas.filter((item: AnyRecord) => item.status_operacional_whatsapp === "cliente_aguardando_resposta").length,
      aguardando_cliente: todasValidas.filter((item: AnyRecord) => item.status_operacional_whatsapp === "aguardando_cliente").length,
      sem_lead: todasValidas.filter((item: AnyRecord) => !item.lead_id).length,
      mensagens_tecnicas_ignoradas: todasValidas.filter((item: AnyRecord) => item.status_operacional_whatsapp === "mensagem_tecnica_ignorada").length,
      maior_espera_minutos: Math.max(0, ...todasValidas.map((item: AnyRecord) => Number(item.minutos_aguardando || 0))),
    },
    conversas,
  });
}
