import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function podeGerenciar(perfil?: string | null) {
  return ["adm", "admin", "supervisor", "gestor"].includes(
    String(perfil || "").toLowerCase(),
  );
}

async function contexto() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, usuario: null, erro: "Usuário não autenticado." };
  }

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuario) {
    return { supabase, usuario: null, erro: "Usuário interno não localizado." };
  }

  if (!podeGerenciar(usuario.perfil)) {
    return {
      supabase,
      usuario: null,
      erro: "Sem permissão para gerenciar campanhas.",
    };
  }

  return { supabase, usuario, erro: "" };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { supabase, usuario, erro } = await contexto();

  if (!usuario) {
    return NextResponse.json(
      { ok: false, erro },
      { status: erro.includes("permissão") ? 403 : 401 },
    );
  }

  const body = await request.json();
  const status = String(body?.status || "").trim();

  if (!["ativa", "pausada", "encerrada", "arquivada"].includes(status)) {
    return NextResponse.json(
      { ok: false, erro: "Status inválido." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("campanhas_telemarketing")
    .update({
      status,
      atualizado_por: usuario.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, erro: error.message || "Erro ao atualizar status." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, campanha: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { supabase, usuario, erro } = await contexto();

  if (!usuario) {
    return NextResponse.json(
      { ok: false, erro },
      { status: erro.includes("permissão") ? 403 : 401 },
    );
  }

  const { error } = await supabase
    .from("campanhas_telemarketing")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, erro: error.message || "Erro ao excluir campanha." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
