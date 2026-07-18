"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
} from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email?: string | null;
  perfil?: string | null;
};

type WhatsAppConversa = {
  id: string;
  lead_id: string | null;
  telefone_normalizado: string | null;
  nome_contato: string | null;
  ultima_mensagem_preview: string | null;
  ultima_direcao: string | null;
  ultima_mensagem_em: string | null;
  atualizado_em: string | null;
  status_operacional_whatsapp: string;
  minutos_aguardando: number;
  lead_nome?: string | null;
  lead_veiculo?: string | null;
  lead_etapa?: string | null;
};

type ApiData = {
  ok: boolean;
  gerado_em: string;
  resumo: {
    total_conversas: number;
    aguardando_resposta: number;
    aguardando_cliente: number;
    sem_lead: number;
    mensagens_tecnicas_ignoradas: number;
    maior_espera_minutos: number;
  };
  conversas: WhatsAppConversa[];
  erro?: string;
};

type StatusFiltro = "aguardando_resposta" | "aguardando_cliente" | "sem_lead" | "com_lead" | "todos";

function formatarEspera(minutos?: number) {
  const total = Number(minutos || 0);
  if (total < 1) return "agora";
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return "Sem horário";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function statusTexto(status: string) {
  if (status === "cliente_aguardando_resposta") return "Cliente aguardando resposta";
  if (status === "aguardando_cliente") return "Aguardando cliente";
  if (status === "sem_lead_vinculado") return "Sem lead vinculado";
  if (status === "mensagem_tecnica_ignorada") return "Mensagem técnica ignorada";
  return "Em monitoramento";
}

function telefoneFormatado(valor?: string | null) {
  const numeros = String(valor || "").replace(/\D/g, "");
  if (!numeros) return "Telefone não identificado";
  if (numeros.length === 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  if (numeros.length === 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  return numeros;
}

function waLink(valor?: string | null) {
  const numeros = String(valor || "").replace(/\D/g, "");
  if (!numeros) return "#";
  const comPais = numeros.startsWith("55") ? numeros : `55${numeros}`;
  return `https://wa.me/${comPais}`;
}

export function MeusWhatsAppsClient({ usuario }: { usuario: Usuario }) {
  const [data, setData] = useState<ApiData | null>(null);
  const [status, setStatus] = useState<StatusFiltro>("aguardando_resposta");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("status", status);
    params.set("limite", "120");
    if (busca.trim()) params.set("busca", busca.trim());
    return params.toString();
  }, [status, busca]);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch(`/api/whatsapp/minhas-pendencias?${query}`, { cache: "no-store" });
      const json = (await resposta.json()) as ApiData;

      if (!resposta.ok || !json.ok) {
        throw new Error(json.erro || "Não foi possível carregar seus WhatsApps.");
      }

      setData(json);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar WhatsApp.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    const timer = window.setInterval(carregar, 60000);

    return () => window.clearInterval(timer);
  }, [query]);

  const resumo = data?.resumo;
  const conversas = data?.conversas || [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
            <div className="p-6 lg:p-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Meu WhatsApp</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">Clientes que precisam de resposta</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                Esta tela mostra somente as conversas do WhatsApp corporativo vinculadas ao seu atendimento. O objetivo é evitar cliente esquecido no WhatsApp.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-3xl bg-orange-50 p-4">
                  <p className="text-[10px] font-black uppercase text-orange-700">Aguardando resposta</p>
                  <p className="mt-2 text-3xl font-black">{resumo?.aguardando_resposta || 0}</p>
                  <p className="mt-1 text-xs font-bold text-orange-700">Responder primeiro</p>
                </div>
                <div className="rounded-3xl bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase text-blue-700">Aguardando cliente</p>
                  <p className="mt-2 text-3xl font-black">{resumo?.aguardando_cliente || 0}</p>
                  <p className="mt-1 text-xs font-bold text-blue-700">Você já respondeu</p>
                </div>
                <div className="rounded-3xl bg-slate-100 p-4">
                  <p className="text-[10px] font-black uppercase text-slate-600">Sem lead</p>
                  <p className="mt-2 text-3xl font-black">{resumo?.sem_lead || 0}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">Revisar se necessário</p>
                </div>
                <div className="rounded-3xl bg-red-50 p-4">
                  <p className="text-[10px] font-black uppercase text-red-700">Maior espera</p>
                  <p className="mt-2 text-3xl font-black">{formatarEspera(resumo?.maior_espera_minutos)}</p>
                  <p className="mt-1 text-xs font-bold text-red-700">Prioridade operacional</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white">
              <div className="relative z-10">
                <MessageCircle className="h-9 w-9 text-cyan-200" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Operador</p>
                <p className="mt-2 text-2xl font-black">{usuario.nome}</p>
                <p className="mt-3 text-sm font-bold leading-6 text-blue-100">
                  Regra: se a última mensagem foi recebida do cliente, ele aparece como aguardando resposta. Se você respondeu, fica aguardando cliente.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-2">
              {[
                ["aguardando_resposta", "Aguardando resposta"],
                ["aguardando_cliente", "Aguardando cliente"],
                ["sem_lead", "Sem lead"],
                ["com_lead", "Com lead"],
                ["todos", "Todos"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key as StatusFiltro)}
                  className={`rounded-full border px-4 py-2 text-sm font-black ${
                    status === key ? "border-blue-200 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar telefone, cliente ou mensagem..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-600 sm:w-[340px]"
                />
              </label>
              <button
                onClick={carregar}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" /> Atualizar
              </button>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mr-2 inline h-5 w-5" />
            {erro}
          </div>
        ) : null}

        {carregando ? (
          <div className="grid min-h-[320px] place-items-center rounded-[28px] border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
          </div>
        ) : (
          <section className="grid gap-4">
            {conversas.length ? (
              conversas.map((conversa) => {
                const aguardandoResposta = conversa.status_operacional_whatsapp === "cliente_aguardando_resposta";
                return (
                  <article key={conversa.id} className={`rounded-[28px] border bg-white p-5 shadow-sm ${aguardandoResposta ? "border-orange-200" : "border-slate-200"}`}>
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${aguardandoResposta ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                            {statusTexto(conversa.status_operacional_whatsapp)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {telefoneFormatado(conversa.telefone_normalizado)}
                          </span>
                          {conversa.lead_id ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Lead vinculado</span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Sem lead vinculado</span>
                          )}
                        </div>

                        <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-slate-950">
                          {conversa.lead_nome || conversa.nome_contato || conversa.telefone_normalizado || "Contato WhatsApp"}
                        </h2>

                        <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-slate-600">
                          {conversa.ultima_mensagem_preview || "Mensagem recebida no WhatsApp corporativo."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Última atualização: {formatarDataHora(conversa.atualizado_em)}</span>
                          {aguardandoResposta ? <span>Tempo aguardando: {formatarEspera(conversa.minutos_aguardando)}</span> : null}
                          {conversa.lead_veiculo ? <span>Veículo: {conversa.lead_veiculo}</span> : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
                        {conversa.lead_id ? (
                          <Link href={`/dashboard/leads/${conversa.lead_id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white">
                            Ver lead <ArrowRight className="h-4 w-4" />
                          </Link>
                        ) : null}
                        <a href={waLink(conversa.telefone_normalizado)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50">
                          Abrir WhatsApp
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h2 className="mt-3 text-xl font-black text-slate-950">Nenhuma pendência nesse filtro</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Quando algum cliente responder no WhatsApp corporativo, a pendência aparecerá aqui automaticamente.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
