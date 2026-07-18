import { NextRequest, NextResponse } from "next/server";
import { registrarAuditoria } from "@/lib/sistema/auditoria";
import { createClient } from "@/lib/supabase/server";

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function podeValidar(perfil?: string | null) {
  return [
    "adm",
    "admin",
    "suporte",
    "gerente",
    "supervisor",
    "gestor",
  ].includes(String(perfil || "").toLowerCase());
}

async function usuarioInterno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
) {
  const { data: porAuth } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (porAuth) return porAuth;

  if (user.email) {
    const { data: porEmail } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil")
      .ilike("email", user.email)
      .eq("ativo", true)
      .maybeSingle();

    if (porEmail) return porEmail;
  }

  if (String(user.email || "").toLowerCase() === "renan@azulveiculos.com.br") {
    return {
      id: user.id,
      nome: "Renan",
      email: user.email || "",
      perfil: "adm",
    };
  }

  return null;
}

async function buscarVendaAntes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  const { data, error } = await supabase
    .from("vendas_acompanhamento")
    .select(
      [
        "id",
        "placa",
        "cliente",
        "veiculo",
        "operador_id",
        "operador_nome",
        "operador_email",
        "agendamento_id",
        "lead_id",
        "validacao_status",
        "elegivel_comissao",
        "motivo_recusa",
        "validado_por",
        "validado_em",
      ].join(","),
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const acao = texto(body.acao);

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Não autenticado." },
        { status: 401 },
      );
    }

    const usuario = await usuarioInterno(supabase, user);

    if (!usuario || !podeValidar(usuario.perfil)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para validar venda." },
        { status: 403 },
      );
    }

    const usuarioNome =
      usuario.nome || usuario.email || "Usuário não identificado";
    const usuarioEmail = usuario.email || user.email || null;

    if (acao === "vincular_agendamento") {
      const agendamentoId = texto(body.agendamento_id);

      if (!agendamentoId) {
        return NextResponse.json(
          { ok: false, erro: "Informe o agendamento." },
          { status: 400 },
        );
      }

      const vendaAntes = await buscarVendaAntes(supabase, id);

      const { data: agendamento, error: erroAgendamento } = await supabase
        .from("lead_agendamentos")
        .select(
          "id, lead_id, atendente_resgate_id, atendente_resgate_nome, vendedor_email",
        )
        .eq("id", agendamentoId)
        .maybeSingle();

      if (erroAgendamento) throw new Error(erroAgendamento.message);

      if (!agendamento) {
        return NextResponse.json(
          { ok: false, erro: "Agendamento não encontrado." },
          { status: 404 },
        );
      }

      let operadorId = agendamento.atendente_resgate_id || null;
      let operadorNome = agendamento.atendente_resgate_nome || null;
      let operadorEmail = null;

      if ((!operadorId || !operadorNome) && agendamento.lead_id) {
        const { data: lead } = await supabase
          .from("leads")
          .select("atendente_resgate_id, atendente_resgate_nome")
          .eq("id", agendamento.lead_id)
          .maybeSingle();

        operadorId = operadorId || lead?.atendente_resgate_id || null;
        operadorNome = operadorNome || lead?.atendente_resgate_nome || null;
      }

      if (operadorId) {
        const { data: operador } = await supabase
          .from("usuarios_internos")
          .select("email")
          .eq("id", operadorId)
          .maybeSingle();

        operadorEmail = operador?.email || null;
      }

      const agora = new Date().toISOString();

      const { data: vendaAtualizada, error: erroUpdate } = await supabase
        .from("vendas_acompanhamento")
        .update({
          agendamento_id: agendamento.id,
          lead_id: agendamento.lead_id,
          operador_id: operadorId,
          operador_nome: operadorNome,
          operador_email: operadorEmail,
          validacao_status: "pendente",
          elegivel_comissao: false,
          motivo_recusa: null,
          atualizado_por: usuario.id,
          atualizado_em: agora,
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (erroUpdate) throw new Error(erroUpdate.message);

      await registrarAuditoria({
        modulo: "vendas_resgate",
        acao: "vincular_agendamento_resgate",
        entidade: "vendas_acompanhamento",
        entidade_id: vendaAtualizada?.id || id,
        usuario_id: usuario.id,
        usuario_nome: usuarioNome,
        usuario_email: usuarioEmail,
        descricao: `Vinculou agendamento à venda ${vendaAtualizada?.placa || vendaAntes?.placa || id}.`,
        antes: vendaAntes,
        depois: vendaAtualizada,
        metadata: {
          placa: vendaAtualizada?.placa || vendaAntes?.placa || null,
          agendamento_id: agendamento.id,
          lead_id: agendamento.lead_id,
          operador_id: operadorId,
          operador_nome: operadorNome,
          operador_email: operadorEmail,
        },
      });

      return NextResponse.json({
        ok: true,
        venda: vendaAtualizada,
      });
    }

    if (acao === "validar") {
      const vendaAntes = await buscarVendaAntes(supabase, id);
      const agora = new Date().toISOString();

      const { data: vendaAtualizada, error } = await supabase
        .from("vendas_acompanhamento")
        .update({
          validacao_status: "validado",
          elegivel_comissao: true,
          validado_por: usuario.id,
          validado_em: agora,
          motivo_recusa: null,
          atualizado_por: usuario.id,
          atualizado_em: agora,
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (vendaAtualizada?.lead_id) {
        await supabase
          .from("leads")
          .update({
            venda_pendente_validacao: false,
            venda_validada: true,
            venda_validada_por: usuario.id,
            venda_validada_em: agora,
            atualizado_em: agora,
          })
          .eq("id", vendaAtualizada.lead_id);
      }

      if (vendaAtualizada?.agendamento_id) {
        await supabase
          .from("lead_agendamentos")
          .update({
            comissao_resgate_status: "validado",
            atualizado_em: agora,
          })
          .eq("id", vendaAtualizada.agendamento_id);
      }

      await registrarAuditoria({
        modulo: "vendas_resgate",
        acao: "confirmar_venda_operador",
        entidade: "vendas_acompanhamento",
        entidade_id: vendaAtualizada?.id || id,
        usuario_id: usuario.id,
        usuario_nome: usuarioNome,
        usuario_email: usuarioEmail,
        descricao: `Confirmou venda para operador ${vendaAtualizada?.placa || vendaAntes?.placa || id}.`,
        antes: vendaAntes,
        depois: vendaAtualizada,
        metadata: {
          placa: vendaAtualizada?.placa || vendaAntes?.placa || null,
          operador_id: vendaAtualizada?.operador_id || null,
          operador_nome: vendaAtualizada?.operador_nome || null,
          lead_id: vendaAtualizada?.lead_id || null,
          agendamento_id: vendaAtualizada?.agendamento_id || null,
        },
      });

      return NextResponse.json({
        ok: true,
        venda: vendaAtualizada,
      });
    }

    if (acao === "recusar") {
      const motivo = texto(body.motivo_recusa);

      if (!motivo) {
        return NextResponse.json(
          { ok: false, erro: "Informe o motivo da recusa." },
          { status: 400 },
        );
      }

      const vendaAntes = await buscarVendaAntes(supabase, id);
      const agora = new Date().toISOString();

      const { data: vendaAtualizada, error } = await supabase
        .from("vendas_acompanhamento")
        .update({
          validacao_status: "recusado",
          elegivel_comissao: false,
          validado_por: usuario.id,
          validado_em: agora,
          motivo_recusa: motivo,
          atualizado_por: usuario.id,
          atualizado_em: agora,
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (vendaAtualizada?.lead_id) {
        await supabase
          .from("leads")
          .update({
            venda_pendente_validacao: false,
            venda_validada: false,
            venda_validada_por: usuario.id,
            venda_validada_em: agora,
            atualizado_em: agora,
          })
          .eq("id", vendaAtualizada.lead_id);
      }

      if (vendaAtualizada?.agendamento_id) {
        await supabase
          .from("lead_agendamentos")
          .update({
            comissao_resgate_status: "recusado",
            atualizado_em: agora,
          })
          .eq("id", vendaAtualizada.agendamento_id);
      }

      await registrarAuditoria({
        modulo: "vendas_resgate",
        acao: "recusar_vinculo_resgate",
        entidade: "vendas_acompanhamento",
        entidade_id: vendaAtualizada?.id || id,
        usuario_id: usuario.id,
        usuario_nome: usuarioNome,
        usuario_email: usuarioEmail,
        descricao: `Recusou vínculo do resgate na venda ${vendaAtualizada?.placa || vendaAntes?.placa || id}.`,
        antes: vendaAntes,
        depois: vendaAtualizada,
        metadata: {
          placa: vendaAtualizada?.placa || vendaAntes?.placa || null,
          motivo,
          operador_id: vendaAtualizada?.operador_id || null,
          operador_nome: vendaAtualizada?.operador_nome || null,
          lead_id: vendaAtualizada?.lead_id || null,
          agendamento_id: vendaAtualizada?.agendamento_id || null,
        },
      });

      return NextResponse.json({
        ok: true,
        venda: vendaAtualizada,
      });
    }

    return NextResponse.json(
      { ok: false, erro: "Ação inválida." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro: error instanceof Error ? error.message : "Erro ao validar venda.",
      },
      { status: 500 },
    );
  }
}
