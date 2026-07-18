import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function periodoPorHora(data: Date) {
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

async function getUsuario() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false };
  return { supabase, ok: true };
}

export async function GET(request: Request) {
  try {
    const { supabase, ok } = await getUsuario();
    if (!ok) return NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 });

    const url = new URL(request.url);
    const vendedorId = String(url.searchParams.get("vendedor_id") || "").trim();
    const data = String(url.searchParams.get("data") || "").trim();

    if (!vendedorId || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return NextResponse.json({ ok: false, erro: "Informe vendedor_id e data no formato YYYY-MM-DD." }, { status: 400 });
    }

    const { inicio, fim } = inicioFimData(data);
    const diaSemana = inicio.getDay();

    const [vendedorResp, capacidadeResp, bloqueiosResp, agendamentosResp] = await Promise.all([
      supabase
        .from("vendedores_comerciais")
        .select("id, nome, loja, ativo, recebe_agendamento, situacao_operacional")
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

    if (vendedorResp.error) throw vendedorResp.error;
    if (capacidadeResp.error) throw capacidadeResp.error;
    if (bloqueiosResp.error) throw bloqueiosResp.error;
    if (agendamentosResp.error) throw agendamentosResp.error;

    const vendedor = vendedorResp.data as {
  id: string;
  nome: string;
  loja: string | null;
  ativo: boolean;
  recebe_agendamento: boolean;
  situacao_operacional: string | null;
} | null;

if (!vendedor) {
  return NextResponse.json(
    { ok: false, erro: "Vendedor não encontrado." },
    { status: 404 }
  );
}

const vendedorSeguro = vendedor;

    type PeriodoAgenda = "manha" | "tarde" | "noite";

type CapacidadeVendedor = {
  dia_semana: number;
  manha_ativo: boolean;
  tarde_ativo: boolean;
  noite_ativo: boolean;
  capacidade_manha: number;
  capacidade_tarde: number;
  capacidade_noite: number;
};

const capacidade = (capacidadeResp.data || {
  dia_semana: diaSemana,
  manha_ativo: diaSemana !== 0,
  tarde_ativo: diaSemana !== 0 && diaSemana !== 6,
  noite_ativo: false,
  capacidade_manha: diaSemana === 0 ? 0 : diaSemana === 6 ? 2 : 3,
  capacidade_tarde: diaSemana === 0 || diaSemana === 6 ? 0 : 4,
  capacidade_noite: 0,
}) as CapacidadeVendedor;

    const contagem = { manha: 0, tarde: 0, noite: 0 };
    for (const item of agendamentosResp.data || []) {
  const periodoCalculado = item.periodo_agendamento || periodoPorHora(new Date(item.inicio));

  if (
    periodoCalculado === "manha" ||
    periodoCalculado === "tarde" ||
    periodoCalculado === "noite"
  ) {
    const periodo = periodoCalculado as keyof typeof contagem;
    contagem[periodo]++;
  }
}

    const bloqueios = bloqueiosResp.data || [];

    function montar(periodo: PeriodoAgenda) {
  const ativoKey = `${periodo}_ativo` as keyof Pick<
    CapacidadeVendedor,
    "manha_ativo" | "tarde_ativo" | "noite_ativo"
  >;

  const capKey = `capacidade_${periodo}` as keyof Pick<
    CapacidadeVendedor,
    "capacidade_manha" | "capacidade_tarde" | "capacidade_noite"
  >;

  const bloqueado = bloqueios.find(
    (item) => item.periodo === "dia" || item.periodo === periodo
  );

  const ativoPeriodo = Boolean(capacidade[ativoKey]);
  const limite = Number(capacidade[capKey] || 0);
  const usado = contagem[periodo];

  const operacionalOk =
  Boolean(vendedorSeguro.ativo) &&
  Boolean(vendedorSeguro.recebe_agendamento) &&
  vendedorSeguro.situacao_operacional === "ativo";

  const disponivel =
    operacionalOk && ativoPeriodo && !bloqueado && limite > 0 && usado < limite;

  return {
    periodo,
    ativo: ativoPeriodo,
    limite,
    usado,
    livre: Math.max(0, limite - usado),
    cheio: limite > 0 && usado >= limite,
    bloqueado: Boolean(bloqueado),
    motivo_bloqueio: bloqueado?.motivo || bloqueado?.tipo || null,
    disponivel,
  };
}

    return NextResponse.json({
      ok: true,
      vendedor: vendedorSeguro,
      data,
      bloqueios,
      periodos: {
        manha: montar("manha"),
        tarde: montar("tarde"),
        noite: montar("noite"),
      },
    });
  } catch (error) {
    console.error("Erro ao consultar disponibilidade:", error);
    return NextResponse.json({ ok: false, erro: "Não foi possível consultar disponibilidade." }, { status: 500 });
  }
}
