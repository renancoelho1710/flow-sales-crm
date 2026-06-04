import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KanbanClient } from "./KanbanClient";

type PageProps = {
  searchParams?: Promise<{
    visao?: string;
    filtro?: string;
    busca?: string;
    temperatura?: string;
  }>;
};

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  telefone_normalizado: string;
  email: string | null;
  origem: string | null;
  campanha: string | null;
  status: string;
  etapa: string;
  temperatura: string;
  veiculo_interesse: string | null;
  observacao: string | null;
  data_primeiro_contato: string | null;
  data_ultimo_contato: string | null;
  data_proxima_acao: string | null;
  arquivado: boolean;
  venda_pendente_validacao: boolean;
  venda_validada: boolean;
  criado_em: string;
  atualizado_em: string;
  responsavel_id?: string | null;
  atendente_resgate_id?: string | null;
  vendedor_c2s_id?: string | null;
  vendedor_c2s_nome?: string | null;
  loja_carteira_c2s_id?: string | null;
  loja_carteira_c2s_nome?: string | null;
};

type InteracaoResumo = {
  lead_id: string;
  tipo: string;
  canal: string;
  resultado: string | null;
  observacao: string | null;
  criado_em: string;
};

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function isGestao(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente", "supervisor"].includes(normalizarPerfil(perfil));
}

function nomeVisao(visao: string, filtro: string) {
  if (filtro === "vendas-pendentes") return "Vendas pendentes";
  if (visao === "minhas") return "Minhas oportunidades";
  return "Funil completo";
}

function descricaoVisao(visao: string, filtro: string) {
  if (filtro === "vendas-pendentes") {
    return "Oportunidades com venda pendente de validação, revisão comercial ou fechamento.";
  }

  if (visao === "minhas") {
    return "Oportunidades vinculadas ao usuário logado para atendimento, retorno e avanço no funil.";
  }

  return "Visão geral das oportunidades ativas no funil operacional.";
}

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) || {};
  const visao = String(params.visao || "completo").trim().toLowerCase();
  const filtro = String(params.filtro || "").trim().toLowerCase();
  const busca = String(params.busca || "").trim();
  const temperatura = String(params.temperatura || "todas").trim().toLowerCase();

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

  const perfilGestao = isGestao(usuarioInterno.perfil);
  const somenteMinhas = visao === "minhas" || !perfilGestao;

  const { data: funilPadrao } = await supabase
    .from("kanban_funis")
    .select("id, nome, descricao, escopo, padrao")
    .eq("ativo", true)
    .eq("padrao", true)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: colunasBanco } = funilPadrao?.id
    ? await supabase
        .from("kanban_colunas")
        .select(
          "id, funil_id, chave, titulo, subtitulo, descricao, cor, ordem, ativa, exige_confirmacao, exige_observacao, exige_proxima_acao, etapa_venda, etapa_final, bloqueada_operador"
        )
        .eq("funil_id", funilPadrao.id)
        .eq("ativa", true)
        .order("ordem", { ascending: true })
    : { data: [] };

  let query = supabase
    .from("leads")
    .select(
      "id, nome, telefone, telefone_normalizado, email, origem, campanha, status, etapa, temperatura, veiculo_interesse, observacao, data_primeiro_contato, data_ultimo_contato, data_proxima_acao, arquivado, venda_pendente_validacao, venda_validada, criado_em, atualizado_em, responsavel_id, atendente_resgate_id, vendedor_c2s_id, vendedor_c2s_nome, loja_carteira_c2s_id, loja_carteira_c2s_nome"
    )
    .eq("arquivado", false)
    .order("data_proxima_acao", { ascending: true, nullsFirst: false })
    .order("atualizado_em", { ascending: false })
    .limit(260);

  if (somenteMinhas) {
    query = query.or(`responsavel_id.eq.${usuarioInterno.id},atendente_resgate_id.eq.${usuarioInterno.id}`);
  }

  if (filtro === "vendas-pendentes") {
    query = query.eq("venda_pendente_validacao", true);
  }

  if (busca) {
    query = query.or(
      `nome.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%,veiculo_interesse.ilike.%${busca}%,vendedor_c2s_nome.ilike.%${busca}%,loja_carteira_c2s_nome.ilike.%${busca}%`
    );
  }

  if (temperatura !== "todas") {
    query = query.eq("temperatura", temperatura);
  }

  const { data: leads, error: leadsError } = await query;

  if (leadsError) {
    console.error("Erro ao carregar Kanban:", leadsError);
  }

  const lista = ((leads || []) as Lead[]).map((lead) => ({
    ...lead,
    telefone_normalizado: lead.telefone_normalizado || "",
    status: lead.status || "ativo",
    etapa: lead.etapa || "novo",
    temperatura: lead.temperatura || "morno",
  }));

  const ids = lista.map((lead) => lead.id);

  const { data: interacoesRecentes } = ids.length
    ? await supabase
        .from("lead_interacoes")
        .select("lead_id, tipo, canal, resultado, observacao, criado_em")
        .in("lead_id", ids)
        .order("criado_em", { ascending: false })
    : { data: [] as InteracaoResumo[] };

  const ultimasPorLead: Record<string, InteracaoResumo> = {};

  for (const interacao of interacoesRecentes || []) {
    if (!ultimasPorLead[interacao.lead_id]) {
      ultimasPorLead[interacao.lead_id] = interacao as InteracaoResumo;
    }
  }

  const funilBase =
    funilPadrao ||
    ({
      id: "fallback",
      nome: "Funil padrão Flow Sales",
      descricao: "Funil operacional padrão.",
      escopo: "global",
      padrao: true,
    } as const);

  
  return (
    <KanbanClient
  leadsIniciais={lista}
  ultimasPorLead={ultimasPorLead}
  colunasIniciais={colunasBanco || []}
  funilAtual={
    funilPadrao || {
      id: "fallback",
      nome: "Funil padrão Flow Sales",
      descricao: "Funil operacional padrão.",
      escopo: "global",
      padrao: true,
    }
  }
  usuario={usuarioInterno}
  visaoInicial={
    filtro === "vendas-pendentes"
      ? "vendas"
      : visao === "minhas"
        ? "minhas"
        : "funil"
  }
/>
  );
}
