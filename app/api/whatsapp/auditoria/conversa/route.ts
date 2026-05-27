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

function podeVerEquipe(usuario: UsuarioInterno) {
  return ["adm", "suporte", "gerente", "supervisor"].includes(usuario.perfil);
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

  const conversaId = request.nextUrl.searchParams.get("conversa_id");

  if (!conversaId) {
    return NextResponse.json(
      {
        ok: false,
        erro: "conversa_id é obrigatório.",
      },
      { status: 400 }
    );
  }

  const usuario = usuarioLogado as UsuarioInterno;
  const podeVerTodos = podeVerEquipe(usuario);

  let queryConversa = supabase
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
    .eq("id", conversaId);

  if (!podeVerTodos) {
    queryConversa = queryConversa.eq("usuario_id", usuario.id);
  }

  const { data: conversa, error: conversaError } = await queryConversa.maybeSingle();

  if (conversaError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar conversa.",
        detalhe: conversaError.message,
      },
      { status: 500 }
    );
  }

  if (!conversa) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Conversa não encontrada ou sem permissão.",
      },
      { status: 404 }
    );
  }

  const { data: mensagens, error: mensagensError } = await supabase
    .from("whatsapp_mensagens")
    .select(
      `
      id,
      conversa_id,
      conector_id,
      usuario_id,
      lead_id,
      whatsapp_message_id,
      telefone_normalizado,
      direcao,
      tipo,
      mensagem_preview,
      enviada_em,
      criado_em
    `
    )
    .eq("conversa_id", conversa.id)
    .order("enviada_em", { ascending: true, nullsFirst: true });

  if (mensagensError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar mensagens.",
        detalhe: mensagensError.message,
      },
      { status: 500 }
    );
  }

  const { data: atendente } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil")
    .eq("id", conversa.usuario_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    conversa: {
      ...conversa,
      usuario_nome: atendente?.nome || "Sem usuário",
      usuario_email: atendente?.email || null,
      usuario_perfil: atendente?.perfil || null,
    },
    mensagens: mensagens || [],
  });
}
