import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PayloadHorario = {
  usuario_id?: string;
  status_tipo_chave?: string;
  titulo?: string;
  dias_semana?: number[];
  hora_inicio?: string;
  hora_fim?: string;
  ativo?: boolean;
  observacao?: string;
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

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PayloadHorario;
    const usuarioId = String(body.usuario_id || "").trim();
    const statusTipoChave = String(body.status_tipo_chave || "pausa_almoco").trim();
    const horaInicio = String(body.hora_inicio || "").trim();
    const horaFim = String(body.hora_fim || "").trim();

    if (!usuarioId || !horaInicio || !horaFim) {
      return NextResponse.json({ ok: false, erro: "Usuário e horário são obrigatórios." }, { status: 400 });
    }

    const { supabase, usuarioInterno, erro } = await getContexto();
    if (erro || !usuarioInterno) return erro;

    if (!isGestao(usuarioInterno.perfil)) {
      return NextResponse.json({ ok: false, erro: "Apenas gestão pode configurar horário de pausa." }, { status: 403 });
    }

    const { data: existente } = await supabase
      .from("usuario_horarios_pausa")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("status_tipo_chave", statusTipoChave)
      .eq("ativo", true)
      .maybeSingle();

    const payload = {
      usuario_id: usuarioId,
      status_tipo_chave: statusTipoChave,
      titulo: body.titulo || "Horário de pausa almoço",
      dias_semana: body.dias_semana && body.dias_semana.length > 0 ? body.dias_semana : [1, 2, 3, 4, 5, 6],
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      ativo: body.ativo ?? true,
      observacao: body.observacao || null,
      configurado_por: usuarioInterno.id,
      atualizado_em: new Date().toISOString(),
    };

    const query = existente?.id
      ? supabase.from("usuario_horarios_pausa").update(payload).eq("id", existente.id)
      : supabase.from("usuario_horarios_pausa").insert(payload);

    const { data, error } = await query
      .select("id, usuario_id, status_tipo_chave, titulo, dias_semana, hora_inicio, hora_fim, ativo, observacao")
      .single();

    if (error) {
      console.error("Erro ao salvar horário de pausa:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível salvar horário de pausa." }, { status: 500 });
    }

    await supabase.from("configuracoes_auditoria").insert({
      usuario_id: usuarioInterno.id,
      acao: "salvar_horario_pausa",
      modulo: "usuarios",
      entidade: "usuario_horarios_pausa",
      entidade_id: data.id,
      valor_novo: data,
    });

    return NextResponse.json({ ok: true, horario: data });
  } catch (error) {
    console.error("Erro inesperado ao salvar horário de pausa:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao salvar horário de pausa." }, { status: 500 });
  }
}
