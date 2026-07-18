import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AnyRecord = Record<string, any>;

type UsuarioInterno = {
  id: string;
  nome?: string | null;
  email?: string | null;
  perfil: string;
  ativo: boolean;
};

type IntegracaoPayload = {
  id?: string;
  chave?: string;
  nome?: string;
  descricao?: string | null;
  tipo?: string;
  ativo?: boolean;
  base_url?: string | null;
  usuario?: string | null;
  token?: string | null;
  parametros?: AnyRecord;
  acao?: string;
};

const TIPOS_CERTIFICADOS = [
  "c2s",
  "3cx",
  "zoiper_sip",
  "whatsapp",
  "webhook_personalizado",
  "sistema_externo",
] as const;

const MODOS_PERMITIDOS: Record<string, string[]> = {
  c2s: ["api_oficial", "webhook", "manual_assistido"],
  "3cx": ["call_control_api", "webhook_monitor", "click_to_call", "manual_assistido"],
  zoiper_sip: ["sip_click_to_call", "url_eventos", "manual_assistido"],
  whatsapp: ["api_oficial", "web_monitor", "webhook", "manual_assistido"],
  webhook_personalizado: ["webhook_entrada", "webhook_saida"],
  sistema_externo: ["api_externa", "webhook", "manual_assistido"],
};

const INTEGRACOES_BASE = [
  {
    chave: "c2s",
    nome: "C2S",
    descricao: "Origem, importação e sincronização de leads.",
    tipo: "c2s",
    parametros: {
      modo_operacao: "api_oficial",
      intervalo_sincronizacao_minutos: 15,
      timeout_segundos: 12,
      registrar_auditoria: true,
      registrar_logs: true,
      capacidades_manuais: {},
    },
  },
  {
    chave: "3cx",
    nome: "3CX",
    descricao: "Telefonia, eventos de ligação, ramais e controle de status.",
    tipo: "3cx",
    parametros: {
      modo_operacao: "webhook_monitor",
      intervalo_importacao_minutos: 15,
      abrir_em: "nova_aba",
      web_client_url: "",
      timeout_segundos: 12,
      registrar_chamadas_no_lead: true,
      sincronizar_status_por_ramal: true,
      permitir_iniciar_chamada: true,
      permitir_encerrar_chamada: false,
      permitir_transferir_chamada: false,
      capacidades_manuais: {},
    },
  },
  {
    chave: "zoiper_sip",
    nome: "Zoiper / SIP",
    descricao: "Discagem por softphone SIP, protocolos locais e eventos por URL.",
    tipo: "zoiper_sip",
    parametros: {
      modo_operacao: "sip_click_to_call",
      protocolo_discagem: "tel",
      url_evento: "",
      timeout_segundos: 8,
      registrar_chamadas_no_lead: true,
      sincronizar_status_por_evento: false,
      capacidades_manuais: {},
    },
  },
  {
    chave: "whatsapp",
    nome: "WhatsApp",
    descricao: "Mensageria, monitoramento, webhooks e registros no CRM.",
    tipo: "whatsapp",
    parametros: {
      modo_operacao: "web_monitor",
      intervalo_leitura_minutos: 5,
      gerar_notificacoes: true,
      registrar_conversas_no_lead: true,
      timeout_segundos: 12,
      capacidades_manuais: {},
    },
  },
  {
    chave: "webhook_personalizado",
    nome: "Webhook personalizado",
    descricao: "Recebimento controlado de eventos de sistemas externos.",
    tipo: "webhook_personalizado",
    parametros: {
      modo_operacao: "webhook_entrada",
      validar_assinatura: true,
      registrar_auditoria: true,
      capacidades_manuais: {},
    },
  },
  {
    chave: "sistema_externo",
    nome: "Sistema externo",
    descricao: "Conexão controlada com ferramentas externas autorizadas.",
    tipo: "sistema_externo",
    parametros: {
      modo_operacao: "api_externa",
      timeout_segundos: 12,
      registrar_auditoria: true,
      capacidades_manuais: {},
    },
  },
];

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function podeGerenciarIntegracoes(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente"].includes(normalizarPerfil(perfil));
}

function podeCriarIntegracao(perfil?: string | null) {
  return ["adm", "admin", "suporte"].includes(normalizarPerfil(perfil));
}

function slug(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mascararToken(token?: string | null) {
  const valor = String(token || "").trim();
  if (!valor) return null;
  if (valor.length <= 8) return "********";
  return `${"*".repeat(Math.max(8, valor.length - 4))}${valor.slice(-4)}`;
}

function gerarTokenWebhook() {
  return `flow_webhook_${randomBytes(32).toString("hex")}`;
}

function getRequestInfo(request: Request) {
  const headers = request.headers;
  return {
    ip:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      headers.get("cf-connecting-ip") ||
      headers.get("x-client-ip") ||
      "não identificado",
    userAgent: headers.get("user-agent") || "não identificado",
    pais: headers.get("cf-ipcountry") || null,
    cidade: headers.get("x-vercel-ip-city") || null,
    regiao: headers.get("x-vercel-ip-country-region") || null,
  };
}

function validarTipoModo(tipo: string, modo: string) {
  const tipoNormalizado = slug(tipo);
  if (!TIPOS_CERTIFICADOS.includes(tipoNormalizado as any)) {
    return { ok: false, erro: "Tipo de integração não certificado pelo Flow." };
  }

  const modos = MODOS_PERMITIDOS[tipoNormalizado] || [];
  if (!modos.includes(modo)) {
    return { ok: false, erro: "Modo de operação incompatível com o tipo da integração." };
  }

  return { ok: true, erro: null };
}

function calcularCapacidades(tipo: string, parametros: AnyRecord = {}) {
  const modo = String(parametros?.modo_operacao || "");
  const manuais = parametros?.capacidades_manuais && typeof parametros.capacidades_manuais === "object" ? parametros.capacidades_manuais : {};

  const base: Record<string, boolean> = {
    testar_conexao: false,
    receber_webhook: false,
    enviar_webhook: false,
    iniciar_chamada: false,
    encerrar_chamada: false,
    transferir_chamada: false,
    registrar_chamada: false,
    sincronizar_status: false,
    importar_leads: false,
    exportar_leads: false,
    enviar_mensagem: false,
    receber_mensagem: false,
    registrar_historico: false,
    sincronizar_agenda: false,
  };

  if (tipo === "c2s") {
    Object.assign(base, {
      testar_conexao: modo === "api_oficial",
      importar_leads: modo === "api_oficial" || modo === "webhook",
      exportar_leads: modo === "api_oficial",
      receber_webhook: modo === "webhook",
      registrar_historico: true,
    });
  }

  if (tipo === "3cx") {
    Object.assign(base, {
      testar_conexao: modo === "call_control_api",
      receber_webhook: modo === "webhook_monitor",
      iniciar_chamada: ["call_control_api", "click_to_call"].includes(modo),
      encerrar_chamada: modo === "call_control_api",
      transferir_chamada: modo === "call_control_api",
      registrar_chamada: true,
      sincronizar_status: ["call_control_api", "webhook_monitor"].includes(modo),
      registrar_historico: true,
    });
  }

  if (tipo === "zoiper_sip") {
    Object.assign(base, {
      iniciar_chamada: ["sip_click_to_call", "url_eventos"].includes(modo),
      receber_webhook: modo === "url_eventos",
      registrar_chamada: true,
      sincronizar_status: modo === "url_eventos",
      registrar_historico: true,
    });
  }

  if (tipo === "whatsapp") {
    Object.assign(base, {
      testar_conexao: modo === "api_oficial",
      receber_webhook: ["api_oficial", "webhook", "web_monitor"].includes(modo),
      enviar_mensagem: modo === "api_oficial",
      receber_mensagem: ["api_oficial", "webhook", "web_monitor"].includes(modo),
      registrar_historico: true,
    });
  }

  if (tipo === "webhook_personalizado") {
    Object.assign(base, {
      receber_webhook: modo === "webhook_entrada",
      enviar_webhook: modo === "webhook_saida",
      registrar_historico: true,
    });
  }

  if (tipo === "sistema_externo") {
    Object.assign(base, {
      testar_conexao: modo === "api_externa",
      receber_webhook: modo === "webhook",
      enviar_webhook: modo === "webhook",
      registrar_historico: true,
    });
  }

  return { ...base, ...manuais };
}

async function getContexto() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      usuario: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 }),
    };
  }

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuario) {
    return {
      supabase,
      usuario: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado ou inativo." }, { status: 403 }),
    };
  }

  if (!podeGerenciarIntegracoes(usuario.perfil)) {
    return {
      supabase,
      usuario,
      erro: NextResponse.json({ ok: false, erro: "Acesso restrito à gestão de integrações." }, { status: 403 }),
    };
  }

  return { supabase, usuario: usuario as UsuarioInterno, erro: null };
}

async function auditar({
  supabase,
  usuario,
  request,
  acao,
  entidadeId,
  valorAnterior,
  valorNovo,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  usuario: UsuarioInterno;
  request: Request;
  acao: string;
  entidadeId?: string | null;
  valorAnterior?: AnyRecord | null;
  valorNovo?: AnyRecord | null;
}) {
  const info = getRequestInfo(request);
  await supabase
    .from("configuracoes_auditoria")
    .insert({
      usuario_id: usuario.id,
      acao,
      modulo: "integracoes",
      entidade: "integracoes_configuracoes",
      entidade_id: entidadeId || null,
      valor_anterior: valorAnterior || null,
      valor_novo: {
        ...(valorNovo || {}),
        responsavel: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
        },
        acesso: info,
      },
      ip: info.ip,
      user_agent: info.userAgent,
    })
    .then(() => null);
}

async function garantirIntegracoesBase(supabase: Awaited<ReturnType<typeof createClient>>) {
  for (const item of INTEGRACOES_BASE) {
    await supabase
      .from("integracoes_configuracoes")
      .upsert(
        {
          ...item,
          ativo: false,
          parametros: {
            ...item.parametros,
            capacidades: calcularCapacidades(item.tipo, item.parametros),
          },
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "chave" }
      )
      .then(() => null);
  }
}

export async function GET() {
  try {
    const { supabase, erro } = await getContexto();
    if (erro) return erro;

    await garantirIntegracoesBase(supabase);

    const { data, error } = await supabase
      .from("integracoes_configuracoes")
      .select("id, chave, nome, descricao, tipo, ativo, base_url, usuario, token_mascarado, parametros, ultima_sincronizacao_em, ultimo_teste_em, ultimo_teste_status, ultimo_teste_mensagem, atualizado_em")
      .order("tipo", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao buscar integrações:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar integrações." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      integracoes: (data || []).map((item) => ({
        ...item,
        parametros: {
          ...(item.parametros || {}),
          capacidades: calcularCapacidades(String(item.tipo || ""), item.parametros || {}),
        },
      })),
      tipos_certificados: TIPOS_CERTIFICADOS,
      modos_permitidos: MODOS_PERMITIDOS,
    });
  } catch (error) {
    console.error("Erro inesperado em integrações:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao buscar integrações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as IntegracaoPayload | null;
    const nome = String(body?.nome || "").trim();
    const tipo = slug(String(body?.tipo || "sistema_externo"));
    const chave = slug(String(body?.chave || nome));
    const parametros = body?.parametros && typeof body.parametros === "object" ? body.parametros : {};
    const modo = String(parametros?.modo_operacao || MODOS_PERMITIDOS[tipo]?.[0] || "api_externa");

    if (!nome) return NextResponse.json({ ok: false, erro: "Nome da integração não informado." }, { status: 400 });
    if (!chave) return NextResponse.json({ ok: false, erro: "Chave da integração inválida." }, { status: 400 });

    const validacao = validarTipoModo(tipo, modo);
    if (!validacao.ok) return NextResponse.json({ ok: false, erro: validacao.erro }, { status: 400 });

    const { supabase, usuario, erro } = await getContexto();
    if (erro || !usuario) return erro;

    if (!podeCriarIntegracao(usuario.perfil)) {
      return NextResponse.json({ ok: false, erro: "Somente ADM/Suporte pode criar integrações." }, { status: 403 });
    }

    const tokenNovo = typeof body?.token === "string" && body.token.trim() ? body.token.trim() : null;
    const parametrosCompletos = {
      ...parametros,
      modo_operacao: modo,
      capacidades: calcularCapacidades(tipo, { ...parametros, modo_operacao: modo }),
    };

    const { data, error } = await supabase
      .from("integracoes_configuracoes")
      .insert({
        chave,
        nome,
        descricao: body?.descricao || null,
        tipo,
        ativo: Boolean(body?.ativo),
        base_url: body?.base_url || null,
        usuario: body?.usuario || null,
        token_mascarado: tokenNovo ? mascararToken(tokenNovo) : null,
        token_criptografado: tokenNovo,
        parametros: parametrosCompletos,
        criado_por: usuario.id,
        atualizado_por: usuario.id,
        atualizado_em: new Date().toISOString(),
      })
      .select("id, chave, nome, descricao, tipo, ativo, base_url, usuario, token_mascarado, parametros, ultima_sincronizacao_em, ultimo_teste_em, ultimo_teste_status, ultimo_teste_mensagem, atualizado_em")
      .single();

    if (error || !data) {
      console.error("Erro ao criar integração:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível criar integração. Verifique se a chave já existe." }, { status: 500 });
    }

    await auditar({
      supabase,
      usuario,
      request,
      acao: "integracao_criada",
      entidadeId: data.id,
      valorNovo: { ...data, token_criptografado: undefined },
    });

    return NextResponse.json({ ok: true, integracao: data });
  } catch (error) {
    console.error("Erro inesperado ao criar integração:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao criar integração." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as IntegracaoPayload | null;
    const chave = String(body?.chave || "").trim();
    const acao = String(body?.acao || "salvar").trim();

    if (!chave) return NextResponse.json({ ok: false, erro: "Chave da integração não informada." }, { status: 400 });

    const { supabase, usuario, erro } = await getContexto();
    if (erro || !usuario) return erro;

    const { data: atual } = await supabase
      .from("integracoes_configuracoes")
      .select("id, chave, nome, descricao, tipo, ativo, base_url, usuario, token_mascarado, parametros, token_criptografado")
      .eq("chave", chave)
      .maybeSingle();

    if (!atual) return NextResponse.json({ ok: false, erro: "Integração não encontrada." }, { status: 404 });

    const parametrosAtuais = atual?.parametros && typeof atual.parametros === "object" ? atual.parametros : {};
    const parametrosBody = body?.parametros && typeof body.parametros === "object" ? body.parametros : {};
    const tipo = slug(String(body?.tipo || atual.tipo));
    const modo = String(parametrosBody?.modo_operacao || parametrosAtuais?.modo_operacao || MODOS_PERMITIDOS[tipo]?.[0] || "api_externa");

    const validacao = validarTipoModo(tipo, modo);
    if (!validacao.ok) return NextResponse.json({ ok: false, erro: validacao.erro }, { status: 400 });

    const parametros = {
      ...parametrosAtuais,
      ...parametrosBody,
      modo_operacao: modo,
    };

    const tokenNovo = typeof body?.token === "string" && body.token.trim() ? body.token.trim() : null;
    let tokenGerado: string | null = null;

    if (acao === "gerar_webhook_token") {
      tokenGerado = gerarTokenWebhook();
      parametros.webhook_token = tokenGerado;
      parametros.webhook_token_mascarado = mascararToken(tokenGerado);
      parametros.webhook_gerado_em = new Date().toISOString();
    }

    parametros.capacidades = calcularCapacidades(tipo, parametros);

    const payload: AnyRecord = {
      nome: body?.nome || atual.nome,
      descricao: body?.descricao ?? atual.descricao,
      tipo,
      ativo: Boolean(body?.ativo),
      base_url: body?.base_url || null,
      usuario: body?.usuario || null,
      parametros,
      atualizado_por: usuario.id,
      atualizado_em: new Date().toISOString(),
    };

    if (tokenNovo) {
      payload.token_mascarado = mascararToken(tokenNovo);
      payload.token_criptografado = tokenNovo;
    }

    const { data, error } = await supabase
      .from("integracoes_configuracoes")
      .update(payload)
      .eq("chave", chave)
      .select("id, chave, nome, descricao, tipo, ativo, base_url, usuario, token_mascarado, parametros, ultima_sincronizacao_em, ultimo_teste_em, ultimo_teste_status, ultimo_teste_mensagem, atualizado_em")
      .single();

    if (error || !data) {
      console.error("Erro ao salvar integração:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível salvar integração." }, { status: 500 });
    }

    await auditar({
      supabase,
      usuario,
      request,
      acao: acao === "gerar_webhook_token" ? "integracao_webhook_token_gerado" : "integracao_atualizada",
      entidadeId: data.id,
      valorAnterior: { ...atual, token_criptografado: undefined },
      valorNovo: { ...data, token_criptografado: undefined, token_gerado: tokenGerado ? "gerado" : undefined },
    });

    return NextResponse.json({ ok: true, integracao: data, token_gerado: tokenGerado });
  } catch (error) {
    console.error("Erro inesperado ao salvar integração:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao salvar integração." }, { status: 500 });
  }
}
