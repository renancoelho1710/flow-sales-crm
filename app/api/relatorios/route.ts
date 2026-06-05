import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AnyRecord = Record<string, any>;

type UsuarioInterno = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string | null;
  ativo: boolean | null;
  recebe_leads?: boolean | null;
  status_operacional?: string | null;
  status_administrativo?: string | null;
};

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente", "supervisor"].includes(String(perfil || "").toLowerCase());
}

function inicioFimPadrao(request: Request) {
  const url = new URL(request.url);
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicio = String(url.searchParams.get("inicio") || primeiroDia.toISOString().slice(0, 10));
  const fim = String(url.searchParams.get("fim") || hoje.toISOString().slice(0, 10));
  const usuarioId = String(url.searchParams.get("usuario_id") || "todos");
  const loja = String(url.searchParams.get("loja") || "todas");
  const origem = String(url.searchParams.get("origem") || "todas");
  const tipo = String(url.searchParams.get("tipo") || "geral");

  const inicioIso = new Date(`${inicio}T00:00:00.000`).toISOString();
  const fimIso = new Date(`${fim}T23:59:59.999`).toISOString();

  return { inicio, fim, inicioIso, fimIso, usuarioId, loja, origem, tipo };
}

function normalizar(valor?: string | null) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function agruparPor<T extends AnyRecord>(lista: T[], chave: keyof T) {
  const mapa = new Map<string, T[]>();
  for (const item of lista) {
    const key = String(item[chave] || "Nao informado");
    if (!mapa.has(key)) mapa.set(key, []);
    mapa.get(key)!.push(item);
  }
  return mapa;
}

async function safeSelect(supabase: any, table: string, select: string, apply?: (query: any) => any) {
  try {
    let query = supabase.from(table).select(select);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

function contar(lista: AnyRecord[], predicate: (item: AnyRecord) => boolean) {
  return lista.filter(predicate).length;
}

function minutosEntre(a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const ini = new Date(a).getTime();
  const fim = new Date(b).getTime();
  if (!Number.isFinite(ini) || !Number.isFinite(fim) || fim < ini) return 0;
  return Math.round((fim - ini) / 60000);
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 });
    }

    const { data: usuarioInterno } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    if (!usuarioInterno) {
      return NextResponse.json({ ok: false, erro: "Usuário interno não localizado." }, { status: 403 });
    }

    const filtros = inicioFimPadrao(request);
    const gestao = perfilGestao(usuarioInterno.perfil);
    const usuarioFiltro = !gestao ? usuarioInterno.id : filtros.usuarioId;

    const usuariosResp = await safeSelect(
      supabase,
      "usuarios_internos",
      "id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo",
      (q) => q.eq("ativo", true).order("nome", { ascending: true })
    );

    const usuarios = usuariosResp.data as UsuarioInterno[];
    const usuariosPorId = new Map(usuarios.map((u) => [u.id, u]));

    const leadsResp = await safeSelect(
      supabase,
      "leads",
      "id, nome, telefone, origem, campanha, etapa, status, temperatura, responsavel_id, atendente_resgate_id, vendedor_c2s_nome, loja_carteira_c2s_nome, loja_visita_nome, veiculo_interesse, arquivado, motivo_arquivamento, venda_pendente_validacao, venda_validada, criado_em, atualizado_em, data_primeiro_contato, data_ultimo_contato, data_proxima_acao",
      (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(8000)
    );

    let leads = leadsResp.data as AnyRecord[];
    if (usuarioFiltro !== "todos") {
      leads = leads.filter((lead) => lead.responsavel_id === usuarioFiltro || lead.atendente_resgate_id === usuarioFiltro);
    }
    if (filtros.loja !== "todas") {
      leads = leads.filter((lead) => normalizar(lead.loja_carteira_c2s_nome || lead.loja_visita_nome) === normalizar(filtros.loja));
    }
    if (filtros.origem !== "todas") {
      leads = leads.filter((lead) => normalizar(lead.origem) === normalizar(filtros.origem));
    }

    const leadIds = leads.map((lead) => lead.id);

    const interacoesResp = leadIds.length
      ? await safeSelect(
          supabase,
          "lead_interacoes",
          "id, lead_id, usuario_id, tipo, canal, resultado, observacao, criado_em",
          (q) => q.in("lead_id", leadIds).gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(15000)
        )
      : { data: [], error: null };

    let interacoes = interacoesResp.data as AnyRecord[];
    if (usuarioFiltro !== "todos") interacoes = interacoes.filter((item) => item.usuario_id === usuarioFiltro);

    const agendamentosResp = await safeSelect(
      supabase,
      "lead_agendamentos",
      "id, lead_id, usuario_id, criado_por, titulo, tipo, inicio, fim, status, vendedor_c2s_nome, loja_carteira_c2s_nome, loja_visita_nome, atendente_resgate_nome, vendedor_comercial_id, periodo_agendamento, criado_em",
      (q) => q.gte("inicio", filtros.inicioIso).lte("inicio", filtros.fimIso).limit(10000)
    );

    let agendamentos = agendamentosResp.data as AnyRecord[];
    if (usuarioFiltro !== "todos") agendamentos = agendamentos.filter((item) => item.usuario_id === usuarioFiltro || item.criado_por === usuarioFiltro);
    if (filtros.loja !== "todas") agendamentos = agendamentos.filter((item) => normalizar(item.loja_carteira_c2s_nome || item.loja_visita_nome) === normalizar(filtros.loja));

    const ligacoes3cxResp = await safeSelect(
      supabase,
      "ligacoes_3cx",
      "id, usuario_id, colaborador_id, operador_id, nome_operador, telefone, direcao, duracao_segundos, tempo_atendimento_segundos, inicio, fim, status, resultado, criado_em",
      (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(20000)
    );

    let ligacoes3cx = ligacoes3cxResp.data as AnyRecord[];
    if (usuarioFiltro !== "todos") {
      ligacoes3cx = ligacoes3cx.filter((item) => item.usuario_id === usuarioFiltro || item.colaborador_id === usuarioFiltro || item.operador_id === usuarioFiltro);
    }

    const whatsappConversasResp = await safeSelect(
      supabase,
      "whatsapp_conversas",
      "id, usuario_id, atendente_id, operador_id, nome_contato, telefone, status, criado_em, atualizado_em, ultima_mensagem_em",
      (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(15000)
    );

    const whatsappMensagensResp = await safeSelect(
      supabase,
      "whatsapp_mensagens",
      "id, conversa_id, usuario_id, atendente_id, operador_id, direcao, tipo, criado_em",
      (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(30000)
    );

    let whatsappConversas = whatsappConversasResp.data as AnyRecord[];
    let whatsappMensagens = whatsappMensagensResp.data as AnyRecord[];
    if (usuarioFiltro !== "todos") {
      whatsappConversas = whatsappConversas.filter((item) => item.usuario_id === usuarioFiltro || item.atendente_id === usuarioFiltro || item.operador_id === usuarioFiltro);
      whatsappMensagens = whatsappMensagens.filter((item) => item.usuario_id === usuarioFiltro || item.atendente_id === usuarioFiltro || item.operador_id === usuarioFiltro);
    }

    const statusHistoricoResp = await safeSelect(
      supabase,
      "usuarios_status_historico",
      "id, usuario_id, status_anterior, status_novo, motivo, criado_em, encerrado_em",
      (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(15000)
    );

    let statusHistorico = statusHistoricoResp.data as AnyRecord[];
    if (usuarioFiltro !== "todos") statusHistorico = statusHistorico.filter((item) => item.usuario_id === usuarioFiltro);

    const importacoesResp = await safeSelect(
      supabase,
      "importacoes_c2s",
      "id, usuario_id, total_recebidos, total_importados, total_atualizados, total_sem_telefone, status, observacao, criado_em",
      (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).order("criado_em", { ascending: false }).limit(100)
    );

    const ligacoesInteracoes = interacoes.filter((item) => ["telefone", "ligacao", "3cx"].includes(normalizar(item.canal)) || ["telefone", "ligacao"].includes(normalizar(item.tipo)));
    const whatsappInteracoes = interacoes.filter((item) => normalizar(item.canal) === "whatsapp" || normalizar(item.tipo) === "whatsapp");

    const totalLigacoes = ligacoes3cx.length || ligacoesInteracoes.length;
    const ligacoesValidas = ligacoes3cx.length
      ? ligacoes3cx.filter((item) => Number(item.duracao_segundos || item.tempo_atendimento_segundos || 0) >= 20).length
      : ligacoesInteracoes.length;

    const duracaoTotalSegundos = ligacoes3cx.reduce((total, item) => total + Number(item.duracao_segundos || item.tempo_atendimento_segundos || 0), 0);
    const tmaSegundos = totalLigacoes > 0 && duracaoTotalSegundos > 0 ? Math.round(duracaoTotalSegundos / totalLigacoes) : 0;

    const pausasMinutos = statusHistorico.reduce((total, item) => {
      const status = normalizar(item.status_novo || item.motivo);
      if (!status.includes("pausa") && !status.includes("offline") && !status.includes("ocupado")) return total;
      return total + minutosEntre(item.criado_em, item.encerrado_em || new Date().toISOString());
    }, 0);

    const resumo = {
      leads_recebidos: leads.length,
      leads_trabalhados: new Set(interacoes.map((item) => item.lead_id)).size,
      leads_sem_contato: leads.filter((lead) => !lead.data_primeiro_contato).length,
      leads_arquivados: leads.filter((lead) => Boolean(lead.arquivado)).length,
      agendamentos: agendamentos.length,
      agendamentos_confirmados: agendamentos.filter((item) => ["confirmado", "realizado", "concluido"].includes(normalizar(item.status))).length,
      agendamentos_cancelados: agendamentos.filter((item) => ["cancelado", "nao_compareceu"].includes(normalizar(item.status))).length,
      vendas_pendentes: leads.filter((lead) => Boolean(lead.venda_pendente_validacao)).length,
      vendas_confirmadas: leads.filter((lead) => Boolean(lead.venda_validada)).length,
      ligacoes: totalLigacoes,
      ligacoes_validas: ligacoesValidas,
      tma_segundos: tmaSegundos,
      whatsapp_conversas: whatsappConversas.length,
      whatsapp_mensagens: whatsappMensagens.length || whatsappInteracoes.length,
      pausas_minutos: pausasMinutos,
      conversao_agendamento: leads.length ? Math.round((agendamentos.length / leads.length) * 1000) / 10 : 0,
      conversao_venda: leads.length ? Math.round((leads.filter((lead) => Boolean(lead.venda_validada)).length / leads.length) * 1000) / 10 : 0,
    };

    const porUsuario = usuarios.map((usuario) => {
      const userLeads = leads.filter((lead) => lead.responsavel_id === usuario.id || lead.atendente_resgate_id === usuario.id);
      const userInteracoes = interacoes.filter((item) => item.usuario_id === usuario.id);
      const userAgendamentos = agendamentos.filter((item) => item.usuario_id === usuario.id || item.criado_por === usuario.id);
      const userLigacoes3cx = ligacoes3cx.filter((item) => item.usuario_id === usuario.id || item.colaborador_id === usuario.id || item.operador_id === usuario.id);
      const userWhatsappConversas = whatsappConversas.filter((item) => item.usuario_id === usuario.id || item.atendente_id === usuario.id || item.operador_id === usuario.id);
      const userWhatsappMensagens = whatsappMensagens.filter((item) => item.usuario_id === usuario.id || item.atendente_id === usuario.id || item.operador_id === usuario.id);
      const userStatus = statusHistorico.filter((item) => item.usuario_id === usuario.id);
      const userDuracao = userLigacoes3cx.reduce((total, item) => total + Number(item.duracao_segundos || item.tempo_atendimento_segundos || 0), 0);
      const userTma = userLigacoes3cx.length && userDuracao ? Math.round(userDuracao / userLigacoes3cx.length) : 0;
      const userPausas = userStatus.reduce((total, item) => {
        const status = normalizar(item.status_novo || item.motivo);
        if (!status.includes("pausa") && !status.includes("offline") && !status.includes("ocupado")) return total;
        return total + minutosEntre(item.criado_em, item.encerrado_em || new Date().toISOString());
      }, 0);

      return {
        id: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
        status_operacional: usuario.status_operacional,
        recebe_leads: Boolean(usuario.recebe_leads),
        leads: userLeads.length,
        leads_trabalhados: new Set(userInteracoes.map((item) => item.lead_id)).size,
        ligacoes: userLigacoes3cx.length || userInteracoes.filter((item) => ["telefone", "ligacao", "3cx"].includes(normalizar(item.canal))).length,
        ligacoes_validas: userLigacoes3cx.length ? userLigacoes3cx.filter((item) => Number(item.duracao_segundos || item.tempo_atendimento_segundos || 0) >= 20).length : userInteracoes.filter((item) => ["telefone", "ligacao", "3cx"].includes(normalizar(item.canal))).length,
        tma_segundos: userTma,
        whatsapp_conversas: userWhatsappConversas.length,
        whatsapp_mensagens: userWhatsappMensagens.length || userInteracoes.filter((item) => normalizar(item.canal) === "whatsapp").length,
        agendamentos: userAgendamentos.length,
        vendas_pendentes: userLeads.filter((lead) => Boolean(lead.venda_pendente_validacao)).length,
        vendas_confirmadas: userLeads.filter((lead) => Boolean(lead.venda_validada)).length,
        pausas_minutos: userPausas,
        produtividade_score: userLeads.length + userAgendamentos.length * 3 + userLigacoes3cx.length + userWhatsappMensagens.length,
      };
    }).filter((usuario) => usuario.leads || usuario.ligacoes || usuario.whatsapp_mensagens || usuario.agendamentos || usuario.vendas_confirmadas || usuario.id === usuarioFiltro);

    const lojasMap = agruparPor(leads, "loja_carteira_c2s_nome");
    const porLoja = Array.from(lojasMap.entries()).map(([loja, lista]) => ({
      loja,
      leads: lista.length,
      agendamentos: agendamentos.filter((item) => String(item.loja_carteira_c2s_nome || item.loja_visita_nome || "Nao informado") === loja).length,
      vendas_confirmadas: lista.filter((lead) => Boolean(lead.venda_validada)).length,
      arquivados: lista.filter((lead) => Boolean(lead.arquivado)).length,
      conversao: lista.length ? Math.round((lista.filter((lead) => Boolean(lead.venda_validada)).length / lista.length) * 1000) / 10 : 0,
    })).sort((a, b) => b.leads - a.leads);

    const origemMap = agruparPor(leads, "origem");
    const porOrigem = Array.from(origemMap.entries()).map(([origem, lista]) => ({
      origem,
      leads: lista.length,
      vendas_confirmadas: lista.filter((lead) => Boolean(lead.venda_validada)).length,
      arquivados: lista.filter((lead) => Boolean(lead.arquivado)).length,
    })).sort((a, b) => b.leads - a.leads);

    const alertas = [];
    if (resumo.leads_sem_contato > 0) alertas.push(`${resumo.leads_sem_contato} lead(s) sem primeiro contato no período.`);
    if (resumo.agendamentos_cancelados > 0) alertas.push(`${resumo.agendamentos_cancelados} agendamento(s) cancelado(s) ou não comparecimento.`);
    if (resumo.vendas_pendentes > 0) alertas.push(`${resumo.vendas_pendentes} venda(s) pendente(s) de validação.`);
    if (ligacoes3cxResp.error) alertas.push("Dados detalhados do 3CX não foram encontrados; relatório usou registros de interação como fallback.");
    if (whatsappConversasResp.error && whatsappMensagensResp.error) alertas.push("Dados detalhados do WhatsApp ainda não foram encontrados; relatório usou interações do lead como fallback.");

    return NextResponse.json({
      ok: true,
      gerado_em: new Date().toISOString(),
      filtros,
      usuario_logado: usuarioInterno,
      permissoes: { gestao },
      resumo,
      por_usuario: porUsuario,
      por_loja: porLoja,
      por_origem: porOrigem,
      importacoes: importacoesResp.data,
      alertas,
      fontes: {
        leads: !leadsResp.error,
        interacoes: !interacoesResp.error,
        agendamentos: !agendamentosResp.error,
        ligacoes_3cx: !ligacoes3cxResp.error,
        whatsapp_conversas: !whatsappConversasResp.error,
        whatsapp_mensagens: !whatsappMensagensResp.error,
        status_historico: !statusHistoricoResp.error,
      },
    });
  } catch (error) {
    console.error("Erro ao montar relatórios:", error);
    return NextResponse.json({ ok: false, erro: "Não foi possível montar os relatórios." }, { status: 500 });
  }
}
