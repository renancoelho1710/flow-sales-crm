import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Lead = {
  id: string;
  nome: string | null;
  telefone: string | null;
  telefone_normalizado: string | null;
  veiculo_interesse: string | null;
  vendedor_nome: string | null;
  vendedor_email: string | null;
  atendente_resgate_id: string | null;
  atendente_resgate_nome: string | null;
  loja_visita_nome: string | null;
};

type Agendamento = {
  id: string;
  lead_id: string | null;
  usuario_id: string | null;
  inicio: string | null;
  data_agendamento: string | null;
  status: string | null;
  compareceu: boolean | null;
  vendedor_nome: string | null;
  vendedor_email: string | null;
  loja: string | null;
  loja_visita_nome: string | null;
  veiculo_interesse: string | null;
  atendente_resgate_id: string | null;
  atendente_resgate_nome: string | null;
  confirmacao_status: string | null;
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function normalizarBusca(valor: unknown) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function somaDias(data: string, dias: number) {
  const base = new Date(`${data}T12:00:00`);
  base.setDate(base.getDate() + dias);
  return base.toISOString();
}

function scoreAgendamento({
  vendaCliente,
  vendaVeiculo,
  vendaData,
  lead,
  agendamento,
}: {
  vendaCliente: string;
  vendaVeiculo: string;
  vendaData: string | null;
  lead: Lead | null;
  agendamento: Agendamento;
}) {
  let score = 0;

  const clienteVenda = normalizarBusca(vendaCliente);
  const clienteLead = normalizarBusca(lead?.nome);

  if (clienteVenda && clienteLead) {
    if (clienteLead === clienteVenda) score += 50;
    else if (
      clienteLead.includes(clienteVenda) ||
      clienteVenda.includes(clienteLead)
    )
      score += 35;
  }

  const veiculoVenda = normalizarBusca(vendaVeiculo);
  const veiculoLead = normalizarBusca(
    lead?.veiculo_interesse || agendamento.veiculo_interesse,
  );

  if (veiculoVenda && veiculoLead) {
    const palavrasVenda = veiculoVenda
      .split(/\s+/)
      .filter((p) => p.length >= 3);
    const acertos = palavrasVenda.filter((p) => veiculoLead.includes(p)).length;
    score += Math.min(acertos * 8, 32);
  }

  if (agendamento.compareceu === true) score += 30;
  if (agendamento.confirmacao_status === "confirmado") score += 15;
  if (agendamento.atendente_resgate_id || lead?.atendente_resgate_id)
    score += 10;

  if (vendaData) {
    const dataVenda = new Date(`${vendaData}T12:00:00`).getTime();
    const dataAgendamento = new Date(
      agendamento.data_agendamento || agendamento.inicio || "",
    ).getTime();

    if (Number.isFinite(dataVenda) && Number.isFinite(dataAgendamento)) {
      const diffDias = Math.abs(dataVenda - dataAgendamento) / 86400000;

      if (diffDias <= 7) score += 20;
      else if (diffDias <= 30) score += 10;
      else if (diffDias <= 90) score += 5;
    }
  }

  return score;
}

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const vendaId = texto(searchParams.get("venda_id"));
    const buscaManual = texto(searchParams.get("busca"));

    if (!vendaId && !buscaManual) {
      return NextResponse.json(
        { ok: false, erro: "Informe venda_id ou busca." },
        { status: 400 },
      );
    }

    let venda: {
      id: string;
      cliente: string | null;
      veiculo: string | null;
      data_venda: string | null;
      loja: string | null;
    } | null = null;

    if (vendaId) {
      const { data, error } = await supabase
        .from("vendas_acompanhamento")
        .select("id, cliente, veiculo, data_venda, loja")
        .eq("id", vendaId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      venda = data;
    }

    const clienteBusca = buscaManual || venda?.cliente || "";
    const veiculoBusca = venda?.veiculo || "";

    let leadsQuery = supabase
      .from("leads")
      .select(
        "id, nome, telefone, telefone_normalizado, veiculo_interesse, vendedor_nome, vendedor_email, atendente_resgate_id, atendente_resgate_nome, loja_visita_nome",
      )
      .limit(30);

    if (clienteBusca) {
      leadsQuery = leadsQuery.or(
        [
          `nome.ilike.%${clienteBusca}%`,
          `telefone.ilike.%${clienteBusca}%`,
          `telefone_normalizado.ilike.%${clienteBusca}%`,
          `veiculo_interesse.ilike.%${clienteBusca}%`,
        ].join(","),
      );
    } else if (veiculoBusca) {
      leadsQuery = leadsQuery.ilike("veiculo_interesse", `%${veiculoBusca}%`);
    }

    const { data: leadsData, error: leadsError } = await leadsQuery;

    if (leadsError) throw new Error(leadsError.message);

    const leads = (leadsData || []) as Lead[];
    const leadIds = leads.map((lead) => lead.id);

    let agendamentos: Agendamento[] = [];

    if (leadIds.length > 0) {
      let query = supabase
        .from("lead_agendamentos")
        .select(
          "id, lead_id, usuario_id, inicio, data_agendamento, status, compareceu, vendedor_nome, vendedor_email, loja, loja_visita_nome, veiculo_interesse, atendente_resgate_id, atendente_resgate_nome, confirmacao_status",
        )
        .in("lead_id", leadIds)
        .order("data_agendamento", { ascending: false })
        .limit(50);

      if (venda?.data_venda) {
        query = query
          .gte("data_agendamento", somaDias(venda.data_venda, -120))
          .lte("data_agendamento", somaDias(venda.data_venda, 30));
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      agendamentos = (data || []) as Agendamento[];
    }

    const leadsPorId = new Map(leads.map((lead) => [lead.id, lead]));

    const resultados = agendamentos
      .map((agendamento) => {
        const lead = agendamento.lead_id
          ? leadsPorId.get(agendamento.lead_id) || null
          : null;

        const operadorId =
          agendamento.atendente_resgate_id ||
          lead?.atendente_resgate_id ||
          null;

        const operadorNome =
          agendamento.atendente_resgate_nome ||
          lead?.atendente_resgate_nome ||
          "Operador não identificado";

        return {
          id: agendamento.id,
          lead_id: agendamento.lead_id,
          lead_nome: lead?.nome || "Lead sem nome",
          lead_telefone: lead?.telefone || lead?.telefone_normalizado || "",
          veiculo_interesse:
            agendamento.veiculo_interesse || lead?.veiculo_interesse || "",
          data_agendamento:
            agendamento.data_agendamento || agendamento.inicio || null,
          compareceu: agendamento.compareceu,
          status: agendamento.status,
          confirmacao_status: agendamento.confirmacao_status,
          vendedor_nome: agendamento.vendedor_nome || lead?.vendedor_nome || "",
          vendedor_email:
            agendamento.vendedor_email || lead?.vendedor_email || "",
          loja:
            agendamento.loja_visita_nome ||
            agendamento.loja ||
            lead?.loja_visita_nome ||
            "",
          operador_id: operadorId,
          operador_nome: operadorNome,
          score: scoreAgendamento({
            vendaCliente: venda?.cliente || clienteBusca,
            vendaVeiculo: venda?.veiculo || veiculoBusca,
            vendaData: venda?.data_venda || null,
            lead,
            agendamento,
          }),
        };
      })
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      ok: true,
      venda,
      resultados,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao buscar agendamentos.",
      },
      { status: 500 },
    );
  }
}
