import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  let body: { token?: string };

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

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Token é obrigatório.",
      },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(token);

  const { data: tokenRegistro, error: tokenError } = await supabase
    .from("whatsapp_conector_tokens")
    .select("id, usuario_id, token_prefixo, nome_dispositivo, observacao, ativo, usado, expira_em, criado_em")
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

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("id", tokenRegistro.usuario_id)
    .maybeSingle();

  if (usuarioError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar usuário do token.",
        detalhe: usuarioError.message,
      },
      { status: 500 }
    );
  }

  if (!usuario || !usuario.ativo) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Usuário do token inativo ou não encontrado.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    token_id: tokenRegistro.id,
    token_prefixo: tokenRegistro.token_prefixo,
    usuario_id: usuario.id,
    usuario_nome: usuario.nome,
    usuario_email: usuario.email,
    usuario_perfil: usuario.perfil,
    nome_dispositivo: tokenRegistro.nome_dispositivo,
    observacao: tokenRegistro.observacao,
    usado: tokenRegistro.usado,
    expira_em: tokenRegistro.expira_em,
    criado_em: tokenRegistro.criado_em,
  });
}
