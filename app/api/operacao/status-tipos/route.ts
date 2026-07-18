import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StatusTipoPayload = {
  id?: string;
  chave?: string;
  nome?: string;
  descricao?: string | null;
  categoria?: string;
  ativo?: boolean;
  bloqueia_recebimento_leads?: boolean;
  conta_como_pausa?: boolean;
  exige_motivo?: boolean;
  exige_senha_supervisor?: boolean;
  permite_operador_aplicar?: boolean;
  permite_supervisor_aplicar?: boolean;
  permite_aplicacao_em_massa?: boolean;
  aplicacao_automatica?: boolean;
  retorno_automatico?: boolean;
  tempo_maximo_minutos?: number | null;
  gera_popup?: boolean;
  titulo_popup?: string | null;
  mensagem_popup?: string | null;
};

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function isAdmOuSuporte(perfil?: string | null) {
  return ["adm", "admin", "suporte"].includes(normalizarPerfil(perfil));
}

function slug(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function getContexto() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      usuarioInterno: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 }),
    };
  }

  const { data: usuarioInterno, error } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (error || !usuarioInterno) {
    return {
      supabase,
      usuarioInterno: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado ou inativo." }, { status: 403 }),
    };
  }

  return { supabase, usuarioInterno, erro: null };
}

function normalizarPayload(body: StatusTipoPayload) {
  const nome = String(body.nome || "").trim();
  const chave = String(body.chave || slug(nome)).trim();

  if (!nome) throw new Error("Nome do status/pausa não informado.");
  if (!chave) throw new Error("Chave do status/pausa não informada.");

  const categoria = String(body.categoria || "operacional").trim().toLowerCase();
  const categoriasPermitidas = ["operacional", "pausa", "administrativo", "automatico"];

  return {
    chave,
    nome,
    descricao: body.descricao || null,
    categoria: categoriasPermitidas.includes(categoria) ? categoria : "operacional",
    ativo: Boolean(body.ativo ?? true),
    bloqueia_recebimento_leads: Boolean(body.bloqueia_recebimento_leads),
    conta_como_pausa: Boolean(body.conta_como_pausa),
    exige_motivo: Boolean(body.exige_motivo),
    exige_senha_supervisor: Boolean(body.exige_senha_supervisor),
    permite_operador_aplicar: Boolean(body.permite_operador_aplicar),
    permite_supervisor_aplicar: Boolean(body.permite_supervisor_aplicar ?? true),
    permite_aplicacao_em_massa: Boolean(body.permite_aplicacao_em_massa),
    aplicacao_automatica: Boolean(body.aplicacao_automatica),
    retorno_automatico: Boolean(body.retorno_automatico),
    tempo_maximo_minutos:
      body.tempo_maximo_minutos === null || body.tempo_maximo_minutos === undefined || Number.isNaN(Number(body.tempo_maximo_minutos))
        ? null
        : Number(body.tempo_maximo_minutos),
    gera_popup: Boolean(body.gera_popup ?? true),
    titulo_popup: body.titulo_popup || null,
    mensagem_popup: body.mensagem_popup || null,
    atualizado_em: new Date().toISOString(),
  };
}

async function registrarAuditoria({
  supabase,
  usuarioId,
  acao,
  entidadeId,
  valorAnterior,
  valorNovo,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  usuarioId: string;
  acao: string;
  entidadeId?: string | null;
  valorAnterior?: Record<string, unknown> | null;
  valorNovo?: Record<string, unknown> | null;
}) {
  await supabase.from("configuracoes_auditoria").insert({
    usuario_id: usuarioId,
    acao,
    modulo: "operacao_pausas",
    entidade: "operacao_status_tipos",
    entidade_id: entidadeId || null,
    valor_anterior: valorAnterior || null,
    valor_novo: valorNovo || null,
  });
}

export async function GET() {
  try {
    const { supabase, usuarioInterno, erro } = await getContexto();
    if (erro || !usuarioInterno) return erro;

    const { data, error } = await supabase
      .from("operacao_status_tipos")
      .select("*")
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao buscar tipos de status:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível carregar status e pausas." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      usuario: usuarioInterno,
      permissoes: {
        pode_editar: isAdmOuSuporte(usuarioInterno.perfil),
      },
      status_tipos: data || [],
    });
  } catch (error) {
    console.error("Erro inesperado em status-tipos GET:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao carregar status e pausas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, usuarioInterno, erro } = await getContexto();
    if (erro || !usuarioInterno) return erro;

    if (!isAdmOuSuporte(usuarioInterno.perfil)) {
      return NextResponse.json({ ok: false, erro: "Apenas ADM/Suporte pode criar regra de status/pausa." }, { status: 403 });
    }

    const body = (await request.json()) as StatusTipoPayload;
    const payload = normalizarPayload(body);

    const { data, error } = await supabase
      .from("operacao_status_tipos")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao criar status/pausa:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível criar status/pausa." }, { status: 500 });
    }

    await registrarAuditoria({
      supabase,
      usuarioId: usuarioInterno.id,
      acao: "criar_status_pausa",
      entidadeId: data.id,
      valorNovo: data,
    });

    return NextResponse.json({ ok: true, status_tipo: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, erro: error instanceof Error ? error.message : "Erro inesperado ao criar status/pausa." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, usuarioInterno, erro } = await getContexto();
    if (erro || !usuarioInterno) return erro;

    if (!isAdmOuSuporte(usuarioInterno.perfil)) {
      return NextResponse.json({ ok: false, erro: "Apenas ADM/Suporte pode alterar regra de status/pausa." }, { status: 403 });
    }

    const body = (await request.json()) as StatusTipoPayload;
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, erro: "ID do status/pausa não informado." }, { status: 400 });
    }

    const { data: anterior } = await supabase
      .from("operacao_status_tipos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const payload = normalizarPayload(body);

    const { data, error } = await supabase
      .from("operacao_status_tipos")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao salvar status/pausa:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível salvar status/pausa." }, { status: 500 });
    }

    await registrarAuditoria({
      supabase,
      usuarioId: usuarioInterno.id,
      acao: "editar_status_pausa",
      entidadeId: data.id,
      valorAnterior: anterior,
      valorNovo: data,
    });

    return NextResponse.json({ ok: true, status_tipo: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, erro: error instanceof Error ? error.message : "Erro inesperado ao salvar status/pausa." },
      { status: 500 }
    );
  }
}
