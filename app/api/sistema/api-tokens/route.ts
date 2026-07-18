import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarTokenApi, hashToken, prefixoToken } from "@/lib/api-publica/auth";
import { registrarAuditoria } from "@/lib/sistema/auditoria";

type UsuarioInterno = {
  id?: string;
  nome?: string;
  email?: string;
  perfil?: string;
};

function podeGerenciar(usuario: UsuarioInterno | null, email?: string | null) {
  const perfil = String(usuario?.perfil || "").toLowerCase();

  return (
    ["adm", "admin", "suporte", "gestor"].includes(perfil) ||
    String(email || "").toLowerCase() === "renan@azulveiculos.com.br"
  );
}

async function usuarioAtual(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, interno: null };

  let interno: UsuarioInterno | null = null;

  const { data: porAuth } = await supabase
    .from("usuarios_internos")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  interno = porAuth || null;

  if (!interno && user.email) {
    const { data: porEmail } = await supabase
      .from("usuarios_internos")
      .select("*")
      .ilike("email", user.email)
      .maybeSingle();

    interno = porEmail || null;
  }

  return { user, interno };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { user, interno } = await usuarioAtual(supabase);

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    if (!podeGerenciar(interno, user.email)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para ver tokens." },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("api_tokens")
      .select(
        "id,nome,prefixo,ativo,permissoes,ultimo_uso_em,criado_em,revogado_em",
      )
      .order("criado_em", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, tokens: data || [] });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error ? error.message : "Erro ao carregar tokens.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, interno } = await usuarioAtual(supabase);

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    if (!podeGerenciar(interno, user.email)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para criar tokens." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const nome = String(body.nome || "").trim();

    if (!nome) {
      return NextResponse.json(
        { ok: false, erro: "Informe o nome do token." },
        { status: 400 },
      );
    }

    const permissoes =
      body.permissoes && typeof body.permissoes === "object"
        ? body.permissoes
        : {
            "health:ler": true,
            "vendas:ler": true,
          };

    const token = gerarTokenApi();
    const tokenHash = hashToken(token);
    const prefixo = prefixoToken(token);

    const { data, error } = await supabase
      .from("api_tokens")
      .insert({
        nome,
        token_hash: tokenHash,
        prefixo,
        ativo: true,
        permissoes,
        criado_por: interno?.id || user.id,
      })
      .select(
        "id,nome,prefixo,ativo,permissoes,ultimo_uso_em,criado_em,revogado_em",
      )
      .single();

    if (error) throw new Error(error.message);

    await registrarAuditoria({
      modulo: "api_publica",
      acao: "criar_token_api",
      entidade: "api_tokens",
      entidade_id: data.id,
      usuario_id: interno?.id || user.id,
      usuario_nome: interno?.nome || user.email,
      usuario_email: interno?.email || user.email,
      descricao: `Criou token de API ${nome}.`,
      depois: data,
    });

    return NextResponse.json({
      ok: true,
      token_copiavel: token,
      token: data,
      aviso:
        "Copie este token agora. Por segurança, ele não será exibido novamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro: error instanceof Error ? error.message : "Erro ao criar token.",
      },
      { status: 500 },
    );
  }
}
