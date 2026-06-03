import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PayloadStatus = {
  usuario_ids?: string[];
  usuario_id?: string;
  status_chave?: string;
  motivo?: string;
  origem?: string;
  recebe_leads?: boolean;
};

type UsuarioInterno = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  recebe_leads: boolean;
  status_operacional: string;
  status_administrativo: string;
};

type StatusTipo = {
  chave: string;
  nome: string;
  categoria: string;
  bloqueia_recebimento_leads: boolean;
  exige_motivo: boolean;
  permite_operador_aplicar: boolean;
  permite_supervisor_aplicar: boolean;
  permite_aplicacao_em_massa: boolean;
};

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function isGestao(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente", "supervisor"].includes(normalizarPerfil(perfil));
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

    const gestor = isGestao(usuarioInterno.perfil);

    const usuariosQuery = supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo, status_operacional_atualizado_em, status_administrativo_motivo, status_administrativo_inicio, status_administrativo_fim")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (!gestor) {
      usuariosQuery.eq("id", usuarioInterno.id);
    }

    const [usuarios, statusTipos, horarios, logs] = await Promise.all([
      usuariosQuery,
      supabase
        .from("operacao_status_tipos")
        .select("id, chave, nome, descricao, categoria, ativo, bloqueia_recebimento_leads, conta_como_pausa, exige_motivo, exige_senha_supervisor, permite_operador_aplicar, permite_supervisor_aplicar, permite_aplicacao_em_massa, aplicacao_automatica, retorno_automatico, tempo_maximo_minutos, gera_popup, titulo_popup, mensagem_popup")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("usuario_horarios_pausa")
        .select("id, usuario_id, status_tipo_chave, titulo, dias_semana, hora_inicio, hora_fim, ativo, observacao")
        .eq("ativo", true),
      supabase
        .from("usuario_status_logs")
        .select("id, usuario_id, status_anterior, status_novo, origem, motivo, aplicado_por, bloqueou_recebimento_leads, recebe_leads_anterior, recebe_leads_novo, inicio_em, fim_em, criado_em")
        .order("criado_em", { ascending: false })
        .limit(80),
    ]);

    if (usuarios.error) {
      console.error("Erro ao buscar usuários/status:", usuarios.error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar usuários." }, { status: 500 });
    }

    if (statusTipos.error) {
      console.error("Erro ao buscar tipos de status:", statusTipos.error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar tipos de status." }, { status: 500 });
    }

    if (horarios.error) {
      console.error("Erro ao buscar horários de pausa:", horarios.error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar horários de pausa." }, { status: 500 });
    }

    if (logs.error) {
      console.error("Erro ao buscar logs de status:", logs.error);
      return NextResponse.json({ ok: false, erro: "Não foi possível buscar logs de status." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      usuario: usuarioInterno,
      pode_gerenciar_status: gestor,
      usuarios: usuarios.data || [],
      status_tipos: statusTipos.data || [],
      horarios: horarios.data || [],
      logs: logs.data || [],
    });
  } catch (error) {
    console.error("Erro inesperado em status da equipe:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao carregar status da equipe." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PayloadStatus;
    const usuarioIds = Array.from(new Set([...(body.usuario_ids || []), body.usuario_id || ""].filter(Boolean)));
    const statusChave = String(body.status_chave || "").trim();
    const motivo = String(body.motivo || "").trim();
    const origem = String(body.origem || "manual").trim() || "manual";

    if (usuarioIds.length === 0 || !statusChave) {
      return NextResponse.json({ ok: false, erro: "Usuário ou status não informado." }, { status: 400 });
    }

    const { supabase, usuarioInterno, erro } = await getContexto();
    if (erro || !usuarioInterno) return erro;

    const gestor = isGestao(usuarioInterno.perfil);

    const { data: statusTipo, error: statusError } = await supabase
      .from("operacao_status_tipos")
      .select("chave, nome, categoria, bloqueia_recebimento_leads, exige_motivo, permite_operador_aplicar, permite_supervisor_aplicar, permite_aplicacao_em_massa")
      .eq("chave", statusChave)
      .eq("ativo", true)
      .single<StatusTipo>();

    if (statusError || !statusTipo) {
      return NextResponse.json({ ok: false, erro: "Status inválido ou inativo." }, { status: 400 });
    }

    const tentandoMassa = usuarioIds.length > 1;

    if (tentandoMassa && (!gestor || !statusTipo.permite_aplicacao_em_massa)) {
      return NextResponse.json({ ok: false, erro: "Este status não permite aplicação em massa." }, { status: 403 });
    }

    if (statusTipo.exige_motivo && !motivo) {
      return NextResponse.json({ ok: false, erro: "Este status exige motivo." }, { status: 400 });
    }

    const alterandoOutro = usuarioIds.some((id) => id !== usuarioInterno.id);

    if (alterandoOutro && (!gestor || !statusTipo.permite_supervisor_aplicar)) {
      return NextResponse.json({ ok: false, erro: "Você não pode alterar status de outro usuário." }, { status: 403 });
    }

    if (!alterandoOutro && !gestor && !statusTipo.permite_operador_aplicar) {
      return NextResponse.json({ ok: false, erro: "Este status não pode ser aplicado pelo operador." }, { status: 403 });
    }

    const { data: usuarios, error: usuariosError } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo")
      .in("id", usuarioIds)
      .eq("ativo", true)
      .returns<UsuarioInterno[]>();

    if (usuariosError || !usuarios || usuarios.length === 0) {
      console.error("Erro ao buscar usuários alvo:", usuariosError);
      return NextResponse.json({ ok: false, erro: "Usuários alvo não encontrados." }, { status: 404 });
    }

    const resultados = [];

    for (const usuario of usuarios) {
      const statusAnterior = statusTipo.categoria === "administrativo" ? usuario.status_administrativo : usuario.status_operacional;
      const bloqueiaLeads = Boolean(statusTipo.bloqueia_recebimento_leads);
      const recebeLeadsNovo = bloqueiaLeads ? false : Boolean(body.recebe_leads ?? usuario.recebe_leads);

      const atualizacao: Record<string, string | boolean | null> = {
        recebe_leads: recebeLeadsNovo,
        atualizado_em: new Date().toISOString(),
      };

      if (statusTipo.categoria === "administrativo") {
        atualizacao.status_administrativo = statusChave;
        atualizacao.status_administrativo_motivo = motivo || null;
        atualizacao.status_administrativo_inicio = new Date().toISOString();
      } else {
        atualizacao.status_operacional = statusChave;
        atualizacao.status_operacional_atualizado_em = new Date().toISOString();
      }

      const { data: atualizado, error: updateError } = await supabase
        .from("usuarios_internos")
        .update(atualizacao)
        .eq("id", usuario.id)
        .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo, status_operacional_atualizado_em")
        .single();

      if (updateError) {
        console.error("Erro ao atualizar status:", updateError);
        return NextResponse.json({ ok: false, erro: `Não foi possível atualizar ${usuario.nome}.` }, { status: 500 });
      }

      await supabase.from("usuario_status_logs").insert({
        usuario_id: usuario.id,
        status_anterior: statusAnterior,
        status_novo: statusChave,
        origem,
        motivo: motivo || null,
        aplicado_por: usuarioInterno.id,
        bloqueou_recebimento_leads: bloqueiaLeads,
        recebe_leads_anterior: usuario.recebe_leads,
        recebe_leads_novo: recebeLeadsNovo,
      });

      resultados.push(atualizado);
    }

    return NextResponse.json({ ok: true, usuarios: resultados });
  } catch (error) {
    console.error("Erro inesperado ao aplicar status:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao aplicar status." }, { status: 500 });
  }
}
