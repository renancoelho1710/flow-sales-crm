import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UsuarioInterno = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string | null;
};

type MetaConfig = {
  usuario_id: string;
  meta_diaria_agendamentos: number | null;
  meta_semanal_agendamentos: number | null;
  meta_mensal_agendamentos: number | null;
  meta_mensal_vendas: number | null;
  comissao_por_venda: number | null;
};

type LeadAcao = {
  id: string;
  nome: string;
  telefone: string | null;
  veiculo_interesse: string | null;
  data_proxima_acao: string | null;
  temperatura: string | null;
  etapa: string | null;
  responsavel_id?: string | null;
  atendente_resgate_id?: string | null;
};

type AgendamentoComissao = {
  id: string;
  inicio: string | null;
  status: string | null;
  comissao_resgate_valor: number | null;
  comissao_resgate_status: string | null;
  usuario_id?: string | null;
  criado_por?: string | null;
  atendente_resgate_id?: string | null;
};

function perfilNormalizado(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function isGestao(perfil?: string | null) {
  return ["adm", "admin", "gerente", "supervisor", "suporte"].includes(perfilNormalizado(perfil));
}

function inicioDia(data = new Date()) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDia(data = new Date()) {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}

function inicioMes(data = new Date()) {
  const d = new Date(data.getFullYear(), data.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimMes(data = new Date()) {
  const d = new Date(data.getFullYear(), data.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function inicioSemana(data = new Date()) {
  const d = inicioDia(data);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function iso(data: Date) {
  return data.toISOString();
}

function yyyyMmDd(data: Date) {
  return data.toISOString().slice(0, 10);
}

function diasUteisAte(dataFinal: Date) {
  const inicio = inicioMes(dataFinal);
  const fim = inicioDia(dataFinal);
  let total = 0;
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const dia = d.getDay();
    if (dia !== 0) total += 1;
  }
  return Math.max(total, 1);
}

function diasUteisAntesDeHoje() {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  if (ontem < inicioMes(new Date())) return 0;
  return diasUteisAte(ontem);
}

function filtroUsuario(query: any, usuarioId: string) {
  return query.or(`responsavel_id.eq.${usuarioId},atendente_resgate_id.eq.${usuarioId},usuario_id.eq.${usuarioId},criado_por.eq.${usuarioId}`);
}

function filtroLeadUsuario(query: any, usuarioId: string) {
  return query.or(`responsavel_id.eq.${usuarioId},atendente_resgate_id.eq.${usuarioId}`);
}

async function countSafe(label: string, query: any) {
  const { count, error } = await query;
  if (error) {
    console.error(`Erro ao contar ${label}:`, error);
    return 0;
  }
  return count || 0;
}

async function getUsuarioLogado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      usuario: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 }),
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
      usuario: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado." }, { status: 403 }),
    };
  }

  return { supabase, usuario: usuario as UsuarioInterno, erro: null };
}

function metaFallback(usuarioId: string): MetaConfig {
  return {
    usuario_id: usuarioId,
    meta_diaria_agendamentos: 4,
    meta_semanal_agendamentos: 20,
    meta_mensal_agendamentos: 80,
    meta_mensal_vendas: 8,
    comissao_por_venda: 500,
  };
}

function mensagemMotivacional(percentual: number, faltamHoje: number, gordura: number) {
  if (percentual >= 100) return "Meta batida. Excelente! Agora é hora de criar gordurinha para amanhã.";
  if (gordura > 0) return `Você está com ${gordura} de vantagem. Continue nesse ritmo.`;
  if (faltamHoje <= 0) return "Você fechou a meta do dia. Quer transformar isso em vantagem para amanhã?";
  if (percentual >= 75) return `Falta pouco: mais ${faltamHoje} e você fecha a meta operacional.`;
  if (percentual >= 50) return `Metade do caminho já foi. Mais ${faltamHoje} e você vira o jogo.`;
  return `Começou o jogo. Foque nas oportunidades quentes e busque mais ${faltamHoje}.`;
}

function somarComissoes(agendamentos: AgendamentoComissao[]) {
  return agendamentos.reduce(
    (acc, item) => {
      const valor = Number(item.comissao_resgate_valor || 0);
      const status = String(item.comissao_resgate_status || "pendente").toLowerCase();
      if (["aprovada", "aprovado", "paga", "pago", "confirmada", "confirmado"].includes(status)) {
        acc.confirmada += valor;
      } else if (!["recusada", "recusado", "cancelada", "cancelado"].includes(status)) {
        acc.prevista += valor;
      }
      return acc;
    },
    { prevista: 0, confirmada: 0 }
  );
}

export async function GET() {
  try {
    const { supabase, usuario, erro } = await getUsuarioLogado();
    if (erro || !usuario) return erro;

    const gestao = isGestao(usuario.perfil);
    const agora = new Date();
    const hojeInicio = inicioDia(agora);
    const hojeFim = fimDia(agora);
    const mesInicio = inicioMes(agora);
    const mesFim = fimMes(agora);
    const semanaInicio = inicioSemana(agora);

    const { data: metaDb } = await supabase
      .from("metas_colaboradores")
      .select("usuario_id, meta_diaria_agendamentos, meta_semanal_agendamentos, meta_mensal_agendamentos, meta_mensal_vendas, comissao_por_venda")
      .eq("usuario_id", usuario.id)
      .eq("ativo", true)
      .maybeSingle();

    const meta = (metaDb as MetaConfig | null) || metaFallback(usuario.id);

    let qAgHoje = supabase
      .from("lead_agendamentos")
      .select("id", { count: "exact", head: true })
      .gte("inicio", iso(hojeInicio))
      .lte("inicio", iso(hojeFim));
    let qAgSemana = supabase
      .from("lead_agendamentos")
      .select("id", { count: "exact", head: true })
      .gte("inicio", iso(semanaInicio))
      .lte("inicio", iso(hojeFim));
    let qAgMes = supabase
      .from("lead_agendamentos")
      .select("id", { count: "exact", head: true })
      .gte("inicio", iso(mesInicio))
      .lte("inicio", iso(mesFim));
    let qAgMesAteOntem = supabase
      .from("lead_agendamentos")
      .select("id", { count: "exact", head: true })
      .gte("inicio", iso(mesInicio))
      .lt("inicio", iso(hojeInicio));

    if (!gestao) {
      qAgHoje = filtroUsuario(qAgHoje, usuario.id);
      qAgSemana = filtroUsuario(qAgSemana, usuario.id);
      qAgMes = filtroUsuario(qAgMes, usuario.id);
      qAgMesAteOntem = filtroUsuario(qAgMesAteOntem, usuario.id);
    }

    let qLeadsAtivos = supabase.from("leads").select("id", { count: "exact", head: true }).eq("arquivado", false);
    let qSemContato = supabase.from("leads").select("id", { count: "exact", head: true }).eq("arquivado", false).is("data_primeiro_contato", null);
    let qAtrasados = supabase.from("leads").select("id", { count: "exact", head: true }).eq("arquivado", false).lt("data_proxima_acao", iso(agora));
    let qVendasPendentes = supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("arquivado", false)
      .eq("venda_pendente_validacao", true)
      .eq("venda_validada", false);
    let qVendasConfirmadas = supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("arquivado", false)
      .eq("venda_validada", true)
      .gte("atualizado_em", iso(mesInicio));

    if (!gestao) {
      qLeadsAtivos = filtroLeadUsuario(qLeadsAtivos, usuario.id);
      qSemContato = filtroLeadUsuario(qSemContato, usuario.id);
      qAtrasados = filtroLeadUsuario(qAtrasados, usuario.id);
      qVendasPendentes = filtroLeadUsuario(qVendasPendentes, usuario.id);
      qVendasConfirmadas = filtroLeadUsuario(qVendasConfirmadas, usuario.id);
    }

    const [
      agHoje,
      agSemana,
      agMes,
      agMesAteOntem,
      leadsAtivos,
      semContato,
      atrasados,
      vendasPendentes,
      vendasConfirmadas,
    ] = await Promise.all([
      countSafe("agendamentos hoje", qAgHoje),
      countSafe("agendamentos semana", qAgSemana),
      countSafe("agendamentos mês", qAgMes),
      countSafe("agendamentos mês até ontem", qAgMesAteOntem),
      countSafe("leads ativos", qLeadsAtivos),
      countSafe("leads sem contato", qSemContato),
      countSafe("leads atrasados", qAtrasados),
      countSafe("vendas pendentes", qVendasPendentes),
      countSafe("vendas confirmadas", qVendasConfirmadas),
    ]);

    let qComissoes = supabase
      .from("lead_agendamentos")
      .select("id, inicio, status, comissao_resgate_valor, comissao_resgate_status, usuario_id, criado_por, atendente_resgate_id")
      .gte("inicio", iso(mesInicio))
      .lte("inicio", iso(mesFim));

    if (!gestao) qComissoes = filtroUsuario(qComissoes, usuario.id);

    const { data: comissoesData } = await qComissoes;
    const comissoes = somarComissoes((comissoesData || []) as AgendamentoComissao[]);

    const metaDiaria = Number(meta.meta_diaria_agendamentos || 4);
    const metaMensalAg = Number(meta.meta_mensal_agendamentos || metaDiaria * 20);
    const metaMensalVendas = Number(meta.meta_mensal_vendas || 8);
    const diasAteHoje = diasUteisAte(agora);
    const diasAntes = diasUteisAntesDeHoje();
    const pendenciaAnterior = Math.max(0, diasAntes * metaDiaria - agMesAteOntem);
    const metaHojeComAcumulado = metaDiaria + pendenciaAnterior;
    const faltamHoje = Math.max(0, metaHojeComAcumulado - agHoje);
    const gorduraHoje = Math.max(0, agHoje - metaHojeComAcumulado);
    const metaAcumuladaMes = Math.max(metaDiaria, diasAteHoje * metaDiaria);
    const percentualHoje = metaHojeComAcumulado ? Math.min(160, Math.round((agHoje / metaHojeComAcumulado) * 100)) : 100;
    const percentualMes = metaMensalAg ? Math.min(160, Math.round((agMes / metaMensalAg) * 100)) : 100;

    const proximosQueryBase = supabase
      .from("leads")
      .select("id, nome, telefone, veiculo_interesse, data_proxima_acao, temperatura, etapa, responsavel_id, atendente_resgate_id")
      .eq("arquivado", false)
      .not("data_proxima_acao", "is", null)
      .order("data_proxima_acao", { ascending: true })
      .limit(8);

    const { data: proximasAcoes } = await (gestao ? proximosQueryBase : filtroLeadUsuario(proximosQueryBase, usuario.id));

    const desdeSeteDias = new Date();
    desdeSeteDias.setDate(desdeSeteDias.getDate() - 6);
    desdeSeteDias.setHours(0, 0, 0, 0);

    let qSerieAg = supabase
      .from("lead_agendamentos")
      .select("inicio, usuario_id, criado_por, atendente_resgate_id")
      .gte("inicio", iso(desdeSeteDias));
    if (!gestao) qSerieAg = filtroUsuario(qSerieAg, usuario.id);
    const { data: serieAgData } = await qSerieAg;

    let qSerieVendas = supabase
      .from("leads")
      .select("atualizado_em, responsavel_id, atendente_resgate_id")
      .eq("venda_validada", true)
      .gte("atualizado_em", iso(desdeSeteDias));
    if (!gestao) qSerieVendas = filtroLeadUsuario(qSerieVendas, usuario.id);
    const { data: serieVendasData } = await qSerieVendas;

    const serie = Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(desdeSeteDias);
      d.setDate(d.getDate() + index);
      const chave = yyyyMmDd(d);
      return {
        data: chave,
        label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d).replace(".", ""),
        agendamentos: (serieAgData || []).filter((item: any) => yyyyMmDd(new Date(item.inicio)) === chave).length,
        vendas: (serieVendasData || []).filter((item: any) => yyyyMmDd(new Date(item.atualizado_em)) === chave).length,
      };
    });

    const equipe = [] as any[];

    if (gestao) {
      const { data: usuariosEquipe } = await supabase
        .from("usuarios_internos")
        .select("id, nome, email, perfil, status_operacional, status_administrativo, recebe_leads")
        .eq("ativo", true)
        .order("nome", { ascending: true })
        .limit(80);

      const { data: metasEquipe } = await supabase
        .from("metas_colaboradores")
        .select("usuario_id, meta_diaria_agendamentos, meta_mensal_agendamentos, meta_mensal_vendas, comissao_por_venda")
        .eq("ativo", true);

      const metasPorUsuario = new Map<string, any>();
      for (const item of metasEquipe || []) metasPorUsuario.set(item.usuario_id, item);

      for (const membro of usuariosEquipe || []) {
        const metaMembro = metasPorUsuario.get(membro.id) || metaFallback(membro.id);
        const { count: agMembro } = await supabase
          .from("lead_agendamentos")
          .select("id", { count: "exact", head: true })
          .gte("inicio", iso(mesInicio))
          .lte("inicio", iso(mesFim))
          .or(`usuario_id.eq.${membro.id},criado_por.eq.${membro.id},atendente_resgate_id.eq.${membro.id}`);

        const { count: vendasMembro } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("venda_validada", true)
          .gte("atualizado_em", iso(mesInicio))
          .or(`responsavel_id.eq.${membro.id},atendente_resgate_id.eq.${membro.id}`);

        const metaMes = Number(metaMembro.meta_mensal_agendamentos || 80);
        equipe.push({
          id: membro.id,
          nome: membro.nome,
          perfil: membro.perfil,
          status_operacional: membro.status_operacional || "offline",
          recebe_leads: Boolean(membro.recebe_leads),
          agendamentos_mes: agMembro || 0,
          vendas_mes: vendasMembro || 0,
          meta_mensal_agendamentos: metaMes,
          progresso: metaMes ? Math.round(((agMembro || 0) / metaMes) * 100) : 0,
        });
      }
    }

    const statusEquipe = gestao
      ? {
          disponiveis: equipe.filter((item) => ["disponivel", "online"].includes(String(item.status_operacional))).length,
          ocupados: equipe.filter((item) => ["ocupado", "em_ligacao", "em_atendimento"].includes(String(item.status_operacional))).length,
          pausas: equipe.filter((item) => String(item.status_operacional).includes("pausa")).length,
          offline: equipe.filter((item) => ["offline", "bloqueado"].includes(String(item.status_operacional))).length,
        }
      : null;

    return NextResponse.json({
      ok: true,
      usuario,
      perfil: perfilNormalizado(usuario.perfil),
      modo: gestao ? "gestao" : "operador",
      periodo: {
        hoje: yyyyMmDd(agora),
        mes_inicio: yyyyMmDd(mesInicio),
        mes_fim: yyyyMmDd(mesFim),
      },
      metas: {
        diaria_agendamentos: metaDiaria,
        hoje_com_acumulado: metaHojeComAcumulado,
        pendencia_anterior: pendenciaAnterior,
        faltam_hoje: faltamHoje,
        gordura_hoje: gorduraHoje,
        mensal_agendamentos: metaMensalAg,
        mensal_vendas: metaMensalVendas,
        percentual_hoje: percentualHoje,
        percentual_mes: percentualMes,
        mensagem: mensagemMotivacional(percentualHoje, faltamHoje, gorduraHoje),
      },
      resumo: {
        leads_ativos: leadsAtivos,
        agendamentos_hoje: agHoje,
        agendamentos_semana: agSemana,
        agendamentos_mes: agMes,
        vendas_pendentes: vendasPendentes,
        vendas_confirmadas: vendasConfirmadas,
        leads_sem_contato: semContato,
        proximas_acoes_atrasadas: atrasados,
        comissao_prevista: comissoes.prevista,
        comissao_confirmada: comissoes.confirmada,
      },
      serie,
      proximas_acoes: (proximasAcoes || []) as LeadAcao[],
      equipe,
      status_equipe: statusEquipe,
    });
  } catch (error) {
    console.error("Erro inesperado no dashboard de metas:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao carregar dashboard." }, { status: 500 });
  }
}
