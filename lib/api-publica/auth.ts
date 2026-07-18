import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ApiTokenValidado = {
  id: string;
  nome: string;
  prefixo: string | null;
  permissoes: Record<string, any>;
};

export function gerarTokenApi() {
  const bruto = crypto.randomBytes(32).toString("hex");
  return `flow_live_${bruto}`;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function prefixoToken(token: string) {
  if (!token) return null;
  return `${token.slice(0, 12)}...${token.slice(-4)}`;
}

export function extrairToken(request: NextRequest) {
  const headerToken = request.headers.get("x-flow-token");
  if (headerToken) return headerToken.trim();

  const authorization = request.headers.get("authorization") || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

export function temPermissao(
  token: ApiTokenValidado | null,
  permissao: string,
) {
  if (!token) return false;

  const permissoes = token.permissoes || {};

  if (permissoes["*"] === true) return true;
  if (permissoes[permissao] === true) return true;

  return false;
}

export async function validarTokenApi(request: NextRequest) {
  const token = extrairToken(request);

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      erro: "Token não informado. Envie x-flow-token ou Authorization Bearer.",
      token: null,
    };
  }

  const supabase = await createClient();
  const tokenHash = hashToken(token);

  const { data, error } = await supabase
    .from("api_tokens")
    .select("id,nome,prefixo,ativo,permissoes,revogado_em")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      status: 500,
      erro: error.message,
      token: null,
    };
  }

  if (!data || !data.ativo || data.revogado_em) {
    return {
      ok: false as const,
      status: 401,
      erro: "Token inválido, inativo ou revogado.",
      token: null,
    };
  }

  await supabase
    .from("api_tokens")
    .update({ ultimo_uso_em: new Date().toISOString() })
    .eq("id", data.id);

  return {
    ok: true as const,
    status: 200,
    erro: null,
    token: {
      id: data.id,
      nome: data.nome,
      prefixo: data.prefixo,
      permissoes: data.permissoes || {},
    } as ApiTokenValidado,
  };
}

export async function registrarApiLog(input: {
  request: NextRequest;
  token?: ApiTokenValidado | null;
  status: number;
  sucesso: boolean;
  duracao_ms: number;
  erro?: string | null;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createClient();

    await supabase.from("api_logs").insert({
      token_id: input.token?.id || null,
      nome_token: input.token?.nome || null,
      metodo: input.request.method,
      rota: input.request.nextUrl.pathname,
      status: input.status,
      sucesso: input.sucesso,
      ip:
        input.request.headers.get("x-forwarded-for") ||
        input.request.headers.get("x-real-ip") ||
        null,
      user_agent: input.request.headers.get("user-agent"),
      duracao_ms: input.duracao_ms,
      erro: input.erro || null,
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.error("Erro ao registrar log da API pública:", error);
  }
}
