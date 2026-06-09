import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registrarHistoricoC2S } from "@/lib/c2s/sincronizacao";

type Payload = {
  lead_id?: string;
  etapa_destino?: string;
  observacao?: string;
  data_proxima_acao?: string;
  funil_id?: string;
};

function texto(valor?: string | null) {
  return String(valor || "").trim();
}

function dataOuNull(valor?: string | null) {
  const limpo = texto(valor);
  if (!limpo) return null;

  const data = new Date(limpo);
  if (Number.isNaN(data.getTime())) return null;

  return data.toISOString();
}

function resultadoPorEtapa(etapa: string) {
  const mapa: Record<string, string> = {
    novo: "observacao",
    contato: "pediu_retorno",
    whatsapp: "pediu_retorno",
    simulacao: "pediu_simulacao",
    agendado: "agendou_visita",
    visita: "visitou_loja",
    venda_pendente: "venda_pendente",
    venda_validada: "venda_pendente",
    perdido: "observacao",
  };

  return mapa[etapa] || "observacao";
}

function tipoPorEtapa(etapa: string) {
  const mapa: Record<string, string> = {
    novo: "observacao",
    contato: "contato",
    whatsapp: "contato",
    simulacao: "contato",
    agendado: "agendamento",
    visita: "visita",
    venda_pendente: "venda",
    venda_validada: "venda",
    perdido: "observacao",
  };

  return mapa[etapa] || "observacao";
}

function tipoAgendamentoPorEtapa(etapa: string) {
  const mapa: Record<string, string> = {
    contato: "retorno",
    whatsapp: "retorno",
    simulacao: "retorno",
    agendado: "visita",
    visita: "visita",
    venda_pendente: "retorno",
    venda_validada: "retorno",
  };

  return mapa[etapa] || "retorno";
}

function tituloAgendamentoPorEtapa(etapa: string) {
  const mapa: Record<string, string> = {
    contato: "Retorno de atendimento",
    whatsapp: "Retorno WhatsApp",
    simulacao: "Retorno de simulação",
    agendado: "Visita agendada",
    visita: "Acompanhamento de visita",
    venda_pendente: "Acompanhamento de venda",
    venda_validada: "Pós-venda",
  };

  return mapa[etapa] || "Agendamento";
}

function temperaturaPorColuna(coluna: any, etapa: string, atual: string) {
  if (
    coluna?.etapa_venda ||
    ["simulacao", "agendado", "visita", "venda_pendente", "venda_validada"].includes(etapa)
  ) {
    return "quente";
  }

  if (etapa === "perdido") {
    return "frio";
  }

  if (etapa === "novo") {
    return atual || "morno";
  }

  return atual === "frio" ? "morno" : atual || "morno";
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const leadId = texto(body.lead_id);
    const etapaDestino = texto(body.etapa_destino);
    const observacao = texto(body.observacao);
    const funilId = texto(body.funil_id);
    const proximaAcao = dataOuNull(body.data_proxima_acao);

    if (!leadId) {
      return NextResponse.json(
        { ok: false, erro: "Lead não informado." },
        { status: 400 }
      );
    }

    if (!etapaDestino) {
      return NextResponse.json(
        { ok: false, erro: "Etapa não informada." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const { data: usuarioInterno } = await supabase
      .from("usuarios_internos")
      .select("id, nome, perfil, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    if (!usuarioInterno) {
      return NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado ou inativo." },
        { status: 403 }
      );
    }

    let colunaDestino: any = null;

    if (funilId) {
      const { data: coluna } = await supabase
        .from("kanban_colunas")
        .select("*")
        .eq("funil_id", funilId)
        .eq("chave", etapaDestino)
        .eq("ativa", true)
        .maybeSingle();

      colunaDestino = coluna;
    }

    if (!colunaDestino) {
      const { data: colunaPadrao } = await supabase
        .from("kanban_colunas")
        .select("*, kanban_funis!inner(padrao, ativo)")
        .eq("chave", etapaDestino)
        .eq("ativa", true)
        .eq("kanban_funis.padrao", true)
        .eq("kanban_funis.ativo", true)
        .maybeSingle();

      colunaDestino = colunaPadrao;
    }

    if (!colunaDestino) {
      return NextResponse.json(
        { ok: false, erro: "Coluna do Kanban não encontrada." },
        { status: 400 }
      );
    }

    if (colunaDestino.exige_observacao && !observacao) {
      return NextResponse.json(
        { ok: false, erro: "Esta coluna exige observação." },
        { status: 400 }
      );
    }

    if (colunaDestino.exige_proxima_acao && !proximaAcao) {
      return NextResponse.json(
        { ok: false, erro: "Esta coluna exige próxima ação." },
        { status: 400 }
      );
    }

    const { data: leadAtual } = await supabase
      .from("leads")
      .select(
        `
        id,
        nome,
        etapa,
        temperatura,
        data_primeiro_contato,
        responsavel_id,
        atendente_resgate_id,
        atendente_resgate_nome,
        vendedor_c2s_id,
        vendedor_c2s_nome,
        vendedor_c2s_email,
        vendedor_c2s_telefone,
        loja_carteira_c2s_id,
        loja_carteira_c2s_nome,
        loja_visita_c2s_id,
        loja_visita_nome,
        veiculo_interesse
        `
      )
      .eq("id", leadId)
      .single();

    if (!leadAtual) {
      return NextResponse.json(
        { ok: false, erro: "Lead não encontrado." },
        { status: 404 }
      );
    }

    const perfil = String(usuarioInterno.perfil || "").toLowerCase();
    const podeSupervisor = ["adm", "admin", "supervisor", "gerente", "suporte"].includes(perfil);

    if (colunaDestino.bloqueada_operador && !podeSupervisor) {
      return NextResponse.json(
        { ok: false, erro: "Esta etapa exige permissão de supervisão/ADM." },
        { status: 403 }
      );
    }

    const temperatura = temperaturaPorColuna(colunaDestino, etapaDestino, leadAtual.temperatura);
    const agora = new Date().toISOString();
    const atendenteResgateId = leadAtual.atendente_resgate_id || leadAtual.responsavel_id || usuarioInterno.id;
    const atendenteResgateNome = leadAtual.atendente_resgate_nome || usuarioInterno.nome || null;

    const atualizacaoLead: Record<string, unknown> = {
      etapa: etapaDestino,
      temperatura,
      status: temperatura,
      data_proxima_acao: proximaAcao,
      data_ultimo_contato: agora,
      atualizado_em: agora,
      atendente_resgate_id: atendenteResgateId,
      atendente_resgate_nome: atendenteResgateNome,
      venda_pendente_validacao: etapaDestino === "venda_pendente" ? true : undefined,
      venda_validada: etapaDestino === "venda_validada" ? true : undefined,
      arquivado: etapaDestino === "perdido" ? true : undefined,
      arquivado_em: etapaDestino === "perdido" ? agora : undefined,
      motivo_arquivamento: etapaDestino === "perdido" ? observacao || "Movido para perdido no Kanban." : undefined,
    };

    if (!leadAtual.data_primeiro_contato) {
      atualizacaoLead.data_primeiro_contato = agora;
    }

    Object.keys(atualizacaoLead).forEach((key) => {
      if (atualizacaoLead[key] === undefined) {
        delete atualizacaoLead[key];
      }
    });

    const { data: lead, error: erroLead } = await supabase
      .from("leads")
      .update(atualizacaoLead)
      .eq("id", leadId)
      .select("*")
      .single();

    if (erroLead) {
      console.error("Erro ao mover etapa:", erroLead);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível atualizar a etapa do lead." },
        { status: 500 }
      );
    }

    const observacaoFinal =
      observacao ||
      `Lead movido no Kanban de ${leadAtual.etapa || "sem etapa"} para ${etapaDestino}.`;

    const { error: erroInteracao } = await supabase
      .from("lead_interacoes")
      .insert({
        lead_id: leadId,
        usuario_id: usuarioInterno.id,
        tipo: tipoPorEtapa(etapaDestino),
        canal: "sistema",
        resultado: resultadoPorEtapa(etapaDestino),
        observacao: observacaoFinal,
      });

    if (erroInteracao) {
      console.error("Erro ao registrar movimentação:", erroInteracao);
    }

    const deveCriarAgendamento =
      Boolean(proximaAcao) &&
      (
        colunaDestino.exige_proxima_acao ||
        ["contato", "whatsapp", "simulacao", "agendado", "visita", "venda_pendente"].includes(etapaDestino)
      );

    if (deveCriarAgendamento && proximaAcao) {
      const dataInicio = proximaAcao;
      const dataFim = new Date(new Date(dataInicio).getTime() + 60 * 60 * 1000).toISOString();

      const { error: erroAgendamento } = await supabase
        .from("lead_agendamentos")
        .insert({
          lead_id: leadId,
          usuario_id: usuarioInterno.id,
          criado_por: usuarioInterno.id,
          atualizado_por: usuarioInterno.id,
          titulo: tituloAgendamentoPorEtapa(etapaDestino),
          inicio: dataInicio,
          fim: dataFim,
          data_agendamento: dataInicio,
          tipo: tipoAgendamentoPorEtapa(etapaDestino),
          status: "agendado",
          origem: "kanban",
          observacao: observacaoFinal,
          veiculo_interesse: leadAtual.veiculo_interesse || null,

          vendedor_c2s_id: leadAtual.vendedor_c2s_id || null,
          vendedor_c2s_nome: leadAtual.vendedor_c2s_nome || null,
          vendedor_c2s_email: leadAtual.vendedor_c2s_email || null,
          loja_carteira_c2s_id: leadAtual.loja_carteira_c2s_id || null,
          loja_carteira_c2s_nome: leadAtual.loja_carteira_c2s_nome || null,

          loja_visita_c2s_id: leadAtual.loja_visita_c2s_id || null,
          loja_visita_nome: leadAtual.loja_visita_nome || null,

          atendente_resgate_id: atendenteResgateId,
          atendente_resgate_nome: atendenteResgateNome,

          comissao_resgate_valor: 500,
          comissao_resgate_status: "pendente",
          c2s_sync_status: "pendente",
        });

      if (erroAgendamento) {
        console.error("Erro ao criar agendamento:", erroAgendamento);

        return NextResponse.json(
          {
            ok: false,
            erro: "Lead movido, mas não foi possível criar o agendamento.",
            lead,
          },
          { status: 500 }
        );
      }
    }

    const c2sSync = await registrarHistoricoC2S({
      supabase,
      leadId,
      usuarioId: usuarioInterno.id,
      tipoEvento: etapaDestino === "venda_validada"
        ? "venda_confirmada"
        : etapaDestino === "venda_pendente"
          ? "venda_pendente"
          : etapaDestino === "perdido"
            ? "lead_perdido"
            : "mudanca_etapa",
      titulo: "Atualização de etapa no Flow Sales CRM",
      descricao: [
        "[Flow Sales CRM] Lead atualizado no funil de atendimento.",
        `Operador: ${usuarioInterno.nome}.`,
        `Etapa anterior: ${leadAtual.etapa || "não informada"}.`,
        `Nova etapa: ${etapaDestino}.`,
        observacaoFinal ? `Observação: ${observacaoFinal}` : "",
        proximaAcao ? `Próxima ação: ${new Date(proximaAcao).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : "",
      ].filter(Boolean).join("\n"),
      payload: {
        etapa_anterior: leadAtual.etapa || null,
        etapa_destino: etapaDestino,
        resultado: resultadoPorEtapa(etapaDestino),
        observacao: observacaoFinal,
        data_proxima_acao: proximaAcao,
      },
    });

    return NextResponse.json({
      ok: true,
      lead,
      c2s_sync: c2sSync,
    });
  } catch (error) {
    console.error("Erro inesperado ao mover lead:", error);

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao mover lead." },
      { status: 500 }
    );
  }
}
