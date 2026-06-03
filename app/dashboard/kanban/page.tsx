import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KanbanClient } from "./KanbanClient";

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
};

type InteracaoResumo = {
  lead_id: string;
  tipo: string;
  canal: string;
  resultado: string | null;
  observacao: string | null;
  criado_em: string;
};

export default async function Page() {
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

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, nome, telefone, telefone_normalizado, email, origem, campanha, status, etapa, temperatura, veiculo_interesse, observacao, data_primeiro_contato, data_ultimo_contato, data_proxima_acao, arquivado, venda_pendente_validacao, venda_validada, criado_em, atualizado_em"
    )
    .eq("arquivado", false)
    .order("atualizado_em", { ascending: false })
    .limit(240);

  const lista = (leads || []) as Lead[];
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

  return (
    <DashboardShell usuario={usuarioInterno} activeTab="kanban-funil">
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
        usuarioPerfil={usuarioInterno.perfil}
      />
    </DashboardShell>
  );
}
