"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";

type StatusTipo = {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  categoria: "operacional" | "pausa" | "administrativo" | "automatico" | string;
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
  tempo_maximo_minutos: number | null;
  gera_popup: boolean;
  titulo_popup: string | null;
  mensagem_popup: string | null;
};

type ApiResponse = {
  ok: boolean;
  erro?: string;
  status_tipos?: StatusTipo[];
  permissoes?: {
    pode_editar: boolean;
  };
};

const novoStatusBase: Partial<StatusTipo> = {
  chave: "",
  nome: "",
  descricao: "",
  categoria: "pausa",
  ativo: true,
  bloqueia_recebimento_leads: true,
  conta_como_pausa: true,
  exige_motivo: false,
  exige_senha_supervisor: false,
  permite_operador_aplicar: false,
  permite_supervisor_aplicar: true,
  permite_aplicacao_em_massa: false,
  aplicacao_automatica: false,
  retorno_automatico: true,
  tempo_maximo_minutos: 60,
  gera_popup: true,
  titulo_popup: "",
  mensagem_popup: "",
};

function slug(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{children}</span>;
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-blue-700" : "bg-slate-300"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "blue" | "emerald" | "orange" | "red" | "slate" | "violet" }) {
  const classes = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  }[tone];

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${classes}`}>{children}</span>;
}

function categoriaTone(categoria: string): "blue" | "emerald" | "orange" | "red" | "slate" | "violet" {
  if (categoria === "pausa") return "orange";
  if (categoria === "administrativo") return "red";
  if (categoria === "automatico") return "violet";
  if (categoria === "operacional") return "blue";
  return "slate";
}

export default function OperacaoPausasPage() {
  const [lista, setLista] = useState<StatusTipo[]>([]);
  const [selecionado, setSelecionado] = useState<StatusTipo | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoStatus, setNovoStatus] = useState<Partial<StatusTipo>>(novoStatusBase);
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const agrupados = useMemo(() => {
    return lista.reduce<Record<string, StatusTipo[]>>((acc, item) => {
      const key = item.categoria || "operacional";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [lista]);

  const resumo = useMemo(() => {
    return {
      total: lista.length,
      pausas: lista.filter((item) => item.conta_como_pausa).length,
      bloqueiamLeads: lista.filter((item) => item.bloqueia_recebimento_leads).length,
      automaticos: lista.filter((item) => item.aplicacao_automatica).length,
    };
  }, [lista]);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/operacao/status-tipos", { method: "GET", cache: "no-store" });
      const json = (await resposta.json().catch(() => null)) as ApiResponse | null;

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível carregar operação e pausas.");
      }

      setLista(json.status_tipos || []);
      setPodeEditar(Boolean(json.permissoes?.pode_editar));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar operação e pausas.");
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(status: StatusTipo) {
    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/operacao/status-tipos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status),
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível salvar regra.");
      }

      setSucesso("Regra de operação salva com sucesso.");
      await carregar();
      setSelecionado(json.status_tipo || status);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar regra.");
    } finally {
      setSalvando(false);
    }
  }

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const payload = {
        ...novoStatus,
        chave: novoStatus.chave || slug(String(novoStatus.nome || "")),
      };

      const resposta = await fetch("/api/operacao/status-tipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível criar regra.");
      }

      setSucesso("Nova regra de status/pausa criada com sucesso.");
      setNovoStatus(novoStatusBase);
      setNovoAberto(false);
      await carregar();
      setSelecionado(json.status_tipo);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao criar regra.");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  if (carregando) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">Carregando regras de operação...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link href="/dashboard/configuracoes" className="inline-flex items-center gap-2 text-sm font-black text-blue-100 transition hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para Configurações
                </Link>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-blue-200">Configurações do sistema</p>
                <h1 className="mt-2 text-2xl font-black sm:text-3xl">Operação e pausas</h1>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-blue-100">
                  Defina a lógica por trás dos status. Esta página não coloca colaborador em pausa; ela controla o que cada status faz quando Usuários, Agenda, 3CX ou automações aplicarem uma mudança.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/usuarios?aba=status" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
                  <Users className="h-4 w-4" />
                  Abrir Status da equipe
                </Link>
                <button
                  type="button"
                  onClick={carregar}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoCard icon={SlidersHorizontal} label="Regras cadastradas" value={resumo.total} />
            <ResumoCard icon={Clock3} label="Contam como pausa" value={resumo.pausas} />
            <ResumoCard icon={ShieldCheck} label="Bloqueiam leads" value={resumo.bloqueiamLeads} />
            <ResumoCard icon={Bell} label="Automáticas" value={resumo.automaticos} />
          </div>
        </section>

        {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{erro}</div> : null}
        {sucesso ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{sucesso}</div> : null}

        {!podeEditar ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
            Você pode visualizar as regras, mas apenas ADM/Suporte pode alterar operação e pausas.
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            {Object.entries(agrupados).map(([categoria, itens]) => (
              <div key={categoria} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black capitalize text-slate-950">{categoria}</h2>
                    <p className="text-sm font-semibold text-slate-500">Regras cadastradas nessa categoria.</p>
                  </div>
                  <Badge tone={categoriaTone(categoria)}>{itens.length}</Badge>
                </div>

                <div className="space-y-3">
                  {itens.map((item) => {
                    const ativo = selecionado?.id === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelecionado(item)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${ativo ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-slate-950">{item.nome}</h3>
                              <Badge tone={item.ativo ? "emerald" : "slate"}>{item.ativo ? "ativo" : "inativo"}</Badge>
                              {item.bloqueia_recebimento_leads ? <Badge tone="red">bloqueia lead</Badge> : null}
                              {item.aplicacao_automatica ? <Badge tone="violet">automático</Badge> : null}
                            </div>
                            <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">{item.chave}</p>
                            {item.descricao ? <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">{item.descricao}</p> : null}
                          </div>
                          <CheckCircle2 className={`h-5 w-5 ${ativo ? "text-blue-700" : "text-slate-300"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950">Editar regra</h2>
                  <p className="text-sm font-semibold text-slate-500">Selecione um status/pausa para ajustar a lógica do sistema.</p>
                </div>
                {podeEditar ? (
                  <button type="button" onClick={() => setNovoAberto(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800">
                    <Plus className="h-4 w-4" />
                    Nova regra
                  </button>
                ) : null}
              </div>

              {selecionado ? (
                <StatusForm status={selecionado} disabled={!podeEditar || salvando} onChange={setSelecionado} onSave={salvar} />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <LockKeyhole className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-black text-slate-700">Nenhuma regra selecionada</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Clique em um status/pausa da lista para editar.</p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm font-semibold leading-6 text-blue-900">
              <h3 className="font-black text-blue-950">Como isso se conecta ao CRM</h3>
              <p className="mt-2">Configurações define a regra. Usuários &gt; Status aplica a regra nos colaboradores. A distribuição de leads deve consultar se o status atual bloqueia recebimento antes de enviar lead.</p>
              <p className="mt-2">Exemplo: pausa_almoco é automática por horário; pausa_feedback exige supervisor e motivo; em_ligacao pode vir do 3CX; offline bloqueia recebimento.</p>
            </div>
          </div>
        </section>
      </div>

      {novoAberto ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => setNovoAberto(false)}>
          <form onSubmit={criar} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Nova regra de status/pausa</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Crie uma regra nova para a operação. Isso ainda não aplica a pausa em ninguém.</p>
              </div>
              <button type="button" onClick={() => setNovoAberto(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <StatusCampos status={novoStatus} disabled={salvando} onChange={setNovoStatus} />

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setNovoAberto(false)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={salvando} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">
                <Save className="h-4 w-4" />
                Criar regra
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function ResumoCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusForm({ status, disabled, onChange, onSave }: { status: StatusTipo; disabled: boolean; onChange: (status: StatusTipo) => void; onSave: (status: StatusTipo) => void }) {
  return (
    <div>
      <StatusCampos status={status} disabled={disabled} onChange={(proximo) => onChange(proximo as StatusTipo)} />
      <div className="mt-5 flex justify-end">
        <button type="button" disabled={disabled} onClick={() => onSave(status)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">
          <Save className="h-4 w-4" />
          Salvar regra
        </button>
      </div>
    </div>
  );
}

function StatusCampos({ status, disabled, onChange }: { status: Partial<StatusTipo>; disabled: boolean; onChange: (status: Partial<StatusTipo>) => void }) {
  function patch(valor: Partial<StatusTipo>) {
    onChange({ ...status, ...valor });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel>Nome</FieldLabel>
          <input disabled={disabled} required value={status.nome || ""} onChange={(event) => patch({ nome: event.target.value, chave: status.chave || slug(event.target.value) })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100" />
        </label>

        <label className="grid gap-2">
          <FieldLabel>Chave técnica</FieldLabel>
          <input disabled={disabled || Boolean(status.id)} required value={status.chave || ""} onChange={(event) => patch({ chave: slug(event.target.value) })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100" />
        </label>

        <label className="grid gap-2">
          <FieldLabel>Categoria</FieldLabel>
          <select disabled={disabled} value={status.categoria || "operacional"} onChange={(event) => patch({ categoria: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100">
            <option value="operacional">Operacional</option>
            <option value="pausa">Pausa</option>
            <option value="administrativo">Administrativo</option>
            <option value="automatico">Automático</option>
          </select>
        </label>

        <label className="grid gap-2">
          <FieldLabel>Tempo máximo</FieldLabel>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
            <input disabled={disabled} type="number" min="0" value={status.tempo_maximo_minutos ?? ""} onChange={(event) => patch({ tempo_maximo_minutos: event.target.value ? Number(event.target.value) : null })} className="h-11 min-w-0 flex-1 px-3 text-sm font-bold outline-none disabled:bg-slate-100" />
            <span className="border-l border-slate-100 px-3 py-3 text-xs font-black text-slate-400">min</span>
          </div>
        </label>

        <label className="grid gap-2 md:col-span-2">
          <FieldLabel>Descrição operacional</FieldLabel>
          <textarea disabled={disabled} value={status.descricao || ""} onChange={(event) => patch({ descricao: event.target.value })} rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none disabled:bg-slate-100" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Regra label="Ativo" description="A regra aparece e pode ser usada pelo sistema." checked={Boolean(status.ativo)} disabled={disabled} onChange={(value) => patch({ ativo: value })} />
        <Regra label="Bloqueia recebimento de lead" description="Usuário nesse status não deve receber novos leads." checked={Boolean(status.bloqueia_recebimento_leads)} disabled={disabled} onChange={(value) => patch({ bloqueia_recebimento_leads: value })} />
        <Regra label="Conta como pausa" description="Entra em relatórios de tempo parado/pausado." checked={Boolean(status.conta_como_pausa)} disabled={disabled} onChange={(value) => patch({ conta_como_pausa: value })} />
        <Regra label="Exige motivo" description="Supervisor precisa informar motivo ao aplicar." checked={Boolean(status.exige_motivo)} disabled={disabled} onChange={(value) => patch({ exige_motivo: value })} />
        <Regra label="Exige senha de supervisor" description="Obrigatório quando aplicado na máquina do operador." checked={Boolean(status.exige_senha_supervisor)} disabled={disabled} onChange={(value) => patch({ exige_senha_supervisor: value })} />
        <Regra label="Operador pode aplicar" description="Permite que o próprio usuário escolha esse status." checked={Boolean(status.permite_operador_aplicar)} disabled={disabled} onChange={(value) => patch({ permite_operador_aplicar: value })} />
        <Regra label="Supervisor pode aplicar" description="Permite aplicar pela gestão em Usuários > Status." checked={Boolean(status.permite_supervisor_aplicar)} disabled={disabled} onChange={(value) => patch({ permite_supervisor_aplicar: value })} />
        <Regra label="Aplicação em massa" description="Supervisor pode aplicar em vários usuários ao mesmo tempo." checked={Boolean(status.permite_aplicacao_em_massa)} disabled={disabled} onChange={(value) => patch({ permite_aplicacao_em_massa: value })} />
        <Regra label="Aplicação automática" description="Sistema pode aplicar por horário, 3CX ou automação." checked={Boolean(status.aplicacao_automatica)} disabled={disabled} onChange={(value) => patch({ aplicacao_automatica: value })} />
        <Regra label="Retorno automático" description="Ao terminar o prazo/horário, volta para disponível." checked={Boolean(status.retorno_automatico)} disabled={disabled} onChange={(value) => patch({ retorno_automatico: value })} />
        <Regra label="Gera popup" description="Avisa o colaborador quando esse status for aplicado." checked={Boolean(status.gera_popup)} disabled={disabled} onChange={(value) => patch({ gera_popup: value })} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel>Título do popup</FieldLabel>
          <input disabled={disabled || !status.gera_popup} value={status.titulo_popup || ""} onChange={(event) => patch({ titulo_popup: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100" />
        </label>

        <label className="grid gap-2">
          <FieldLabel>Mensagem do popup</FieldLabel>
          <input disabled={disabled || !status.gera_popup} value={status.mensagem_popup || ""} onChange={(event) => patch({ mensagem_popup: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100" />
        </label>
      </div>
    </div>
  );
}

function Regra({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
      <div>
        <p className="text-sm font-black text-slate-950">{label}</p>
        <p className="text-xs font-semibold leading-5 text-slate-500">{description}</p>
      </div>
      <Toggle checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}
