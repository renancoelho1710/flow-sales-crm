"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlarmClock, CalendarDays, CheckCircle2, Clock3, Loader2, MessageSquareText, Save, Search, Users } from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  recebe_leads: boolean;
  status_operacional: string;
  status_administrativo: string;
  status_operacional_atualizado_em?: string | null;
};

type StatusTipo = {
  id: string;
  chave: string;
  nome: string;
  descricao?: string | null;
  categoria: string;
  ativo: boolean;
  bloqueia_recebimento_leads: boolean;
  conta_como_pausa: boolean;
  exige_motivo: boolean;
  exige_senha_supervisor: boolean;
  permite_operador_aplicar: boolean;
  permite_supervisor_aplicar: boolean;
  permite_aplicacao_em_massa: boolean;
  aplicacao_automatica: boolean;
  retorno_automatico: boolean;
  tempo_maximo_minutos?: number | null;
  gera_popup: boolean;
  titulo_popup?: string | null;
  mensagem_popup?: string | null;
};

type HorarioPausa = {
  id: string;
  usuario_id: string;
  status_tipo_chave: string;
  titulo: string;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
  observacao?: string | null;
};

type StatusLog = {
  id: string;
  usuario_id: string;
  status_anterior?: string | null;
  status_novo: string;
  origem: string;
  motivo?: string | null;
  recebe_leads_anterior?: boolean | null;
  recebe_leads_novo?: boolean | null;
  criado_em: string;
};

type ApiResponse = {
  ok: boolean;
  erro?: string;
  pode_gerenciar_status: boolean;
  usuarios: Usuario[];
  status_tipos: StatusTipo[];
  horarios: HorarioPausa[];
  logs: StatusLog[];
};

function statusClasse(chave: string) {
  if (["disponivel"].includes(chave)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["pausa_almoco", "pausa_feedback", "ocupado"].includes(chave)) return "bg-amber-50 text-amber-700 ring-amber-100";
  if (["offline", "bloqueado", "em_ligacao"].includes(chave)) return "bg-red-50 text-red-700 ring-red-100";
  if (["em_atendimento"].includes(chave)) return "bg-blue-50 text-blue-700 ring-blue-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatarData(valor?: string | null) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

export default function Page() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [statusTipos, setStatusTipos] = useState<StatusTipo[]>([]);
  const [horarios, setHorarios] = useState<HorarioPausa[]>([]);
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [usuarioHorario, setUsuarioHorario] = useState("");
  const [horaInicio, setHoraInicio] = useState("12:00");
  const [horaFim, setHoraFim] = useState("13:00");
  const [motivoFeedback, setMotivoFeedback] = useState("Feedback da supervisão");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [podeGerenciar, setPodeGerenciar] = useState(false);

  const mapaStatus = useMemo(() => {
    return Object.fromEntries(statusTipos.map((status) => [status.chave, status]));
  }, [statusTipos]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((usuario) => `${usuario.nome} ${usuario.email} ${usuario.perfil} ${usuario.status_operacional}`.toLowerCase().includes(termo));
  }, [usuarios, busca]);

  const usuariosSelecionados = usuarios.filter((usuario) => selecionados.includes(usuario.id));

  function getHorarioAlmoco(usuarioId: string) {
    return horarios.find((horario) => horario.usuario_id === usuarioId && horario.status_tipo_chave === "pausa_almoco");
  }

  function alternarSelecionado(usuarioId: string) {
    setSelecionados((atuais) =>
      atuais.includes(usuarioId) ? atuais.filter((id) => id !== usuarioId) : [...atuais, usuarioId]
    );
  }

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/usuarios/status", { method: "GET", cache: "no-store" });
      const dados = (await resposta.json()) as ApiResponse;

      if (!resposta.ok || !dados.ok) {
        throw new Error(dados.erro || "Não foi possível carregar status da equipe.");
      }

      setUsuarios(dados.usuarios || []);
      setStatusTipos(dados.status_tipos || []);
      setHorarios(dados.horarios || []);
      setLogs(dados.logs || []);
      setPodeGerenciar(Boolean(dados.pode_gerenciar_status));
      setUsuarioHorario((atual) => atual || dados.usuarios?.[0]?.id || "");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar status da equipe.");
    } finally {
      setCarregando(false);
    }
  }

  async function aplicarStatus(usuarioIds: string[], statusChave: string, motivo?: string) {
    setSalvando(statusChave);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/usuarios/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_ids: usuarioIds,
          status_chave: statusChave,
          motivo,
          origem: statusChave === "pausa_feedback" ? "supervisao" : "manual",
          recebe_leads: statusChave === "disponivel",
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.ok) {
        throw new Error(dados.erro || "Não foi possível aplicar status.");
      }

      setSucesso("Status aplicado com sucesso.");
      setSelecionados([]);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao aplicar status.");
    } finally {
      setSalvando("");
    }
  }

  async function salvarHorario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando("horario");
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/usuarios/horarios-pausa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: usuarioHorario,
          status_tipo_chave: "pausa_almoco",
          titulo: "Pausa almoço",
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          dias_semana: [1, 2, 3, 4, 5, 6],
          ativo: true,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.ok) {
        throw new Error(dados.erro || "Não foi possível salvar horário de almoço.");
      }

      setSucesso("Horário de almoço salvo com sucesso.");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar horário de almoço.");
    } finally {
      setSalvando("");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  if (carregando) {
    return (
      <main className="flow-premium-page p-4 sm:p-6">
        <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">Carregando status da equipe...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flow-premium-page p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Usuários</p>
          <div className="mt-2 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Status da equipe</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                Aqui o supervisor acompanha e aplica status. As regras vêm de Configurações &gt; Operação e pausas.
              </p>
            </div>
            <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              <span>{usuarios.filter((usuario) => usuario.status_operacional === "disponivel").length} disponíveis</span>
              <span>{usuarios.filter((usuario) => usuario.recebe_leads).length} recebendo leads</span>
            </div>
          </div>
        </section>

        {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{erro}</div> : null}
        {sucesso ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{sucesso}</div> : null}

        <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-700" />
                <h2 className="font-black text-slate-950">Equipe operacional</h2>
              </div>
              <label className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar colaborador..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {usuariosFiltrados.map((usuario) => {
                const status = mapaStatus[usuario.status_operacional];
                const horario = getHorarioAlmoco(usuario.id);
                const selecionado = selecionados.includes(usuario.id);

                return (
                  <div key={usuario.id} className={`rounded-3xl border p-4 transition ${selecionado ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{usuario.nome}</h3>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{usuario.perfil}</p>
                      </div>
                      {podeGerenciar ? (
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() => alternarSelecionado(usuario.id)}
                          className="mt-1 h-4 w-4"
                        />
                      ) : null}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                        <span className="font-bold text-slate-500">Status</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClasse(usuario.status_operacional)}`}>
                          {status?.nome || usuario.status_operacional}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                        <span className="font-bold text-slate-500">Recebe leads</span>
                        <strong className={usuario.recebe_leads ? "text-emerald-600" : "text-red-600"}>{usuario.recebe_leads ? "Sim" : "Não"}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                        <span className="font-bold text-slate-500">Almoço</span>
                        <strong className="text-slate-950">{horario ? `${horario.hora_inicio.slice(0, 5)} às ${horario.hora_fim.slice(0, 5)}` : "Não definido"}</strong>
                      </div>
                    </div>

                    {podeGerenciar ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => aplicarStatus([usuario.id], "disponivel")} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">Disponível</button>
                        <button type="button" onClick={() => aplicarStatus([usuario.id], "ocupado")} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Ocupado</button>
                        <button type="button" onClick={() => aplicarStatus([usuario.id], "offline")} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Offline</button>
                        <button type="button" onClick={() => aplicarStatus([usuario.id], "pausa_feedback", motivoFeedback)} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Feedback</button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-amber-600" />
                <h2 className="font-black text-slate-950">Pausa feedback</h2>
              </div>
              <p className="mb-4 text-sm font-semibold leading-6 text-slate-500">
                Aplicação pela supervisão. O colaborador não escolhe essa pausa sozinho.
              </p>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Motivo</span>
                <textarea
                  value={motivoFeedback}
                  onChange={(event) => setMotivoFeedback(event.target.value)}
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <button
                type="button"
                disabled={!podeGerenciar || usuariosSelecionados.length === 0 || salvando === "pausa_feedback"}
                onClick={() => aplicarStatus(selecionados, "pausa_feedback", motivoFeedback)}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Aplicar em {usuariosSelecionados.length} selecionado(s)
              </button>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-700" />
                <h2 className="font-black text-slate-950">Horário de almoço</h2>
              </div>
              <form onSubmit={salvarHorario} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">Colaborador</span>
                  <select
                    value={usuarioHorario}
                    onChange={(event) => setUsuarioHorario(event.target.value)}
                    disabled={!podeGerenciar}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100"
                  >
                    {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">Início</span>
                    <input value={horaInicio} onChange={(event) => setHoraInicio(event.target.value)} type="time" disabled={!podeGerenciar} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none disabled:bg-slate-100" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">Fim</span>
                    <input value={horaFim} onChange={(event) => setHoraFim(event.target.value)} type="time" disabled={!podeGerenciar} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none disabled:bg-slate-100" />
                  </label>
                </div>
                <button type="submit" disabled={!podeGerenciar || salvando === "horario"} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                  <Clock3 className="h-4 w-4" />
                  Salvar horário
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <AlarmClock className="h-5 w-5 text-slate-500" />
                <h2 className="font-black text-slate-950">Últimos eventos</h2>
              </div>
              <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
                {logs.slice(0, 12).map((log) => {
                  const usuario = usuarios.find((item) => item.id === log.usuario_id);
                  return (
                    <div key={log.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-slate-950">{usuario?.nome || "Usuário"}</strong>
                        <span className="text-xs font-bold text-slate-400">{formatarData(log.criado_em)}</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-600">{log.status_anterior || "—"} → {log.status_novo}</p>
                      {log.motivo ? <p className="mt-1 text-xs font-semibold text-slate-500">{log.motivo}</p> : null}
                    </div>
                  );
                })}
                {logs.length === 0 ? <p className="text-sm font-semibold text-slate-500">Nenhum evento registrado ainda.</p> : null}
              </div>
            </section>
          </div>
        </section>

        {salvando ? (
          <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl">
            <CheckCircle2 className="h-4 w-4" />
            Processando...
          </div>
        ) : null}
      </div>
    </main>
  );
}
