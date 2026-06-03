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

type ResultadoTesteIntegracao = {
  ok: boolean;
  status: "sucesso" | "erro" | "pendente";
  mensagem: string;
  http_status: number | null;
};

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente"].includes(normalizarPerfil(perfil));
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
  };
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
      erro: NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 }
      ),
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
      erro: NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado." },
        { status: 403 }
      ),
    };
  }

  if (!perfilGestao(usuario.perfil)) {
    return {
      supabase,
      usuario,
      erro: NextResponse.json(
        { ok: false, erro: "Acesso restrito ao teste de integrações." },
        { status: 403 }
      ),
    };
  }

  return { supabase, usuario: usuario as UsuarioInterno, erro: null };
}

async function auditarTeste({
  supabase,
  usuario,
  request,
  integracaoId,
  resultado,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  usuario: UsuarioInterno;
  request: Request;
  integracaoId: string;
  resultado: AnyRecord;
}) {
  const info = getRequestInfo(request);

  await supabase
    .from("configuracoes_auditoria")
    .insert({
      usuario_id: usuario.id,
      acao: "integracao_testada",
      modulo: "integracoes",
      entidade: "integracoes_configuracoes",
      entidade_id: integracaoId,
      valor_novo: {
        ...resultado,
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

function montarHeaders(token?: string | null) {
  const valor = String(token || "").trim();
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
  };

  if (valor) {
    headers.Authorization = `Bearer ${valor}`;
    headers["x-api-key"] = valor;
    headers.token = valor;
  }

  return headers;
}

async function testarHttp({
  baseUrl,
  token,
  timeoutSegundos,
}: {
  baseUrl: string;
  token?: string | null;
  timeoutSegundos: number;
}): Promise<ResultadoTesteIntegracao> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(4, timeoutSegundos) * 1000
  );

  try {
    const resposta = await fetch(baseUrl, {
      method: "GET",
      headers: montarHeaders(token),
      signal: controller.signal,
      cache: "no-store",
    });

    return {
      ok: resposta.ok,
      status: resposta.ok ? "sucesso" : "erro",
      mensagem: resposta.ok
        ? `Conexão validada. HTTP ${resposta.status}.`
        : `Resposta HTTP ${resposta.status}.`,
      http_status: resposta.status,
    };
  } catch (error) {
    return {
      ok: false,
      status: "erro",
      mensagem:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao testar conexão.",
      http_status: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function testarModoLocal(
  tipo: string,
  parametros: AnyRecord,
  baseUrl?: string | null
): ResultadoTesteIntegracao | null {
  const modo = String(parametros?.modo_operacao || "");

  if (tipo === "3cx" && modo === "webhook_monitor") {
    return {
      ok: true,
      status: "sucesso",
      mensagem: "Webhook 3CX pronto para receber eventos do monitor/conector.",
      http_status: null,
    };
  }

  if (tipo === "3cx" && modo === "click_to_call") {
    const webClient = String(parametros?.web_client_url || baseUrl || "").trim();

    if (!webClient) {
      return {
        ok: false,
        status: "pendente",
        mensagem: "Informe a URL do 3CX Web Client.",
        http_status: null,
      };
    }

    return {
      ok: true,
      status: "sucesso",
      mensagem: "Modo click-to-call habilitado.",
      http_status: null,
    };
  }

  if (tipo === "zoiper_sip") {
    const protocolo = String(parametros?.protocolo_discagem || "tel").trim();

    if (!["tel", "callto", "sip", "zoiper"].includes(protocolo)) {
      return {
        ok: false,
        status: "erro",
        mensagem: "Protocolo de discagem inválido.",
        http_status: null,
      };
    }

    return {
      ok: true,
      status: "sucesso",
      mensagem: `Protocolo ${protocolo}: pronto para discagem assistida.`,
      http_status: null,
    };
  }

  if (tipo === "webhook_personalizado") {
    return {
      ok: true,
      status: "sucesso",
      mensagem: "Webhook personalizado pronto para configuração externa.",
      http_status: null,
    };
  }

  if (modo === "manual_assistido") {
    return {
      ok: true,
      status: "sucesso",
      mensagem: "Modo manual assistido habilitado.",
      http_status: null,
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const chave = String(body?.chave || "").trim();

    if (!chave) {
      return NextResponse.json(
        { ok: false, erro: "Chave da integração não informada." },
        { status: 400 }
      );
    }

    const { supabase, usuario, erro } = await getContexto();
    if (erro || !usuario) return erro;

    const { data: integracao, error } = await supabase
      .from("integracoes_configuracoes")
      .select("id, chave, nome, tipo, ativo, base_url, token_criptografado, parametros")
      .eq("chave", chave)
      .maybeSingle();

    if (error || !integracao) {
      return NextResponse.json(
        { ok: false, erro: "Integração não encontrada." },
        { status: 404 }
      );
    }

    const tipo = String(integracao.tipo || "");
    const parametros =
      integracao.parametros && typeof integracao.parametros === "object"
        ? (integracao.parametros as AnyRecord)
        : {};
    const baseUrl = String(integracao.base_url || "").trim();
    const token = String(integracao.token_criptografado || "").trim();
    const timeoutSegundos = Number(parametros?.timeout_segundos || 12);

    let resultado: ResultadoTesteIntegracao | null = testarModoLocal(tipo, parametros, baseUrl);

    if (!resultado) {
      if (!baseUrl) {
        resultado = {
          ok: false,
          status: "pendente",
          mensagem: "URL/base não configurada.",
          http_status: null,
        };
      } else {
        resultado = await testarHttp({ baseUrl, token, timeoutSegundos });
      }
    }

    await supabase
      .from("integracoes_configuracoes")
      .update({
        ultimo_teste_em: new Date().toISOString(),
        ultimo_teste_status: resultado.status,
        ultimo_teste_mensagem: resultado.mensagem,
        atualizado_por: usuario.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq("chave", chave);

    await auditarTeste({
      supabase,
      usuario,
      request,
      integracaoId: integracao.id,
      resultado: {
        chave,
        nome: integracao.nome,
        tipo,
        modo_operacao: parametros?.modo_operacao || null,
        status: resultado.status,
        mensagem: resultado.mensagem,
        http_status: resultado.http_status,
      },
    });

    return NextResponse.json(
      {
        ok: resultado.ok,
        status: resultado.status,
        mensagem: resultado.mensagem,
        http_status: resultado.http_status,
      },
      { status: resultado.ok ? 200 : 400 }
    );
  } catch (error) {
    console.error("Erro inesperado ao testar integração:", error);
    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao testar integração." },
      { status: 500 }
    );
  }
}
