import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UsuarioInterno = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string | null;
};

type CampanhaPayload = {
  simulador_tipo?: string;
  id?: string;
  nome?: string;
  status?: string;
  link_oficial?: string;
  mostrar_link_oficial?: boolean;
  titulo_publico?: string;
  imagem_url?: string;
  resumo_operador?: string;
  regras_principais?: string;
  script_ligacao?: string;
  mensagem_whatsapp?: string;
  objecoes?: string;
  tem_simulador?: boolean;
  simulador_liberado?: boolean;
  link_simulador?: string;
  simulador_observacao?: string;
  data_inicio?: string;
  data_fim?: string;
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function slugify(valor: string) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function podeGerenciar(perfil?: string | null) {
  return ["adm", "admin", "supervisor", "gestor"].includes(
    texto(perfil).toLowerCase(),
  );
}

async function usuarioAtual() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      usuario: null as UsuarioInterno | null,
      erro: "Usuário não autenticado.",
    };
  }

  const { data: usuario, error } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (error || !usuario) {
    return {
      supabase,
      usuario: null as UsuarioInterno | null,
      erro: "Usuário interno não localizado.",
    };
  }

  return { supabase, usuario: usuario as UsuarioInterno, erro: "" };
}

export async function GET() {
  const { supabase, usuario, erro } = await usuarioAtual();

  if (!usuario) {
    return NextResponse.json({ ok: false, erro }, { status: 401 });
  }

  const gerencia = podeGerenciar(usuario.perfil);

  let query = supabase
    .from("campanhas_telemarketing")
    .select("*")
    .order("status", { ascending: true })
    .order("criado_em", { ascending: false });

  if (!gerencia) {
    query = query.neq("status", "arquivada");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, erro: error.message || "Erro ao carregar campanhas." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    usuario,
    pode_gerenciar: gerencia,
    campanhas: data || [],
  });
}

export async function POST(request: NextRequest) {
  const { supabase, usuario, erro } = await usuarioAtual();

  if (!usuario) {
    return NextResponse.json({ ok: false, erro }, { status: 401 });
  }

  if (!podeGerenciar(usuario.perfil)) {
    return NextResponse.json(
      { ok: false, erro: "Sem permissão para gerenciar campanhas." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as CampanhaPayload;
  const nome = texto(body.nome);

  if (!nome) {
    return NextResponse.json(
      { ok: false, erro: "Informe o nome da campanha." },
      { status: 400 },
    );
  }

  const tipoRecebido = texto(body.simulador_tipo);

  const simuladorTipo = ["copa_azul", "link_externo"].includes(tipoRecebido)
    ? tipoRecebido
    : body.tem_simulador === true
      ? "copa_azul"
      : "nenhum";

  const temSimulador = simuladorTipo !== "nenhum";

  const payload = {
    nome,
    slug: slugify(nome),
    status: texto(body.status) || "ativa",
    link_oficial: texto(body.link_oficial) || null,
    mostrar_link_oficial: body.mostrar_link_oficial !== false,
    titulo_publico: texto(body.titulo_publico) || null,
    imagem_url: texto(body.imagem_url) || null,
    resumo_operador: texto(body.resumo_operador) || null,
    regras_principais: texto(body.regras_principais) || null,
    script_ligacao: texto(body.script_ligacao) || null,
    mensagem_whatsapp: texto(body.mensagem_whatsapp) || null,
    objecoes: texto(body.objecoes) || null,
    tem_simulador: temSimulador,
    simulador_tipo: simuladorTipo,
    simulador_liberado: temSimulador && body.simulador_liberado === true,
    link_simulador: texto(body.link_simulador) || null,
    simulador_observacao: texto(body.simulador_observacao) || null,
    data_inicio: texto(body.data_inicio) || null,
    data_fim: texto(body.data_fim) || null,
    atualizado_por: usuario.id,
    atualizado_em: new Date().toISOString(),
  };

  if (body.id) {
    const { data, error } = await supabase
      .from("campanhas_telemarketing")
      .update(payload)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, erro: error.message || "Erro ao atualizar campanha." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, campanha: data });
  }

  const { data, error } = await supabase
    .from("campanhas_telemarketing")
    .insert({
      ...payload,
      criado_por: usuario.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, erro: error.message || "Erro ao criar campanha." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, campanha: data });
}
