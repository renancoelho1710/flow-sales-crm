import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/sistema/auditoria";

type UsuarioInterno = {
  id?: string;
  nome?: string;
  email?: string;
  perfil?: string;
  ativo?: boolean;
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function objeto(valor: unknown) {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    return valor as Record<string, unknown>;
  }

  return {};
}

function podeGerenciar(usuario: UsuarioInterno | null, email?: string | null) {
  const perfil = String(usuario?.perfil || "").toLowerCase();

  return (
    ["adm", "admin", "suporte", "gestor", "gerente"].includes(perfil) ||
    String(email || "").toLowerCase() === "renan@azulveiculos.com.br"
  );
}

async function buscarUsuarioAtual(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, interno: null };
  }

  let interno: UsuarioInterno | null = null;

  if (user.id) {
    const { data } = await supabase
      .from("usuarios_internos")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    interno = data || null;
  }

  if (!interno && user.email) {
    const { data } = await supabase
      .from("usuarios_internos")
      .select("*")
      .ilike("email", user.email)
      .maybeSingle();

    interno = data || null;
  }

  return { user, interno };
}

function montarPayload(body: any, usuarioId?: string | null) {
  const nome = texto(body.nome);
  const tipo = texto(body.tipo);
  const provedor = texto(body.provedor || nome)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (!nome) throw new Error("Informe o nome da integração.");
  if (!tipo) throw new Error("Informe o tipo da integração.");
  if (!provedor) throw new Error("Informe o provedor da integração.");

  return {
    nome,
    tipo,
    provedor,
    ambiente: texto(body.ambiente) || "producao",
    ativo: Boolean(body.ativo),
    principal: Boolean(body.principal),
    base_url: texto(body.base_url) || null,
    metodo_auth: texto(body.metodo_auth) || "bearer_env",
    token_ref: texto(body.token_ref) || null,
    intervalo_minutos: Number(body.intervalo_minutos || 15),
    headers: objeto(body.headers),
    configuracoes: objeto(body.configuracoes),
    mapeamento: objeto(body.mapeamento),
    atualizado_por: usuarioId || null,
    atualizado_em: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, interno } = await buscarUsuarioAtual(supabase);

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    if (!podeGerenciar(interno, user.email)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para ver integrações." },
        { status: 403 },
      );
    }

    const params = request.nextUrl.searchParams;
    const busca = texto(params.get("busca"));
    const tipo = texto(params.get("tipo"));
    const ativo = texto(params.get("ativo"));

    let query = supabase
      .from("integracoes_provedores")
      .select("*")
      .order("tipo", { ascending: true })
      .order("principal", { ascending: false })
      .order("nome", { ascending: true });

    if (tipo) query = query.eq("tipo", tipo);
    if (ativo === "true") query = query.eq("ativo", true);
    if (ativo === "false") query = query.eq("ativo", false);

    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,tipo.ilike.%${busca}%,provedor.ilike.%${busca}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      provedores: data || [],
      usuario: {
        id: interno?.id || user.id,
        nome: interno?.nome || user.email,
        email: interno?.email || user.email,
        perfil: interno?.perfil || "usuario",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao carregar integrações.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, interno } = await buscarUsuarioAtual(supabase);

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    if (!podeGerenciar(interno, user.email)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para criar integrações." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const payload = montarPayload(body, interno?.id || user.id);

    if (payload.principal) {
      await supabase
        .from("integracoes_provedores")
        .update({ principal: false, atualizado_em: new Date().toISOString() })
        .eq("tipo", payload.tipo);
    }

    const { data, error } = await supabase
      .from("integracoes_provedores")
      .insert({
        ...payload,
        criado_por: interno?.id || user.id,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await registrarAuditoria({
      modulo: "integracoes",
      acao: "criar_provedor",
      entidade: "integracoes_provedores",
      entidade_id: data.id,
      usuario_id: interno?.id || user.id,
      usuario_nome: interno?.nome || user.email,
      usuario_email: interno?.email || user.email,
      descricao: `Criou integração ${data.nome}.`,
      depois: data,
      metadata: {
        tipo: data.tipo,
        provedor: data.provedor,
      },
    });

    return NextResponse.json({ ok: true, provedor: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error ? error.message : "Erro ao criar integração.",
      },
      { status: 500 },
    );
  }
}
