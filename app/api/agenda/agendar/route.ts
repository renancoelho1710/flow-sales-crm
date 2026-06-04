import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PeriodoAgenda = "manha" | "tarde" | "noite";

type Payload = {
  lead_id?: string;
  vendedor_comercial_id?: string;
  data?: string;
  periodo?: PeriodoAgenda;
  horario?: string;
  tipo?: string;
  observacao?: string;
};

function periodoPorHora(data: Date): PeriodoAgenda {
  const hora = data.getHours();
  if (hora < 12) return "manha";
  if (hora < 18) return "tarde";
  return "noite";
}

function inicioFimData(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const inicio = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
  const fim = new Date(ano, mes - 1, dia, 23, 59, 59, 999);
  return { inicio, fim };
}

function montarDataHora(dataIso: string, horario = "14:00") {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const [hora, minuto] = horario.split(":").map(Number);
  return new Date(ano, mes - 1, dia, hora || 14, minuto || 0, 0, 0);
}

function horaPadraoPeriodo(periodo: PeriodoAgenda) {
  if (periodo === "manha") return "09:00";
  if (periodo === "tarde") return "14:00";
  return "18:30";
}

async function getContexto() {
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

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuario) {
    return {
      supabase,
      usuario: null,
      erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado." }, { status: 403 }),
    };
  }

  return { supabase, usuario, erro: null };
}

function validarPeriodo(valor: unknown): PeriodoAgenda | null {
  if (valor === "manha" || valor === "tarde" || valor === "noite") return valor;
  return null;
}

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "supervisor", "gerente", "suporte"].includes(String(perfil || "").trim().toLowerCase());
}

function normalizarBusca(valor: string | null | undefined) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const leadId = String(body.lead_id || "").trim();
    const vendedorId = String(body.vendedor_comercial_id || "").trim();
    const data = String(body.data || "").trim();
    const periodo = validarPeriodo(body.periodo);
    const tipo = String(body.tipo || "visita").trim() || "visita";
    const observacao = String(body.observacao || "").trim();

    if (!leadId) {
      return NextResponse.json({ ok: false, erro: "Lead não informado." }, { status: 400 });
    }

    if (!vendedorId) {
      return NextResponse.json({ ok: false, erro: "Vendedor não informado." }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !periodo) {
      return NextResponse.json({ ok: false, erro: "Informe data e período válidos." }, { status: 400 });
    }

    const { supabase, usuario, erro } = await getContexto();
    if (erro || !usuario) return erro;

    const { inicio, fim } = inicioFimData(data);
    const diaSemana = inicio.getDay();
    const horario = body.horario || horaPadraoPeriodo(periodo);
    const inicioAgendamento = montarDataHora(data, horario);
    const fimAgendamento = new Date(inicioAgendamento.getTime() + 60 * 60 * 1000);

    const [leadResp, vendedorResp, capacidadeResp, bloqueiosResp, agendamentosResp] = await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).single(),
      supabase
        .from("vendedores_comerciais")
        .select("id, nome, loja, ativo, recebe_agendamento, situacao_operacional, telefone_corporativo, telefone_particular")
        .eq("id", vendedorId)
        .maybeSingle(),
      supabase
        .from("vendedores_capacidade")
        .select("dia_semana, manha_ativo, tarde_ativo, noite_ativo, capacidade_manha, capacidade_tarde, capacidade_noite")
        .eq("vendedor_id", vendedorId)
        .eq("dia_semana", diaSemana)
        .maybeSingle(),
      supabase
        .from("vendedores_bloqueios")
        .select("id, tipo, periodo, data_inicio, data_fim, motivo, ativo")
        .eq("vendedor_id", vendedorId)
        .eq("ativo", true)
        .lte("data_inicio", data)
        .gte("data_fim", data),
      supabase
        .from("lead_agendamentos")
        .select("id, inicio, status, periodo_agendamento")
        .eq("vendedor_comercial_id", vendedorId)
        .gte("inicio", inicio.toISOString())
        .lte("inicio", fim.toISOString())
        .not("status", "in", "(cancelado,concluido,realizado,nao_compareceu)"),
    ]);

    if (leadResp.error) throw leadResp.error;
    if (vendedorResp.error) throw vendedorResp.error;
    if (capacidadeResp.error) throw capacidadeResp.error;
    if (bloqueiosResp.error) throw bloqueiosResp.error;
    if (agendamentosResp.error) throw agendamentosResp.error;

    const lead = leadResp.data;
    const vendedor = vendedorResp.data as {
      id: string;
      nome: string;
      loja: string | null;
      ativo: boolean;
      recebe_agendamento: boolean;
      situacao_operacional: string | null;
    } | null;

    if (!lead) {
      return NextResponse.json({ ok: false, erro: "Lead não encontrado." }, { status: 404 });
    }

    if (!vendedor) {
      return NextResponse.json({ ok: false, erro: "Vendedor não encontrado." }, { status: 404 });
    }

    if (!perfilGestao(usuario.perfil)) {
      const nomesPermitidos = [lead.vendedor_nome, lead.vendedor_c2s_nome]
        .filter(Boolean)
        .map((valor) => normalizarBusca(String(valor)));

      if (!nomesPermitidos.length) {
        return NextResponse.json(
          { ok: false, erro: "Este lead não possui vendedor C2S vinculado. Acione ADM/Supervisão antes de agendar." },
          { status: 403 }
        );
      }

      if (!nomesPermitidos.includes(normalizarBusca(vendedor.nome))) {
        return NextResponse.json(
          { ok: false, erro: "Operador só pode agendar para o vendedor dono do lead no C2S." },
          { status: 403 }
        );
      }
    }

    if (!vendedor.ativo || !vendedor.recebe_agendamento || vendedor.situacao_operacional !== "ativo") {
      return NextResponse.json(
        { ok: false, erro: "Este vendedor não está liberado para novos agendamentos." },
        { status: 409 }
      );
    }

    const capacidade = capacidadeResp.data || {
      dia_semana: diaSemana,
      manha_ativo: diaSemana !== 0,
      tarde_ativo: diaSemana !== 0 && diaSemana !== 6,
      noite_ativo: false,
      capacidade_manha: diaSemana === 0 ? 0 : diaSemana === 6 ? 2 : 3,
      capacidade_tarde: diaSemana === 0 || diaSemana === 6 ? 0 : 4,
      capacidade_noite: 0,
    };

    const ativoKey = `${periodo}_ativo` as "manha_ativo" | "tarde_ativo" | "noite_ativo";
    const capKey = `capacidade_${periodo}` as "capacidade_manha" | "capacidade_tarde" | "capacidade_noite";
    const bloqueado = (bloqueiosResp.data || []).find((item) => item.periodo === "dia" || item.periodo === periodo);

    const contagem = { manha: 0, tarde: 0, noite: 0 } as Record<PeriodoAgenda, number>;
    for (const item of agendamentosResp.data || []) {
      const periodoCalculado = validarPeriodo(item.periodo_agendamento) ?? periodoPorHora(new Date(item.inicio));
      if (periodoCalculado === "manha" || periodoCalculado === "tarde" || periodoCalculado === "noite") {
        contagem[periodoCalculado]++;
      }
    }

    const limite = Number(capacidade[capKey] || 0);
    const usado = contagem[periodo];
    const periodoAtivo = Boolean(capacidade[ativoKey]);

    if (!periodoAtivo || limite <= 0) {
      return NextResponse.json(
        { ok: false, erro: `O período da ${periodo} não está ativo para este vendedor nesta data.` },
        { status: 409 }
      );
    }

    if (bloqueado) {
      return NextResponse.json(
        { ok: false, erro: bloqueado.motivo || "O vendedor está bloqueado para este período." },
        { status: 409 }
      );
    }

    if (usado >= limite) {
      return NextResponse.json(
        { ok: false, erro: "Esse período acabou de ficar indisponível. Escolha outra opção." },
        { status: 409 }
      );
    }

    const titulo = `${tipo === "test_drive" ? "Test drive" : tipo === "retorno" ? "Retorno" : tipo === "entrega" ? "Entrega" : "Visita"} - ${lead.nome}`;

    const { data: agendamento, error: erroAgendamento } = await supabase
      .from("lead_agendamentos")
      .insert({
        lead_id: leadId,
        usuario_id: usuario.id,
        criado_por: usuario.id,
        titulo,
        tipo,
        inicio: inicioAgendamento.toISOString(),
        fim: fimAgendamento.toISOString(),
        status: "agendado",
        observacao,
        veiculo_interesse: lead.veiculo_interesse || null,
        origem: "lead_agendamento_inteligente",
        c2s_sync_status: "pendente",
        vendedor_comercial_id: vendedorId,
        periodo_agendamento: periodo,
        vendedor_c2s_nome: vendedor.nome,
        loja_visita_nome: vendedor.loja,
        atendente_resgate_id: usuario.id,
        atendente_resgate_nome: usuario.nome,
      })
      .select("*")
      .single();

    if (erroAgendamento) {
      console.error("Erro ao criar agendamento inteligente:", erroAgendamento);
      return NextResponse.json({ ok: false, erro: "Não foi possível criar o agendamento." }, { status: 500 });
    }

    const observacaoInteracao = [
      `Agendamento criado para ${data} no período ${periodo}.`,
      `Vendedor: ${vendedor.nome}.`,
      observacao ? `Observação: ${observacao}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { data: interacao } = await supabase
      .from("lead_interacoes")
      .insert({
        lead_id: leadId,
        usuario_id: usuario.id,
        tipo: "agendamento",
        canal: "sistema",
        resultado: "agendou_visita",
        observacao: observacaoInteracao,
      })
      .select("*")
      .single();

    const { data: leadAtualizado } = await supabase
      .from("leads")
      .update({
        etapa: "agendado",
        data_proxima_acao: inicioAgendamento.toISOString(),
        data_ultimo_contato: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        vendedor_id: lead.vendedor_id || null,
        vendedor_nome: lead.vendedor_nome || vendedor.nome,
      })
      .eq("id", leadId)
      .select("*")
      .single();

    return NextResponse.json({
      ok: true,
      agendamento,
      interacao,
      lead: leadAtualizado || lead,
    });
  } catch (error) {
    console.error("Erro inesperado ao agendar lead:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao criar agendamento." }, { status: 500 });
  }
}
