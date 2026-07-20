"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email?: string | null;
  perfil: string;
};

type Conversa = {
  id: string;
  conector_id: string | null;
  usuario_id: string | null;
  lead_id: string | null;
  telefone_normalizado: string | null;
  nome_contato: string | null;
  ultima_mensagem_preview: string | null;
  ultima_direcao: string | null;
  cliente_respondeu: boolean | null;
  conversa_fora_da_base: boolean | null;
  status_auditoria: string | null;
  atualizado_em: string | null;
  primeira_mensagem_em?: string | null;
  ultima_mensagem_em?: string | null;
  revisado?: boolean | null;
  usuario_nome?: string | null;
  usuario_email?: string | null;
  lead_nome?: string | null;
  lead_telefone?: string | null;
  lead_veiculo?: string | null;
  lead_etapa?: string | null;
  minutos_aguardando?: number;
  status_operacional_whatsapp?: string;
  mensagem_limpa?: boolean;
};

type Conector = {
  id: string;
  nome: string | null;
  identificador: string | null;
  status: string | null;
  ultimo_heartbeat_em: string | null;
  ultima_captura_em: string | null;
  total_conversas_capturadas: number | null;
  total_clientes_aguardando: number | null;
  usuario_nome?: string | null;
};

type AuditoriaData = {
  ok: boolean;
  gerado_em: string;
  permissao_gestao: boolean;
  resumo: {
    total_conversas: number;
    aguardando_resposta: number;
    aguardando_cliente: number;
    fora_da_base: number;
    com_lead: number;
    mensagens_tecnicas_ignoradas: number;
    conectores_online: number;
    conectores_offline: number;
    maior_espera_minutos: number;
  };
  conversas: Conversa[];
  conectores: Conector[];
  erro?: string;
};

type FiltroStatus = "todos" | "aguardando_resposta" | "aguardando_cliente" | "fora_da_base" | "com_lead";

function dataHora(valor?: string | null) {
  if (!valor) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(valor));
  } catch {
    return "-";
  }
}

function tempoMinutos(minutos?: number) {
  const valor = Number(minutos || 0);
  if (valor < 1) return "agora";
  if (valor < 60) return `${valor} min`;
  const h = Math.floor(valor / 60);
  const m = valor % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function telefoneFormatado(valor?: string | null) {
  const n = String(valor || "").replace(/\D/g, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return valor || "-";
}

function statusLabel(conversa: Conversa) {
  const status = conversa.status_operacional_whatsapp;
  if (status === "cliente_aguardando_resposta") return "Cliente aguardando resposta";
  if (status === "aguardando_cliente") return "Aguardando cliente";
  if (status === "sem_lead_vinculado") return "Sem lead vinculado";
  if (status === "mensagem_tecnica_ignorada") return "Ignorada";
  return "Em monitoramento";
}

function statusClass(conversa: Conversa) {
  const status = conversa.status_operacional_whatsapp;
  if (status === "cliente_aguardando_resposta") return "border-red-200 bg-red-50 text-red-700";
  if (status === "aguardando_cliente") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "sem_lead_vinculado") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "mensagem_tecnica_ignorada") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function CardResumo({ titulo, valor, detalhe, icon: Icon, tom }: { titulo: string; valor: string | number; detalhe: string; icon: any; tom: "blue" | "red" | "orange" | "emerald" | "slate" }) {
  const tons = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    red: "bg-red-50 text-red-700 border-red-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{titulo}</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{valor}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{detalhe}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${tons[tom]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function WhatsAppMonitorClient({ usuario }: { usuario: Usuario }) {
  const [data, setData] = useState<AuditoriaData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("aguardando_resposta");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<Conversa | null>(null);
  const [detalhe, setDetalhe] = useState<any>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("busca", busca);
      params.set("limite", "120");

      const resposta = await fetch(`/api/whatsapp/auditoria?${params.toString()}`, { cache: "no-store" });
      const json = (await resposta.json()) as AuditoriaData;

      if (!resposta.ok || !json.ok) {
        throw new Error(json.erro || "Não foi possível carregar o monitor WhatsApp.");
      }

      setData(json);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar WhatsApp.");
    } finally {
      setCarregando(false);
    }
  }

  async function abrirDetalhe(conversa: Conversa) {
    setSelecionada(conversa);
    setDetalhe(null);
    setCarregandoDetalhe(true);

    try {
      const resposta = await fetch(`/api/whatsapp/auditoria/conversa?conversa_id=${conversa.id}`, { cache: "no-store" });
      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        throw new Error(json.erro || "Não foi possível abrir a conversa.");
      }

      setDetalhe(json);
    } catch (error) {
      setDetalhe({ ok: false, erro: error instanceof Error ? error.message : "Erro ao abrir conversa." });
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  useEffect(() => {
    carregar();
    const interval = window.setInterval(() => carregar(), 45000);
    return () => window.clearInterval(interval);
  }, [status]);

  const conversas = data?.conversas || [];

  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return conversas;

    return conversas.filter((item) => {
      const texto = [
        item.nome_contato,
        item.telefone_normalizado,
        item.ultima_mensagem_preview,
        item.usuario_nome,
        item.lead_nome,
        item.lead_veiculo,
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [conversas, busca]);

  const conectores = data?.conectores || [];

  return (
    <main className="flow-premium-page min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">WhatsApp operacional</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">Monitor de clientes aguardando resposta</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                Controle operacional do WhatsApp corporativo. O conector não envia mensagens: ele monitora conversas, cruza com leads e mostra quando o cliente está aguardando retorno.
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15"
            >
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </button>
          </div>
        </section>

        {data ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
            <CardResumo titulo="Aguardando" valor={data.resumo.aguardando_resposta} detalhe="Cliente respondeu" icon={ShieldAlert} tom="red" />
            <CardResumo titulo="Aguard. cliente" valor={data.resumo.aguardando_cliente} detalhe="Operador respondeu" icon={CheckCircle2} tom="emerald" />
            <CardResumo titulo="Fora da base" valor={data.resumo.fora_da_base} detalhe="Sem lead vinculado" icon={AlertTriangle} tom="orange" />
            <CardResumo titulo="Com lead" valor={data.resumo.com_lead} detalhe="Vinculadas" icon={UserRound} tom="blue" />
            <CardResumo titulo="Maior espera" valor={tempoMinutos(data.resumo.maior_espera_minutos)} detalhe="Cliente aguardando" icon={Clock3} tom="red" />
            <CardResumo titulo="Online" valor={data.resumo.conectores_online} detalhe="Conectores ativos" icon={Wifi} tom="emerald" />
            <CardResumo titulo="Offline" valor={data.resumo.conectores_offline} detalhe="Sem heartbeat" icon={WifiOff} tom="slate" />
            <CardResumo titulo="Ignoradas" valor={data.resumo.mensagens_tecnicas_ignoradas} detalhe="Status técnicos" icon={Filter} tom="slate" />
          </section>
        ) : null}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ["aguardando_resposta", "Aguardando resposta"],
                ["fora_da_base", "Sem lead"],
                ["com_lead", "Com lead"],
                ["aguardando_cliente", "Aguardando cliente"],
                ["todos", "Todos"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key as FiltroStatus)}
                  className={`rounded-full border px-4 py-2 text-sm font-black ${
                    status === key ? "border-blue-200 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full xl:w-[420px]">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") carregar();
                }}
                placeholder="Buscar por telefone, contato, lead ou mensagem..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold outline-none focus:border-blue-600"
              />
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
          <div className="grid min-h-[360px] place-items-center rounded-[28px] border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
          </div>
        ) : null}

        {!carregando ? (
          <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-xl font-black text-slate-950">Fila de WhatsApp</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Mostra quem respondeu no WhatsApp, quem está aguardando retorno e quais conversas ainda não têm lead vinculado.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {conversasFiltradas.length ? (
                  conversasFiltradas.map((conversa) => (
                    <button
                      key={conversa.id}
                      type="button"
                      onClick={() => abrirDetalhe(conversa)}
                      className="block w-full p-5 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(conversa)}`}>{statusLabel(conversa)}</span>
                            {conversa.lead_id ? (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Lead vinculado</span>
                            ) : (
                              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">Sem lead</span>
                            )}
                          </div>

                          <p className="mt-3 truncate text-lg font-black text-slate-950">{conversa.lead_nome || conversa.nome_contato || "Contato sem nome"}</p>

                          <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {telefoneFormatado(conversa.telefone_normalizado)}</span>
                            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {conversa.ultima_direcao === "recebida" ? "Recebida do cliente" : "Enviada pelo operador"}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {dataHora(conversa.atualizado_em)}</span>
                            {conversa.usuario_nome ? <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> {conversa.usuario_nome}</span> : null}
                          </div>

                          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{conversa.ultima_mensagem_preview || "Sem prévia da mensagem."}</p>
                        </div>

                        <div className="shrink-0 text-left xl:w-40 xl:text-right">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Tempo aguardando</p>
                          <p className={`mt-1 text-2xl font-black ${conversa.status_operacional_whatsapp === "cliente_aguardando_resposta" ? "text-red-700" : "text-slate-950"}`}>
                            {tempoMinutos(conversa.minutos_aguardando)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-10 text-center">
                    <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-500">Nenhuma conversa encontrada neste filtro.</p>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">Conectores</h2>
                <div className="mt-4 space-y-3">
                  {conectores.length ? (
                    conectores.map((conector) => {
                      const online = String(conector.status || "").toLowerCase().includes("online") || String(conector.status || "").toLowerCase().includes("conectado");
                      return (
                        <div key={conector.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-black text-slate-950">{conector.nome || conector.identificador || "Conector WhatsApp"}</p>
                            <span className={`rounded-full px-2 py-1 text-[11px] font-black ${online ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                              {online ? "Online" : "Offline"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">Último heartbeat: {dataHora(conector.ultimo_heartbeat_em)}</p>
                          <p className="text-xs font-bold leading-5 text-slate-500">Última captura: {dataHora(conector.ultima_captura_em)}</p>
                          {conector.usuario_nome ? <p className="text-xs font-bold leading-5 text-slate-500">Usuário: {conector.usuario_nome}</p> : null}
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhum conector encontrado.</p>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-1 h-5 w-5 text-blue-700" />
                  <div>
                    <h3 className="font-black text-blue-900">Regra operacional</h3>
                    <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
                      Se a última mensagem foi recebida do cliente, o CRM considera cliente aguardando resposta. Se foi enviada pelo operador, fica aguardando retorno do cliente.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        ) : null}

        {selecionada ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45">
            <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Detalhe da conversa</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{selecionada.lead_nome || selecionada.nome_contato || "Contato WhatsApp"}</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">{telefoneFormatado(selecionada.telefone_normalizado)}</p>
                  </div>
                  <button type="button" onClick={() => setSelecionada(null)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-5">
                {carregandoDetalhe ? (
                  <div className="grid min-h-[240px] place-items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
                  </div>
                ) : detalhe?.erro ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{detalhe.erro}</div>
                ) : (
                  <>
                    <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(selecionada)}`}>{statusLabel(selecionada)}</span>
                        {selecionada.lead_id ? (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Lead vinculado</span>
                        ) : (
                          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">Conversa sem lead vinculado</span>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600 md:grid-cols-2">
                        <p><strong className="text-slate-950">Última direção:</strong> {selecionada.ultima_direcao || "-"}</p>
                        <p><strong className="text-slate-950">Atualizado em:</strong> {dataHora(selecionada.atualizado_em)}</p>
                        <p><strong className="text-slate-950">Atendente:</strong> {selecionada.usuario_nome || "-"}</p>
                        <p><strong className="text-slate-950">Tempo aguardando:</strong> {tempoMinutos(selecionada.minutos_aguardando)}</p>
                      </div>

                      {selecionada.lead_id ? (
                        <a
                          href={`/dashboard/leads/${selecionada.lead_id}`}
                          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white"
                        >
                          Abrir lead <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <p className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm font-bold leading-6 text-orange-800">
                          Esta conversa ainda não está vinculada a nenhum lead. Ela deve aparecer para revisão da ADM/supervisão.
                        </p>
                      )}
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <h3 className="font-black text-slate-950">Mensagens registradas</h3>
                      <div className="mt-4 space-y-3">
                        {(detalhe?.mensagens || []).length ? (
                          detalhe.mensagens.map((msg: any) => (
                            <div key={msg.id} className={`rounded-2xl border p-3 ${msg.direcao === "recebida" ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50"}`}>
                              <div className="flex items-center justify-between gap-3">
                                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${msg.direcao === "recebida" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                  {msg.direcao === "recebida" ? "Cliente" : "Operador"}
                                </span>
                                <span className="text-xs font-bold text-slate-500">{dataHora(msg.enviada_em || msg.criado_em)}</span>
                              </div>
                              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{msg.mensagem_preview || "-"}</p>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                            Ainda não há mensagens detalhadas nesta conversa. O monitor já usa a última prévia da conversa para alertas.
                          </p>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
