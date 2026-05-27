import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type GerarTokenBody = {
  usuario_id?: string;
  nome_dispositivo?: string;
  observacao?: string;
  expira_em?: string | null;
};

function gerarToken() {
  const parte1 = randomBytes(3).toString("hex").toUpperCase();
  const parte2 = randomBytes(3).toString("hex").toUpperCase();
  const parte3 = randomBytes(3).toString("hex").toUpperCase();

  return `FLOW-WPP-${parte1}-${parte2}-${parte3}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function prefixoToken(token: string) {
  const partes = token.split("-");
  return partes.slice(0, 3).join("-");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

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

  const { data: usuarioLogado, error: usuarioLogadoError } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (usuarioLogadoError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao validar usuário logado.",
        detalhe: usuarioLogadoError.message,
      },
      { status: 500 }
    );
  }

  if (!usuarioLogado || !["adm", "suporte"].includes(usuarioLogado.perfil)) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Usuário sem permissão para gerar token de conector.",
      },
      { status: 403 }
    );
  }

  let body: GerarTokenBody;

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

  const usuarioId = String(body.usuario_id || "").trim();

  if (!usuarioId) {
    return NextResponse.json(
      {
        ok: false,
        erro: "usuario_id é obrigatório.",
      },
      { status: 400 }
    );
  }

  const { data: usuarioDestino, error: usuarioDestinoError } = await supabaseAdmin
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("id", usuarioId)
    .maybeSingle();

  if (usuarioDestinoError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar usuário destino.",
        detalhe: usuarioDestinoError.message,
      },
      { status: 500 }
    );
  }

  if (!usuarioDestino || !usuarioDestino.ativo) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Usuário destino inativo ou não encontrado.",
      },
      { status: 404 }
    );
  }

  const token = gerarToken();
  const tokenHash = hashToken(token);

  const { data: tokenCriado, error: insertError } = await supabaseAdmin
    .from("whatsapp_conector_tokens")
    .insert({
      usuario_id: usuarioDestino.id,
      token_prefixo: prefixoToken(token),
      token_hash: tokenHash,
      nome_dispositivo:
        String(body.nome_dispositivo || "").trim() ||
        `Conector WhatsApp - ${usuarioDestino.nome}`,
      observacao: String(body.observacao || "").trim() || null,
      expira_em: body.expira_em || null,
      ativo: true,
      criado_por: usuarioLogado.id,
    })
    .select("id, usuario_id, token_prefixo, nome_dispositivo, expira_em, criado_em")
    .single();

  if (insertError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao gerar token do conector.",
        detalhe: insertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    token,
    token_id: tokenCriado.id,
    usuario_id: tokenCriado.usuario_id,
    usuario_nome: usuarioDestino.nome,
    token_prefixo: tokenCriado.token_prefixo,
    nome_dispositivo: tokenCriado.nome_dispositivo,
    expira_em: tokenCriado.expira_em,
    criado_em: tokenCriado.criado_em,
    aviso:
      "Guarde este token agora. Por segurança, ele não será exibido novamente.",
  });
}


export async function GET() {
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

  const { data: usuarioLogado, error: usuarioLogadoError } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (usuarioLogadoError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao validar usuário logado.",
        detalhe: usuarioLogadoError.message,
      },
      { status: 500 }
    );
  }

  if (!usuarioLogado || !["adm", "suporte"].includes(usuarioLogado.perfil)) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Usuário sem permissão para listar usuários do conector.",
      },
      { status: 403 }
    );
  }

  const supabaseAdmin = createAdminClient();

  const { data: usuarios, error: usuariosError } = await supabaseAdmin
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (usuariosError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao listar usuários.",
        detalhe: usuariosError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    usuarios: usuarios || [],
  });
}
