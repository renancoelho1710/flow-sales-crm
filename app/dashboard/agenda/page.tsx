import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AgendaCalendarioClient,
  type AgendaItem,
  type AgendaVisao,
} from "./AgendaCalendarioClient";

type Agendamento = {
  id: string;
  lead_id: string;
  usuario_id: string | null;
  criado_por: string | null;
  titulo: string;
  tipo: string;
  inicio: string;
  fim: string | null;
  status: string;
  observacao: string | null;
  veiculo_interesse: string | null;
  origem: string | null;
  c2s_sync_status: string | null;
  vendedor_c2s_nome: string | null;
  loja_carteira_c2s_nome: string | null;
  loja_visita_nome: string | null;
  atendente_resgate_nome: string | null;
};

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  telefone_normalizado: string | null;
  email: string | null;
  origem: string | null;
  etapa: string | null;
  temperatura: string | null;
  veiculo_interesse: string | null;
  vendedor_c2s_nome: string | null;
  loja_carteira_c2s_nome: string | null;
  loja_visita_nome: string | null;
  atendente_resgate_nome: string | null;
};

type PageProps = {
  searchParams: Promise<{
    periodo?: string | string[];
  }>;
};

function normalizarTelefone(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarVisao(valor?: string | string[]): AgendaVisao {
  const recebido = Array.isArray(valor) ? valor[0] : valor;
  return recebido === "semana" || recebido === "mes" || recebido === "ano"
    ? recebido
    : "mes";
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const visaoInicial = normalizarVisao(params.periodo);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuarioInterno) {
    redirect("/login");
  }

  const { data: agendamentosData, error: agendamentosError } = await supabase
    .from("lead_agendamentos")
    .select(
      `
      id,
      lead_id,
      usuario_id,
      criado_por,
      titulo,
      tipo,
      inicio,
      fim,
      status,
      observacao,
      veiculo_interesse,
      origem,
      c2s_sync_status,
      vendedor_c2s_nome,
      loja_carteira_c2s_nome,
      loja_visita_nome,
      atendente_resgate_nome
      `,
    )
    .order("inicio", { ascending: true })
    .limit(700);

  if (agendamentosError) {
    console.error("Erro ao buscar agenda:", agendamentosError);
  }

  const agendamentos = (agendamentosData || []) as Agendamento[];
  const leadIds = Array.from(
    new Set(agendamentos.map((item) => item.lead_id).filter(Boolean)),
  );

  const { data: leadsData } = leadIds.length
    ? await supabase
        .from("leads")
        .select(
          `
          id,
          nome,
          telefone,
          telefone_normalizado,
          email,
          origem,
          etapa,
          temperatura,
          veiculo_interesse,
          vendedor_c2s_nome,
          loja_carteira_c2s_nome,
          loja_visita_nome,
          atendente_resgate_nome
          `,
        )
        .in("id", leadIds)
    : { data: [] as Lead[] };

  const leadsPorId = new Map<string, Lead>();
  for (const lead of leadsData || []) {
    leadsPorId.set(lead.id, lead as Lead);
  }

  const itens: AgendaItem[] = agendamentos.map((agendamento) => {
    const lead = leadsPorId.get(agendamento.lead_id);
    return {
      id: agendamento.id,
      leadId: agendamento.lead_id,
      titulo: agendamento.titulo || lead?.nome || "Agendamento",
      cliente: lead?.nome || "Lead não localizado",
      telefone: lead?.telefone || "",
      whatsapp: normalizarTelefone(
        lead?.telefone_normalizado || lead?.telefone,
      ),
      tipo: agendamento.tipo || "agendamento",
      inicio: agendamento.inicio,
      fim: agendamento.fim,
      status: agendamento.status || "agendado",
      observacao: agendamento.observacao || "",
      veiculo: lead?.veiculo_interesse || agendamento.veiculo_interesse || "",
      vendedorC2S:
        agendamento.vendedor_c2s_nome || lead?.vendedor_c2s_nome || "",
      lojaCarteira:
        agendamento.loja_carteira_c2s_nome ||
        lead?.loja_carteira_c2s_nome ||
        "",
      lojaVisita:
        agendamento.loja_visita_nome || lead?.loja_visita_nome || "",
      atendenteResgate:
        agendamento.atendente_resgate_nome ||
        lead?.atendente_resgate_nome ||
        "",
      c2sSyncStatus: agendamento.c2s_sync_status || "pendente",
      origem: agendamento.origem || lead?.origem || "",
      etapa: lead?.etapa || "",
      temperatura: lead?.temperatura || "",
    };
  });

  return (
    <AgendaCalendarioClient
      usuario={usuarioInterno}
      itens={itens}
      visaoInicial={visaoInicial}
    />
  );
}
