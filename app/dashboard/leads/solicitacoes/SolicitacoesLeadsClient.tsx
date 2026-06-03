"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
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

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/dashboard/leads"
            className="mb-5 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para leads
          </Link>

          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                Supervisão de leads
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                Solicitações de novos leads
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Revise as indicações enviadas pelos atendentes, complete os dados necessários e crie oficialmente no C2S.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700">
              Logado como: {usuario.nome} • {usuario.perfil}
            </div>
          </div>
        </div>

        {!podeAnalisar ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
            Você não tem permissão para analisar solicitações. Apenas supervisão/ADM pode completar e aprovar novos leads.
          </div>
        ) : null}

        {mensagem ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            {mensagem}
          </div>
        ) : null}

        {erro ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle className="h-5 w-5" />
            {erro}
          </div>
        ) : null}

        <section className="mb-5 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_240px]">
          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
              <Search className="h-4 w-4" />
              Buscar solicitação
            </span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nome, telefone, indicador, veículo ou observação"
              className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Status</span>
            <select
              value={statusFiltro}
              onChange={(event) => setStatusFiltro(event.target.value)}
              className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="pendente">Pendentes</option>
              <option value="em_analise">Em análise</option>
              <option value="rejeitado">Rejeitadas</option>
              <option value="criado_c2s">Criadas no C2S</option>
              <option value="erro_c2s">Erro C2S</option>
              <option value="todos">Todas</option>
            </select>
          </label>
        </section>

        <section className="grid gap-4">
          {filtradas.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <FileCheck2 className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950">Nenhuma solicitação encontrada</h3>
                <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
                  Quando o atendente solicitar um novo lead por indicação, ele aparecerá aqui.
                </p>
              </div>
            </div>
          ) : (
            filtradas.map((item) => {
              const form = forms[item.id] || {
                origem_c2s: "",
                campanha: "",
                tags: "",
                fila_vendedor: "",
                observacao_supervisor: "",
                motivo_rejeicao: "",
              };

              const jaCriado = item.status === "criado_c2s";
              const rejeitado = item.status === "rejeitado";

              return (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 xl:flex-row xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-950">{item.nome_indicado}</h2>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${corStatus(item.status)}`}>
                          {normalizarStatus(item.status)}
                        </span>
                        {item.c2s_id ? (
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            C2S: {item.c2s_id.slice(0, 10)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {item.telefone_indicado}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatarData(item.solicitado_em)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                      {jaCriado ? "Lead já criado oficialmente" : "Indicação enviada para análise"}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                          <UserRound className="h-4 w-4 text-blue-700" />
                          Dados enviados pelo atendente
                        </p>

                        <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                          <p><strong className="text-slate-900">E-mail:</strong> {item.email_indicado || "Não informado"}</p>
                          <p><strong className="text-slate-900">Indicador:</strong> {item.nome_indicador || "Não informado"}</p>
                          <p><strong className="text-slate-900">Telefone indicador:</strong> {item.telefone_indicador || "Não informado"}</p>
                          <p><strong className="text-slate-900">Veículo:</strong> {item.veiculo_interesse || "Não informado"}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                          <MessageSquareText className="h-4 w-4 text-blue-700" />
                          Observação da ligação
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
                          {item.observacao_atendente || "Sem observação."}
                        </p>
                      </div>

                      {item.erro_c2s ? (
                        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                          Erro C2S: {item.erro_c2s}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-black text-slate-800">Origem/Fonte C2S</span>
                          <input
                            value={form.origem_c2s}
                            onChange={(event) => atualizar(item.id, "origem_c2s", event.target.value)}
                            disabled={!podeAnalisar || jaCriado}
                            placeholder="Ex: Indicação por ligação"
                            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-black text-slate-800">Campanha</span>
                          <input
                            value={form.campanha}
                            onChange={(event) => atualizar(item.id, "campanha", event.target.value)}
                            disabled={!podeAnalisar || jaCriado}
                            placeholder="Ex: Indicação"
                            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-black text-slate-800">Tags</span>
                          <input
                            value={form.tags}
                            onChange={(event) => atualizar(item.id, "tags", event.target.value)}
                            disabled={!podeAnalisar || jaCriado}
                            placeholder="Ex: indicação, ligação"
                            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-black text-slate-800">Fila/vendedor</span>
                          <input
                            value={form.fila_vendedor}
                            onChange={(event) => atualizar(item.id, "fila_vendedor", event.target.value)}
                            disabled={!podeAnalisar || jaCriado}
                            placeholder="Ex: fila da vez, vendedor específico..."
                            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                        </label>
                      </div>

                      <label className="grid gap-2">
                        <span className="text-sm font-black text-slate-800">Observação da supervisão</span>
                        <textarea
                          value={form.observacao_supervisor}
                          onChange={(event) => atualizar(item.id, "observacao_supervisor", event.target.value)}
                          disabled={!podeAnalisar || jaCriado}
                          rows={3}
                          placeholder="Complemente os dados antes de criar oficialmente no C2S."
                          className="resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-sm font-black text-slate-800">Motivo da rejeição</span>
                        <input
                          value={form.motivo_rejeicao}
                          onChange={(event) => atualizar(item.id, "motivo_rejeicao", event.target.value)}
                          disabled={!podeAnalisar || jaCriado}
                          placeholder="Use somente se for rejeitar"
                          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </label>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          disabled={!podeAnalisar || loadingId === item.id || jaCriado || rejeitado}
                          onClick={() => salvar(item.id, "salvar")}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Salvar análise
                        </button>

                        <button
                          type="button"
                          disabled={!podeAnalisar || loadingId === item.id || jaCriado || rejeitado}
                          onClick={() => salvar(item.id, "rejeitar")}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Rejeitar
                        </button>

                        <button
                          type="button"
                          disabled={!podeAnalisar || loadingId === item.id || jaCriado || rejeitado}
                          onClick={() => salvar(item.id, "criar_c2s")}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          Criar no C2S
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
