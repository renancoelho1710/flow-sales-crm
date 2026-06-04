import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PayloadMeta = {
  usuario_id?: string;
  meta_diaria_agendamentos?: number;
  meta_semanal_agendamentos?: number;
  meta_mensal_agendamentos?: number;
  meta_mensal_vendas?: number;
  comissao_por_venda?: number | null;
  ativo?: boolean;
};

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "gerente", "supervisor", "suporte"].includes(String(perfil || "").trim().toLowerCase());
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
      erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado." }, { status: 403 }),
    };
  }

  if (!perfilGestao(usuario.perfil)) {
    return {
      supabase,
      usuario,
      erro: NextResponse.json({ ok: false, erro: "Apenas gestão pode configurar metas." }, { status: 403 }),
    };
  }

  return { supabase, usuario, erro: null };
}

function numeroSeguro(valor: unknown, fallback: number, min = 0) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return fallback;
  return Math.max(min, numero);
}

function comissaoOpcional(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return Math.max(0, numero);
}

export async function GET() {
  try {
    const { supabase, erro } = await getContexto();
    if (erro) return erro;

    const [usuarios, metas] = await Promise.all([
      supabase
        .from("usuarios_internos")
        .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("metas_colaboradores")
        .select("id, usuario_id, meta_diaria_agendamentos, meta_semanal_agendamentos, meta_mensal_agendamentos, meta_mensal_vendas, comissao_por_venda, ativo, atualizado_em")
        .eq("ativo", true),
    ]);

    if (usuarios.error) {
      console.error("Erro ao buscar usuários para metas:", usuarios.error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar usuários." }, { status: 500 });
    }

    if (metas.error) {
      console.error("Erro ao buscar metas:", metas.error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar metas." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, usuarios: usuarios.data || [], metas: metas.data || [] });
  } catch (error) {
    console.error("Erro inesperado ao buscar metas:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao buscar metas." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PayloadMeta;
    const usuarioId = String(body.usuario_id || "").trim();

    if (!usuarioId) {
      return NextResponse.json({ ok: false, erro: "Usuário não informado." }, { status: 400 });
    }

    const { supabase, usuario, erro } = await getContexto();
    if (erro || !usuario) return erro;

    const payload = {
      usuario_id: usuarioId,
      meta_diaria_agendamentos: numeroSeguro(body.meta_diaria_agendamentos, 4, 0),
      meta_semanal_agendamentos: numeroSeguro(body.meta_semanal_agendamentos, 20, 0),
      meta_mensal_agendamentos: numeroSeguro(body.meta_mensal_agendamentos, 80, 0),
      meta_mensal_vendas: numeroSeguro(body.meta_mensal_vendas, 8, 0),
      comissao_por_venda: comissaoOpcional(body.comissao_por_venda),
      ativo: body.ativo !== false,
      atualizado_por: usuario.id,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("metas_colaboradores")
      .upsert(payload, { onConflict: "usuario_id" })
      .select("id, usuario_id, meta_diaria_agendamentos, meta_semanal_agendamentos, meta_mensal_agendamentos, meta_mensal_vendas, comissao_por_venda, ativo, atualizado_em")
      .single();

    if (error) {
      console.error("Erro ao salvar meta:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível salvar meta." }, { status: 500 });
    }

    await supabase
      .from("configuracoes_auditoria")
      .insert({
        usuario_id: usuario.id,
        acao: "atualizar_meta_colaborador",
        modulo: "metas",
        entidade: "metas_colaboradores",
        entidade_id: data.id,
        valor_novo: data,
      })
      .then(() => null);

    return NextResponse.json({ ok: true, meta: data });
  } catch (error) {
    console.error("Erro inesperado ao salvar meta:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao salvar meta." }, { status: 500 });
  }
}
