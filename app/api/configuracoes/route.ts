import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Escopo = "global" | "perfil" | "usuario";

type PayloadSalvar = {
  escopo?: Escopo;
  chave?: string;
  valor?: Record<string, any>;
  perfil?: string;
  usuario_id?: string;
  descricao?: string;
};

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function isAdmOuSuporte(perfil?: string | null) {
  return ["adm", "admin", "suporte"].includes(normalizarPerfil(perfil));
}

function isSupervisorOuGerente(perfil?: string | null) {
  return ["supervisor", "gerente"].includes(normalizarPerfil(perfil));
}

function podeAlterarEscopo(perfil: string, escopo: Escopo, usuarioAlvo?: string | null, usuarioLogado?: string | null) {
  if (isAdmOuSuporte(perfil)) return true;

  if (isSupervisorOuGerente(perfil)) {
    return escopo === "perfil" || escopo === "usuario";
  }

  if (escopo === "usuario" && usuarioAlvo && usuarioLogado && usuarioAlvo === usuarioLogado) {
    return true;
  }

  return false;
}

async function getUsuarioInterno() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      usuarioInterno: null,
      erro: NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 }
      ),
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
      user,
      usuarioInterno: null,
      erro: NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado ou inativo." },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    user,
    usuarioInterno,
    erro: null,
  };
}

export async function GET() {
  try {
    const { supabase, usuarioInterno, erro } = await getUsuarioInterno();

    if (erro || !usuarioInterno) return erro;

    const [
      configuracoesSistema,
      configuracoesPerfil,
      configuracoesUsuario,
    ] = await Promise.all([
      supabase
        .from("configuracoes_sistema")
        .select("id, chave, valor, descricao, escopo, criado_em, atualizado_em")
        .order("chave", { ascending: true }),

      supabase
        .from("configuracoes_perfil")
        .select("id, perfil, chave, valor, criado_em, atualizado_em")
        .or(`perfil.eq.${usuarioInterno.perfil},perfil.eq.${normalizarPerfil(usuarioInterno.perfil)}`)
        .order("chave", { ascending: true }),

      supabase
        .from("configuracoes_usuario")
        .select("id, usuario_id, chave, valor, criado_em, atualizado_em")
        .eq("usuario_id", usuarioInterno.id)
        .order("chave", { ascending: true }),
    ]);

    if (configuracoesSistema.error) {
      console.error("Erro ao buscar configurações do sistema:", configuracoesSistema.error);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível buscar configurações do sistema." },
        { status: 500 }
      );
    }

    if (configuracoesPerfil.error) {
      console.error("Erro ao buscar configurações por perfil:", configuracoesPerfil.error);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível buscar configurações por perfil." },
        { status: 500 }
      );
    }

    if (configuracoesUsuario.error) {
      console.error("Erro ao buscar configurações do usuário:", configuracoesUsuario.error);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível buscar configurações do usuário." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      usuario: usuarioInterno,
      permissoes: {
        pode_editar_global: isAdmOuSuporte(usuarioInterno.perfil),
        pode_editar_perfil: isAdmOuSuporte(usuarioInterno.perfil) || isSupervisorOuGerente(usuarioInterno.perfil),
        pode_editar_usuario: true,
      },
      configuracoes: {
        sistema: configuracoesSistema.data || [],
        perfil: configuracoesPerfil.data || [],
        usuario: configuracoesUsuario.data || [],
      },
    });
  } catch (error) {
    console.error("Erro inesperado ao buscar configurações:", error);

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao buscar configurações." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PayloadSalvar;
    const escopo = body.escopo || "usuario";
    const chave = String(body.chave || "").trim();
    const valor = body.valor || {};

    if (!["global", "perfil", "usuario"].includes(escopo)) {
      return NextResponse.json(
        { ok: false, erro: "Escopo inválido." },
        { status: 400 }
      );
    }

    if (!chave) {
      return NextResponse.json(
        { ok: false, erro: "Chave da configuração não informada." },
        { status: 400 }
      );
    }

    const { supabase, usuarioInterno, erro } = await getUsuarioInterno();

    if (erro || !usuarioInterno) return erro;

    const usuarioAlvo = body.usuario_id || usuarioInterno.id;

    if (!podeAlterarEscopo(usuarioInterno.perfil, escopo, usuarioAlvo, usuarioInterno.id)) {
      return NextResponse.json(
        { ok: false, erro: "Você não tem permissão para alterar esta configuração." },
        { status: 403 }
      );
    }

    if (escopo === "global") {
      const { data, error } = await supabase
        .from("configuracoes_sistema")
        .upsert(
          {
            chave,
            valor,
            descricao: body.descricao || null,
            escopo: "global",
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "chave" }
        )
        .select("id, chave, valor, descricao, escopo, atualizado_em")
        .single();

      if (error) {
        console.error("Erro ao salvar configuração global:", error);

        return NextResponse.json(
          { ok: false, erro: "Não foi possível salvar configuração global." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        configuracao: data,
      });
    }

    if (escopo === "perfil") {
      const perfilAlvo = normalizarPerfil(body.perfil || usuarioInterno.perfil);

      if (!perfilAlvo) {
        return NextResponse.json(
          { ok: false, erro: "Perfil não informado." },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("configuracoes_perfil")
        .upsert(
          {
            perfil: perfilAlvo,
            chave,
            valor,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "perfil,chave" }
        )
        .select("id, perfil, chave, valor, atualizado_em")
        .single();

      if (error) {
        console.error("Erro ao salvar configuração por perfil:", error);

        return NextResponse.json(
          { ok: false, erro: "Não foi possível salvar configuração por perfil." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        configuracao: data,
      });
    }

    const { data, error } = await supabase
      .from("configuracoes_usuario")
      .upsert(
        {
          usuario_id: usuarioAlvo,
          chave,
          valor,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "usuario_id,chave" }
      )
      .select("id, usuario_id, chave, valor, atualizado_em")
      .single();

    if (error) {
      console.error("Erro ao salvar configuração do usuário:", error);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível salvar configuração do usuário." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      configuracao: data,
    });
  } catch (error) {
    console.error("Erro inesperado ao salvar configurações:", error);

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao salvar configurações." },
      { status: 500 }
    );
  }
}
