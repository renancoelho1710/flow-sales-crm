"use client";

import Link from "next/link";
import { AtendimentoHeader } from "@/components/atendimento/AtendimentoHeader";
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
  const perfil = String(usuario.perfil || "").toLowerCase();
  const podeGerir = ["adm", "admin", "suporte", "gerente", "supervisor"].includes(perfil);

  return (
    <main className="flow-premium-page fs-attention-page">
      <div className="mx-auto max-w-[1540px] space-y-4">
        <AtendimentoHeader
          active="conversas"
          title="Conversas WhatsApp"
          description="As mensagens que exigem resposta aparecem primeiro. O histórico continua ligado ao lead e ao operador responsável."
          canManage={podeGerir}
          primaryAction={{ href: "/dashboard/leads", label: "Abrir fila" }}
          secondaryAction={{ href: "/dashboard/leads/tarefas", label: "Ver prioridades" }}
          aside={
            <div className="fs-attention-operator-chip">
              <span>{usuario.nome.trim().charAt(0).toUpperCase() || "U"}</span>
              <div><strong>{usuario.nome}</strong><small>WhatsApp corporativo</small></div>
            </div>
          }
        />

        <section className="fs-attention-metrics fs-attention-metrics--four">
          <button type="button" onClick={() => setStatus("aguardando_resposta")} className="fs-attention-metric is-orange">
            <span className="fs-attention-metric__icon"><MessageCircle className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Aguardando resposta</span>
            <strong>{resumo?.aguardando_resposta || 0}</strong>
            <small>Cliente falou por último</small>
          </button>
          <button type="button" onClick={() => setStatus("aguardando_cliente")} className="fs-attention-metric is-blue">
            <span className="fs-attention-metric__icon"><CheckCircle2 className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Aguardando cliente</span>
            <strong>{resumo?.aguardando_cliente || 0}</strong>
            <small>Operador já respondeu</small>
          </button>
          <button type="button" onClick={() => setStatus("sem_lead")} className="fs-attention-metric is-violet">
            <span className="fs-attention-metric__icon"><AlertTriangle className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Sem lead vinculado</span>
            <strong>{resumo?.sem_lead || 0}</strong>
            <small>Precisa de conferência</small>
          </button>
          <button type="button" onClick={() => setStatus("aguardando_resposta")} className="fs-attention-metric is-red">
            <span className="fs-attention-metric__icon"><Clock3 className="h-[18px] w-[18px]" /></span>
            <span className="fs-attention-metric__label">Maior espera</span>
            <strong>{formatarEspera(resumo?.maior_espera_minutos)}</strong>
            <small>Prioridade operacional</small>
          </button>
        </section>

        <section className="fs-attention-toolbar-card">
          <div className="fs-conversation-toolbar">
            <div className="fs-attention-segmented">
              {[
                ["aguardando_resposta", "Responder"],
                ["aguardando_cliente", "Aguardando cliente"],
                ["com_lead", "Com lead"],
                ["sem_lead", "Sem lead"],
                ["todos", "Todos"],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setStatus(key as StatusFiltro)} className={status === key ? "is-active" : ""}>{label}</button>
              ))}
            </div>

            <label className="fs-attention-inline-search">
              <Search className="h-4 w-4" />
              <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Cliente, telefone ou mensagem" />
            </label>

            <button type="button" onClick={carregar} className="fs-attention-refresh-button" disabled={carregando}>
              <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </section>

        {erro ? <div className="fs-attention-alert is-error"><AlertTriangle className="h-5 w-5" /> {erro}</div> : null}

        {carregando ? (
          <div className="fs-attention-loading"><Loader2 className="h-8 w-8 animate-spin" /><span>Atualizando conversas...</span></div>
        ) : (
          <section className="fs-conversation-list">
            {conversas.length ? conversas.map((conversa) => {
              const aguardandoResposta = conversa.status_operacional_whatsapp === "cliente_aguardando_resposta";
              const nome = conversa.lead_nome || conversa.nome_contato || conversa.telefone_normalizado || "Contato WhatsApp";
              return (
                <article key={conversa.id} className={`fs-conversation-row ${aguardandoResposta ? "is-urgent" : ""}`}>
                  <div className="fs-conversation-row__avatar">{nome.trim().charAt(0).toUpperCase() || "W"}</div>
                  <div className="fs-conversation-row__main">
                    <div className="fs-conversation-row__title">
                      <strong>{nome}</strong>
                      <span className={aguardandoResposta ? "is-orange" : "is-blue"}>{statusTexto(conversa.status_operacional_whatsapp)}</span>
                      {conversa.lead_id ? <small className="is-green">Lead vinculado</small> : <small>Sem lead</small>}
                    </div>
                    <p>{conversa.ultima_mensagem_preview || "Mensagem recebida no WhatsApp corporativo."}</p>
                    <div className="fs-conversation-row__meta">
                      <span>{telefoneFormatado(conversa.telefone_normalizado)}</span>
                      <span>{formatarDataHora(conversa.atualizado_em)}</span>
                      {aguardandoResposta ? <span className="is-urgent">Aguardando há {formatarEspera(conversa.minutos_aguardando)}</span> : null}
                      {conversa.lead_veiculo ? <span>{conversa.lead_veiculo}</span> : null}
                    </div>
                  </div>
                  <div className="fs-conversation-row__actions">
                    {conversa.lead_id ? <Link href={`/dashboard/leads/${conversa.lead_id}`}>Abrir atendimento <ArrowRight className="h-4 w-4" /></Link> : null}
                    <a href={waLink(conversa.telefone_normalizado)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                  </div>
                </article>
              );
            }) : (
              <div className="fs-attention-empty">
                <span><CheckCircle2 className="h-7 w-7" /></span>
                <h3>Nenhuma pendência neste filtro</h3>
                <p>Quando um cliente responder, a conversa aparecerá aqui automaticamente.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
