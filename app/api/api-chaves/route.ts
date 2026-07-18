import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

const API_PREFIX = "flow";

const ESCOPOS_PERMITIDOS = new Set([
  "leads:read",
  "leads:create",
  "leads:update",
  "leads:archive",
  "leads:assign",
  "leads:export",
  "usuarios:read",
  "usuarios:update",
  "usuarios:permissions",
  "status:read",
  "status:write",
  "status:logs",
  "agenda:read",
  "agenda:create",
  "agenda:update",
  "agenda:cancel",
  "agenda:notifications",
  "kanban:read",
  "kanban:move",
  "kanban:update",
  "kanban:config",
  "3cx:status",
  "3cx:read",
  "3cx:import",
  "3cx:webhook",
  "whatsapp:read",
  "whatsapp:write",
  "whatsapp:notifications",
  "c2s:read",
  "c2s:import",
  "c2s:update",
  "relatorios:read",
  "relatorios:export",
  "relatorios:financeiro",
  "config:read",
  "config:write",
  "integracoes:read",
  "integracoes:write",
  "webhooks:read",
  "webhooks:write",
  "auditoria:read",
  "auditoria:export",
  "security:read",
]);

const ESCOPOS_SENSIVEIS = new Set([
  "leads:create",
  "leads:update",
  "leads:archive",
  "leads:assign",
  "leads:export",
  "usuarios:update",
  "usuarios:permissions",
  "status:write",
  "agenda:create",
  "agenda:update",
  "agenda:cancel",
  "kanban:move",
  "kanban:update",
  "kanban:config",
  "3cx:status",
  "3cx:import",
  "3cx:webhook",
  "whatsapp:write",
  "c2s:import",
  "c2s:update",
  "relatorios:export",
  "relatorios:financeiro",
  "config:write",
  "integracoes:write",
  "webhooks:write",
  "auditoria:read",
  "auditoria:export",
]);

type UsuarioInterno = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
};

type ApiKeyPayload = {
  nome?: string;
  descricao?: string;
  escopos?: string[];
  id?: string;
  acao?: "revogar" | "reativar";
  motivo?: string;
};

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function isAdm(perfil?: string | null) {
  return ["adm", "admin"].includes(normalizarPerfil(perfil));
}

function hashChave(chave: string) {
  return createHash("sha256").update(chave).digest("hex");
}

function escapeHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRequestInfo(request: Request) {
  const headers = request.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-client-ip") ||
    "não identificado";

  const userAgent = headers.get("user-agent") || "não identificado";
  const pais = headers.get("cf-ipcountry") || null;
  const cidade = headers.get("x-vercel-ip-city") || null;
  const regiao = headers.get("x-vercel-ip-country-region") || null;

  return { ip, userAgent, pais, cidade, regiao };
}

function normalizarEscopos(escopos?: string[]) {
  const lista = Array.isArray(escopos) ? escopos.map(String).map((item) => item.trim()).filter(Boolean) : [];
  const unicos = Array.from(new Set(lista));
  return unicos.filter((escopo) => ESCOPOS_PERMITIDOS.has(escopo));
}

async function getUsuarioInterno() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      usuario: null,
      response: NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 }),
    };
  }

  const { data: usuario, error } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (error || !usuario) {
    return {
      supabase,
      usuario: null,
      response: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado ou inativo." }, { status: 403 }),
    };
  }

  return { supabase, usuario: usuario as UsuarioInterno, response: null };
}

async function registrarAuditoria({
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
  valorAnterior?: Record<string, unknown> | null;
  valorNovo?: Record<string, unknown> | null;
}) {
  const info = getRequestInfo(request);

  await supabase.from("configuracoes_auditoria").insert({
    usuario_id: usuario.id,
    acao,
    modulo: "api",
    entidade: "api_chaves",
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
  });
}

async function enviarAlertaEmail({
  assunto,
  html,
}: {
  assunto: string;
  html: string;
}) {
  const destinos = String(process.env.FLOW_SECURITY_ALERT_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (destinos.length === 0) {
    return { ok: false, status: "sem_destinatario" };
  }

  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Flow Sales CRM <onboarding@resend.dev>",
        to: destinos,
        subject: assunto,
        html,
      });
      return { ok: true, status: "enviado_resend" };
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: destinos.join(","),
        subject: assunto,
        html,
      });
      return { ok: true, status: "enviado_smtp" };
    }

    return { ok: false, status: "email_nao_configurado" };
  } catch (error) {
    return {
      ok: false,
      status: "erro_envio",
      erro: error instanceof Error ? error.message : "Erro ao enviar alerta.",
    };
  }
}

function montarEmailApiCriada({
  usuario,
  nome,
  prefixo,
  escopos,
  request,
}: {
  usuario: UsuarioInterno;
  nome: string;
  prefixo: string;
  escopos: string[];
  request: Request;
}) {
  const info = getRequestInfo(request);
  const data = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const sensiveis = escopos.filter((escopo) => ESCOPOS_SENSIVEIS.has(escopo));

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h2 style="margin:0 0 12px">Nova chave API criada no Flow Sales CRM</h2>
      <p>Uma chave API foi criada por um administrador.</p>
      <table style="border-collapse:collapse;width:100%;max-width:760px">
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Chave</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(nome)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Prefixo</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(prefixo)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Escopos</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(escopos.join(", ") || "Nenhum")}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Escopos sensíveis</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(sensiveis.join(", ") || "Nenhum")}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>ADM</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(usuario.nome)} (${escapeHtml(usuario.email)})</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Data/hora</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(data)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>IP/local</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(`${info.ip}${info.cidade ? ` - ${info.cidade}` : ""}${info.pais ? `/${info.pais}` : ""}`)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Navegador</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(info.userAgent)}</td></tr>
      </table>
      <p style="margin-top:18px;color:#475569">A chave completa só foi exibida no momento da criação. Revogue imediatamente se essa ação não foi autorizada.</p>
    </div>
  `;
}

export async function GET() {
  const { supabase, usuario, response } = await getUsuarioInterno();
  if (response || !usuario) return response;

  if (!isAdm(usuario.perfil)) {
    return NextResponse.json({ ok: false, erro: "Acesso restrito ao ADM." }, { status: 403 });
  }

  const { data: chaves, error } = await supabase
    .from("api_chaves")
    .select("id, nome, descricao, prefixo, escopos, ativo, criado_por, revogado_por, ultimo_uso_em, revogado_em, criado_em, atualizado_em")
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, erro: "Não foi possível carregar as chaves API." }, { status: 500 });
  }

  const auditoriaIds = (chaves || []).map((chave) => chave.id);
  const { data: auditorias } = auditoriaIds.length
    ? await supabase
        .from("configuracoes_auditoria")
        .select("entidade_id, usuario_id, acao, valor_novo, ip, user_agent, criado_em")
        .eq("modulo", "api")
        .eq("acao", "api_chave_criada")
        .in("entidade_id", auditoriaIds)
    : { data: [] as any[] };

  const usuariosIds = Array.from(new Set((chaves || []).map((c) => c.criado_por).filter(Boolean)));
  const { data: usuarios } = usuariosIds.length
    ? await supabase.from("usuarios_internos").select("id, nome, email, perfil").in("id", usuariosIds)
    : { data: [] as any[] };

  const usuariosMap = new Map((usuarios || []).map((item) => [item.id, item]));
  const auditoriaMap = new Map((auditorias || []).map((item) => [item.entidade_id, item]));

  return NextResponse.json({
    ok: true,
    escopos_permitidos: Array.from(ESCOPOS_PERMITIDOS),
    chaves: (chaves || []).map((chave) => ({
      ...chave,
      criador: chave.criado_por ? usuariosMap.get(chave.criado_por) || null : null,
      auditoria_criacao: auditoriaMap.get(chave.id) || null,
    })),
  });
}

export async function POST(request: Request) {
  const { supabase, usuario, response } = await getUsuarioInterno();
  if (response || !usuario) return response;

  if (!isAdm(usuario.perfil)) {
    return NextResponse.json({ ok: false, erro: "Somente ADM pode gerar chave API." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as ApiKeyPayload | null;
  const nome = String(body?.nome || "").trim();
  const descricao = String(body?.descricao || "").trim() || null;
  const escoposInformados = Array.isArray(body?.escopos) ? body!.escopos!.map(String).filter(Boolean) : [];
  const escopos = normalizarEscopos(escoposInformados);

  if (!nome) {
    return NextResponse.json({ ok: false, erro: "Informe o nome da chave API." }, { status: 400 });
  }

  if (!descricao) {
    return NextResponse.json({ ok: false, erro: "Informe a finalidade da chave API." }, { status: 400 });
  }

  if (escopos.length === 0) {
    return NextResponse.json({ ok: false, erro: "Selecione ao menos um escopo permitido." }, { status: 400 });
  }

  if (escopos.length !== new Set(escoposInformados).size) {
    return NextResponse.json({ ok: false, erro: "A solicitação contém escopo inválido ou não permitido." }, { status: 400 });
  }

  const prefixo = `${API_PREFIX}_${randomBytes(4).toString("hex")}`;
  const segredo = randomBytes(32).toString("hex");
  const chaveCompleta = `${prefixo}.${segredo}`;

  const { data: criada, error } = await supabase
    .from("api_chaves")
    .insert({
      nome,
      descricao,
      prefixo,
      hash_chave: hashChave(chaveCompleta),
      escopos,
      ativo: true,
      criado_por: usuario.id,
      atualizado_em: new Date().toISOString(),
    })
    .select("id, nome, descricao, prefixo, escopos, ativo, criado_por, criado_em")
    .single();

  if (error || !criada) {
    return NextResponse.json({ ok: false, erro: "Não foi possível gerar a chave API." }, { status: 500 });
  }

  const alertaEmail = await enviarAlertaEmail({
    assunto: "Alerta de segurança: nova chave API criada no Flow Sales CRM",
    html: montarEmailApiCriada({ usuario, nome, prefixo, escopos, request }),
  });

  await registrarAuditoria({
    supabase,
    usuario,
    request,
    acao: "api_chave_criada",
    entidadeId: criada.id,
    valorNovo: {
      id: criada.id,
      nome,
      descricao,
      prefixo,
      escopos,
      escopos_sensiveis: escopos.filter((escopo) => ESCOPOS_SENSIVEIS.has(escopo)),
      email_alerta: alertaEmail,
    },
  });

  return NextResponse.json({
    ok: true,
    chave: {
      ...criada,
      chave_completa: chaveCompleta,
      email_alerta: alertaEmail,
    },
  });
}

export async function PATCH(request: Request) {
  const { supabase, usuario, response } = await getUsuarioInterno();
  if (response || !usuario) return response;

  if (!isAdm(usuario.perfil)) {
    return NextResponse.json({ ok: false, erro: "Somente ADM pode alterar chave API." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as ApiKeyPayload | null;
  const id = String(body?.id || "").trim();
  const acao = body?.acao || "revogar";
  const motivo = String(body?.motivo || "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, erro: "Chave API não informada." }, { status: 400 });
  }

  if (acao === "revogar" && !motivo) {
    return NextResponse.json({ ok: false, erro: "Informe o motivo da revogação." }, { status: 400 });
  }

  const { data: anterior } = await supabase
    .from("api_chaves")
    .select("id, nome, prefixo, ativo, escopos, criado_por, revogado_por, revogado_em")
    .eq("id", id)
    .single();

  if (!anterior) {
    return NextResponse.json({ ok: false, erro: "Chave API não encontrada." }, { status: 404 });
  }

  const update =
    acao === "reativar"
      ? {
          ativo: true,
          revogado_por: null,
          revogado_em: null,
          atualizado_em: new Date().toISOString(),
        }
      : {
          ativo: false,
          revogado_por: usuario.id,
          revogado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        };

  const { data, error } = await supabase
    .from("api_chaves")
    .update(update)
    .eq("id", id)
    .select("id, nome, descricao, prefixo, escopos, ativo, criado_por, revogado_por, ultimo_uso_em, revogado_em, criado_em, atualizado_em")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, erro: "Não foi possível atualizar a chave API." }, { status: 500 });
  }

  await registrarAuditoria({
    supabase,
    usuario,
    request,
    acao: acao === "reativar" ? "api_chave_reativada" : "api_chave_revogada",
    entidadeId: id,
    valorAnterior: anterior || null,
    valorNovo: {
      ...data,
      motivo: acao === "revogar" ? motivo : null,
    },
  });

  return NextResponse.json({ ok: true, chave: data });
}
