import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PayloadPermissao = {
  usuario_id?: string;
  modulo_chave?: string;
  permitido?: boolean;
};

const MODULOS = [
  { chave: "dashboard", nome: "Dashboard", descricao: "Acesso à visão geral do CRM." },
  { chave: "crm_leads", nome: "CRM de leads", descricao: "Acesso aos leads, tarefas e histórico comercial." },
  { chave: "kanban", nome: "Kanban", descricao: "Acesso ao funil comercial e oportunidades." },
  { chave: "agenda", nome: "Agenda", descricao: "Acesso aos agendamentos, visitas e retornos." },
  { chave: "controle_3cx", nome: "Controle 3CX", descricao: "Acesso aos módulos de ligação e monitoramento 3CX." },
  { chave: "campanhas", nome: "Campanhas", descricao: "Acesso às campanhas e mensagens comerciais." },
  { chave: "simulador", nome: "Simulador", descricao: "Acesso à simulação/consulta comercial." },
  { chave: "conferencia", nome: "Conferência", descricao: "Acesso à conferência de veículos." },
  { chave: "relatorios", nome: "Relatórios", descricao: "Acesso aos relatórios e indicadores." },
  { chave: "usuarios", nome: "Usuários", descricao: "Acesso à gestão de usuários, perfis e status." },
  { chave: "configuracoes", nome: "Configurações", descricao: "Acesso às regras e configurações do sistema." },
];

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function isGestao(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente", "supervisor"].includes(normalizarPerfil(perfil));
}

function podeEditarPermissoes(perfil?: string | null) {
  return ["adm", "admin", "suporte"].includes(normalizarPerfil(perfil));
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

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuarioInterno) {
    return {
      supabase,
      usuarioInterno: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado ou inativo." }, { status: 403 }),
    };
  }

  return { supabase, usuarioInterno, erro: null };
}

export async function GET() {
  try {
    const { supabase, usuarioInterno, erro } = await getContexto();
    if (erro || !usuarioInterno) return erro;

    if (!isGestao(usuarioInterno.perfil)) {
      return NextResponse.json({ ok: false, erro: "Você não tem permissão para acessar permissões." }, { status: 403 });
    }

    const [usuarios, permissoes] = await Promise.all([
      supabase
        .from("usuarios_internos")
        .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo")
        .order("nome", { ascending: true }),
      supabase
        .from("usuario_permissoes")
        .select("id, usuario_id, modulo_chave, permitido, atualizado_em")
        .order("modulo_chave", { ascending: true }),
    ]);

    if (usuarios.error) {
      console.error("Erro ao buscar usuários:", usuarios.error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar usuários." }, { status: 500 });
    }

    if (permissoes.error) {
      console.error("Erro ao buscar permissões:", permissoes.error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar permissões." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      usuario: usuarioInterno,
      pode_editar: podeEditarPermissoes(usuarioInterno.perfil),
      modulos: MODULOS,
      usuarios: usuarios.data || [],
      permissoes: permissoes.data || [],
    });
  } catch (error) {
    console.error("Erro inesperado em permissões:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao carregar permissões." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PayloadPermissao;
    const usuarioId = String(body.usuario_id || "").trim();
    const moduloChave = String(body.modulo_chave || "").trim();
    const permitido = Boolean(body.permitido);

    if (!usuarioId || !moduloChave) {
      return NextResponse.json({ ok: false, erro: "Usuário ou módulo não informado." }, { status: 400 });
    }

    if (!MODULOS.some((modulo) => modulo.chave === moduloChave)) {
      return NextResponse.json({ ok: false, erro: "Módulo inválido." }, { status: 400 });
    }

    const { supabase, usuarioInterno, erro } = await getContexto();
    if (erro || !usuarioInterno) return erro;

    if (!podeEditarPermissoes(usuarioInterno.perfil)) {
      return NextResponse.json({ ok: false, erro: "Apenas ADM/Suporte pode alterar permissões." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("usuario_permissoes")
      .upsert(
        {
          usuario_id: usuarioId,
          modulo_chave: moduloChave,
          permitido,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "usuario_id,modulo_chave" }
      )
      .select("id, usuario_id, modulo_chave, permitido, atualizado_em")
      .single();

    if (error) {
      console.error("Erro ao salvar permissão:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível salvar permissão." }, { status: 500 });
    }

    await supabase.from("configuracoes_auditoria").insert({
      usuario_id: usuarioInterno.id,
      acao: "alterar_permissao_usuario",
      modulo: "usuarios",
      entidade: "usuario_permissoes",
      entidade_id: data.id,
      valor_novo: data,
    });

    return NextResponse.json({ ok: true, permissao: data });
  } catch (error) {
    console.error("Erro inesperado ao salvar permissão:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao salvar permissão." }, { status: 500 });
  }
}
