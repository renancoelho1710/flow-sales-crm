import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  id?: string;
  funil_id?: string;
  chave?: string;
  titulo?: string;
  subtitulo?: string | null;
  descricao?: string | null;
  cor?: string;
  ordem?: number;
  ativa?: boolean;
  exige_confirmacao?: boolean;
  exige_observacao?: boolean;
  exige_proxima_acao?: boolean;
  etapa_venda?: boolean;
  etapa_final?: boolean;
  bloqueada_operador?: boolean;
};

function texto(valor?: string | null) {
  return String(valor || "").trim();
}

function slug(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function usuarioPermitido() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, usuario: null, erro: "Usuário não autenticado.", status: 401 };
  }

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, nome, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuario) {
    return { supabase, usuario: null, erro: "Usuário interno não encontrado.", status: 403 };
  }

  const perfil = String(usuario.perfil || "").toLowerCase();
  const permitido = ["adm", "admin", "supervisor", "gerente", "suporte"].includes(perfil);

  if (!permitido) {
    return { supabase, usuario, erro: "Sem permissão para configurar o Kanban.", status: 403 };
  }

  return { supabase, usuario, erro: null, status: 200 };
}

export async function POST(request: Request) {
  const body = (await request.json()) as Payload;
  const { supabase, usuario, erro, status } = await usuarioPermitido();

  if (erro || !usuario) {
    return NextResponse.json({ ok: false, erro }, { status });
  }

  const titulo = texto(body.titulo);

  if (!titulo) {
    return NextResponse.json(
      { ok: false, erro: "Informe o título da coluna." },
      { status: 400 }
    );
  }

  const chave = texto(body.chave) || slug(titulo);

  const { data: coluna, error } = await supabase
    .from("kanban_colunas")
    .insert({
      funil_id: body.funil_id,
      chave,
      titulo,
      subtitulo: texto(body.subtitulo),
      descricao: texto(body.descricao),
      cor: texto(body.cor) || "blue",
      ordem: Number(body.ordem || 0),
      ativa: true,
      exige_confirmacao: true,
      exige_observacao: Boolean(body.exige_observacao),
      exige_proxima_acao: Boolean(body.exige_proxima_acao),
      etapa_venda: Boolean(body.etapa_venda),
      etapa_final: Boolean(body.etapa_final),
      bloqueada_operador: Boolean(body.bloqueada_operador),
      criado_por: usuario.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar coluna:", error);

    return NextResponse.json(
      { ok: false, erro: "Não foi possível criar a coluna." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, coluna });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Payload;
  const { supabase, usuario, erro, status } = await usuarioPermitido();

  if (erro || !usuario) {
    return NextResponse.json({ ok: false, erro }, { status });
  }

  if (!body.id) {
    return NextResponse.json(
      { ok: false, erro: "Coluna não informada." },
      { status: 400 }
    );
  }

  const atualizacao = {
    titulo: texto(body.titulo),
    subtitulo: texto(body.subtitulo),
    descricao: texto(body.descricao),
    cor: texto(body.cor) || "blue",
    ordem: Number(body.ordem || 0),
    ativa: Boolean(body.ativa),
    exige_observacao: Boolean(body.exige_observacao),
    exige_proxima_acao: Boolean(body.exige_proxima_acao),
    etapa_venda: Boolean(body.etapa_venda),
    etapa_final: Boolean(body.etapa_final),
    bloqueada_operador: Boolean(body.bloqueada_operador),
    atualizado_em: new Date().toISOString(),
  };

  const { data: coluna, error } = await supabase
    .from("kanban_colunas")
    .update(atualizacao)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao atualizar coluna:", error);

    return NextResponse.json(
      { ok: false, erro: "Não foi possível salvar a coluna." },
      { status: 500 }
    );
  }

  await supabase.from("kanban_colunas_logs").insert({
    funil_id: coluna.funil_id,
    coluna_id: coluna.id,
    usuario_id: usuario.id,
    acao: "atualizar_coluna",
    dados: coluna,
  });

  return NextResponse.json({ ok: true, coluna });
}
