"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  MessageSquareText,
  Phone,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { AtendimentoHeader } from "@/components/atendimento/AtendimentoHeader";

type Usuario = {
  id: string;
  nome: string;
  email?: string;
  perfil: string;
  ativo?: boolean;
};

type SolicitacaoLead = {
  id: string;
  nome_indicado: string;
  telefone_indicado: string;
  telefone_indicado_normalizado: string;
  email_indicado: string | null;
  nome_indicador: string | null;
  telefone_indicador: string | null;
  telefone_indicador_normalizado: string | null;
  veiculo_interesse: string | null;
  observacao_atendente: string | null;
  origem_c2s: string | null;
  campanha: string | null;
  tags: string[] | null;
  fila_vendedor: string | null;
  responsavel_id: string | null;
  observacao_supervisor: string | null;
  status: string;
  motivo_rejeicao: string | null;
  c2s_id: string | null;
  c2s_internal_id: number | null;
  erro_c2s: string | null;
  solicitado_em: string;
};

type Props = {
  usuario: Usuario;
  podeAnalisar: boolean;
  solicitacoes: SolicitacaoLead[];
  erroInicial: string;
};

type FormState = {
  origem_c2s: string;
  campanha: string;
  tags: string;
  fila_vendedor: string;
  observacao_supervisor: string;
  motivo_rejeicao: string;
};

function formatarData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function normalizarStatus(status: string) {
  const mapa: Record<string, string> = {
    pendente: "Pendente",
    em_analise: "Em análise",
    rejeitado: "Rejeitado",
    aprovado: "Aprovado",
    criado_c2s: "Criado no C2S",
    erro_c2s: "Erro C2S",
  };

  return mapa[status] || status;
}

function corStatus(status: string) {
  if (status === "pendente") return "border-amber-100 bg-amber-50 text-amber-700";
  if (status === "em_analise") return "border-blue-100 bg-blue-50 text-blue-700";
  if (status === "rejeitado") return "border-red-100 bg-red-50 text-red-700";
  if (status === "criado_c2s") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "erro_c2s") return "border-red-100 bg-red-50 text-red-700";

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function SolicitacoesLeadsClient({
  usuario,
  podeAnalisar,
  solicitacoes,
  erroInicial,
}: Props) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("pendente");
  const [lista, setLista] = useState(solicitacoes);
  const [forms, setForms] = useState<Record<string, FormState>>(() => {
    const inicial: Record<string, FormState> = {};

    for (const item of solicitacoes) {
      inicial[item.id] = {
        origem_c2s: item.origem_c2s || "Indicação por ligação",
        campanha: item.campanha || "Indicação",
        tags: item.tags?.join(", ") || "indicação, ligação",
        fila_vendedor: item.fila_vendedor || "",
        observacao_supervisor: item.observacao_supervisor || "",
        motivo_rejeicao: item.motivo_rejeicao || "",
      };
    }

    return inicial;
  });
  const [loadingId, setLoadingId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(erroInicial);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return lista.filter((item) => {
      const bateStatus = statusFiltro === "todos" || item.status === statusFiltro;
      const texto = [
        item.nome_indicado,
        item.telefone_indicado,
        item.email_indicado,
        item.nome_indicador,
        item.telefone_indicador,
        item.veiculo_interesse,
        item.observacao_atendente,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return bateStatus && (!termo || texto.includes(termo));
    });
  }, [busca, lista, statusFiltro]);

  function atualizar(id: string, campo: keyof FormState, valor: string) {
    setForms((atual) => ({
      ...atual,
      [id]: {
        ...(atual[id] || {
          origem_c2s: "",
          campanha: "",
          tags: "",
          fila_vendedor: "",
          observacao_supervisor: "",
          motivo_rejeicao: "",
        }),
        [campo]: valor,
      },
    }));
  }

  async function salvar(id: string, acao: "salvar" | "rejeitar" | "criar_c2s") {
    setLoadingId(id);
    setMensagem("");
    setErro("");

    try {
      const resposta = await fetch(`/api/leads/solicitacoes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao,
          ...(forms[id] || {}),
        }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível atualizar a solicitação.");
      }

      setLista((atual) =>
        atual.map((item) =>
          item.id === id
            ? {
                ...item,
                ...(dados.solicitacao || {}),
              }
            : item
        )
      );

      if (acao === "rejeitar") {
        setMensagem("Solicitação rejeitada.");
      } else if (acao === "criar_c2s") {
        setMensagem("Lead criado no C2S e salvo no Flow.");
      } else {
        setMensagem("Dados da supervisão salvos.");
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar a solicitação.");
    } finally {
      setLoadingId("");
    }
  }

  const pendentes = lista.filter((item) => item.status === "pendente").length;
  const emAnalise = lista.filter((item) => item.status === "em_analise").length;
  const criados = lista.filter((item) => item.status === "criado_c2s").length;
  const comErro = lista.filter((item) => item.status === "erro_c2s").length;

  return (
    <main className="flow-premium-page fs-attention-page">
      <div className="mx-auto max-w-[1540px] space-y-4">
        <AtendimentoHeader
          active="solicitacoes"
          title="Aprovar solicitações"
          description="Revise apenas o necessário, complete os dados comerciais e crie o lead no C2S com segurança."
          canManage
          primaryAction={{ href: "/dashboard/leads/novo", label: "Nova indicação" }}
          secondaryAction={{ href: "/dashboard/leads", label: "Abrir fila" }}
          aside={
            <div className="fs-attention-operator-chip">
              <span>{usuario.nome.trim().charAt(0).toUpperCase() || "U"}</span>
              <div><strong>{usuario.nome}</strong><small>{usuario.perfil}</small></div>
            </div>
          }
        />

        {!podeAnalisar ? (
          <div className="fs-attention-alert is-error"><AlertCircle className="h-5 w-5" /> Você não tem permissão para analisar solicitações.</div>
        ) : null}
        {mensagem ? <div className="fs-attention-alert is-success"><CheckCircle2 className="h-5 w-5" /> {mensagem}</div> : null}
        {erro ? <div className="fs-attention-alert is-error"><AlertCircle className="h-5 w-5" /> {erro}</div> : null}

        <section className="fs-attention-metrics fs-attention-metrics--four">
          <button type="button" onClick={() => setStatusFiltro("pendente")} className="fs-attention-metric is-orange">
            <span className="fs-attention-metric__icon"><Clock3 className="h-[18px] w-[18px]" /></span><span className="fs-attention-metric__label">Pendentes</span><strong>{pendentes}</strong><small>Aguardam análise</small>
          </button>
          <button type="button" onClick={() => setStatusFiltro("em_analise")} className="fs-attention-metric is-blue">
            <span className="fs-attention-metric__icon"><FileCheck2 className="h-[18px] w-[18px]" /></span><span className="fs-attention-metric__label">Em análise</span><strong>{emAnalise}</strong><small>Em preenchimento</small>
          </button>
          <button type="button" onClick={() => setStatusFiltro("criado_c2s")} className="fs-attention-metric is-green">
            <span className="fs-attention-metric__icon"><CheckCircle2 className="h-[18px] w-[18px]" /></span><span className="fs-attention-metric__label">Criados no C2S</span><strong>{criados}</strong><small>Processo concluído</small>
          </button>
          <button type="button" onClick={() => setStatusFiltro("erro_c2s")} className="fs-attention-metric is-red">
            <span className="fs-attention-metric__icon"><AlertCircle className="h-[18px] w-[18px]" /></span><span className="fs-attention-metric__label">Com erro</span><strong>{comErro}</strong><small>Precisam de revisão</small>
          </button>
        </section>

        <section className="fs-attention-toolbar-card">
          <div className="fs-conversation-toolbar">
            <div className="fs-attention-segmented">
              {[
                ["pendente", "Pendentes"],
                ["em_analise", "Em análise"],
                ["criado_c2s", "Criados"],
                ["rejeitado", "Rejeitados"],
                ["todos", "Todos"],
              ].map(([key, label]) => <button key={key} type="button" onClick={() => setStatusFiltro(key)} className={statusFiltro === key ? "is-active" : ""}>{label}</button>)}
            </div>
            <label className="fs-attention-inline-search"><Search className="h-4 w-4" /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome, telefone ou veículo" /></label>
          </div>
        </section>

        <section className="fs-request-stack">
          {filtradas.length === 0 ? (
            <div className="fs-attention-empty"><span><FileCheck2 className="h-7 w-7" /></span><h3>Nenhuma solicitação neste filtro</h3><p>As novas indicações aparecerão aqui para conferência.</p></div>
          ) : filtradas.map((item) => {
            const form = forms[item.id] || { origem_c2s: "", campanha: "", tags: "", fila_vendedor: "", observacao_supervisor: "", motivo_rejeicao: "" };
            const jaCriado = item.status === "criado_c2s";
            const rejeitado = item.status === "rejeitado";
            return (
              <details key={item.id} className="fs-request-card" open={item.status === "pendente"}>
                <summary>
                  <span className="fs-request-card__avatar">{item.nome_indicado.trim().charAt(0).toUpperCase() || "C"}</span>
                  <span className="fs-request-card__identity"><strong>{item.nome_indicado}</strong><small><Phone className="h-3.5 w-3.5" /> {item.telefone_indicado} · {formatarData(item.solicitado_em)}</small></span>
                  <span className={`fs-request-card__status ${corStatus(item.status)}`}>{normalizarStatus(item.status)}</span>
                  <span className="fs-request-card__vehicle">{item.veiculo_interesse || "Veículo não informado"}</span>
                </summary>

                <div className="fs-request-card__body">
                  <div className="fs-request-context">
                    <div><UserRound className="h-5 w-5" /><span><strong>Quem indicou</strong><small>{item.nome_indicador || "Não informado"} · {item.telefone_indicador || "Sem telefone"}</small></span></div>
                    <div><MessageSquareText className="h-5 w-5" /><span><strong>Resumo do atendimento</strong><small>{item.observacao_atendente || "Sem observação."}</small></span></div>
                    {item.erro_c2s ? <div className="is-error"><AlertCircle className="h-5 w-5" /><span><strong>Erro C2S</strong><small>{item.erro_c2s}</small></span></div> : null}
                  </div>

                  <div className="fs-request-form">
                    <div className="fs-form-grid fs-form-grid--two">
                      <label className="fs-premium-field"><span>Origem/Fonte C2S</span><div><input value={form.origem_c2s} onChange={(event) => atualizar(item.id, "origem_c2s", event.target.value)} disabled={!podeAnalisar || jaCriado} placeholder="Ex.: Indicação por ligação" /></div></label>
                      <label className="fs-premium-field"><span>Campanha</span><div><input value={form.campanha} onChange={(event) => atualizar(item.id, "campanha", event.target.value)} disabled={!podeAnalisar || jaCriado} placeholder="Ex.: Indicação" /></div></label>
                      <label className="fs-premium-field"><span>Tags</span><div><input value={form.tags} onChange={(event) => atualizar(item.id, "tags", event.target.value)} disabled={!podeAnalisar || jaCriado} placeholder="indicação, ligação" /></div></label>
                      <label className="fs-premium-field"><span>Fila ou vendedor</span><div><input value={form.fila_vendedor} onChange={(event) => atualizar(item.id, "fila_vendedor", event.target.value)} disabled={!podeAnalisar || jaCriado} placeholder="Fila da vez ou vendedor" /></div></label>
                    </div>
                    <label className="fs-premium-field fs-premium-field--textarea"><span>Observação da supervisão</span><div><textarea value={form.observacao_supervisor} onChange={(event) => atualizar(item.id, "observacao_supervisor", event.target.value)} disabled={!podeAnalisar || jaCriado} rows={3} placeholder="Complemente somente o necessário." /></div></label>
                    <label className="fs-premium-field"><span>Motivo da rejeição</span><div><input value={form.motivo_rejeicao} onChange={(event) => atualizar(item.id, "motivo_rejeicao", event.target.value)} disabled={!podeAnalisar || jaCriado} placeholder="Preencha apenas ao rejeitar" /></div></label>

                    <div className="fs-request-actions">
                      <button type="button" disabled={!podeAnalisar || loadingId === item.id || jaCriado || rejeitado} onClick={() => salvar(item.id, "salvar")} className="is-secondary">{loadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar análise</button>
                      <button type="button" disabled={!podeAnalisar || loadingId === item.id || jaCriado || rejeitado} onClick={() => salvar(item.id, "rejeitar")} className="is-danger"><XCircle className="h-4 w-4" /> Rejeitar</button>
                      <button type="button" disabled={!podeAnalisar || loadingId === item.id || jaCriado || rejeitado} onClick={() => salvar(item.id, "criar_c2s")} className="is-primary">{loadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Criar no C2S</button>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      </div>
    </main>
  );
}
