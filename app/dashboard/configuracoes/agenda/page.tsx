"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";

type ConfigItem = { chave: string; valor: Record<string, any> };
type ApiConfiguracoes = { ok: boolean; usuario: { id: string; nome: string; perfil: string }; permissoes: { pode_editar_global: boolean; pode_editar_perfil: boolean }; configuracoes: { sistema: ConfigItem[]; perfil: ConfigItem[]; usuario: ConfigItem[] } };

const agendaPadrao = {
  confirmar_presenca_minutos: 60,
  alerta_atraso_minutos: 10,
  tolerancia_visita_minutos: 15,
  bloquear_horario_duplicado: true,
  exigir_vendedor_responsavel: true,
  permitir_reagendamento_operador: true,
  permitir_cancelamento_operador: false,
  supervisor_confirma_venda: true,
  gerar_notificacao_confirmacao: true,
  gerar_notificacao_atraso: true,
};

function buscarValor(configs: ConfigItem[], chave: string, fallback: Record<string, any>) {
  return configs.find((item) => item.chave === chave)?.valor || fallback;
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-blue-700" : "bg-slate-300"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></button>;
}

function Numero({ label, value, disabled, onChange, suffix }: { label: string; value: number; disabled?: boolean; onChange: (value: number) => void; suffix: string }) {
  return <label className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span><div className="flex items-center overflow-hidden rounded-xl border border-slate-200"><input disabled={disabled} type="number" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} className="h-11 min-w-0 flex-1 bg-white px-3 text-sm font-black outline-none disabled:bg-slate-100" /><span className="border-l border-slate-100 px-3 text-xs font-black text-slate-400">{suffix}</span></div></label>;
}

export default function Page() {
  const [dados, setDados] = useState<ApiConfiguracoes | null>(null);
  const [regras, setRegras] = useState<Record<string, any>>(agendaPadrao);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const podeEditar = Boolean(dados?.permissoes?.pode_editar_global || dados?.permissoes?.pode_editar_perfil);
  const escopo = dados?.permissoes?.pode_editar_global ? "global" : "perfil";

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/configuracoes", { method: "GET", cache: "no-store" });
      const json = await resposta.json();
      if (!resposta.ok || !json.ok) throw new Error(json?.erro || "Não foi possível carregar configurações.");
      setDados(json);
      const origem = json.permissoes?.pode_editar_global ? json.configuracoes?.sistema || [] : json.configuracoes?.perfil || [];
      setRegras({ ...agendaPadrao, ...buscarValor(origem, "agenda_regras_global", agendaPadrao) });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar configurações.");
    } finally {
      setCarregando(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch("/api/configuracoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ escopo, chave: "agenda_regras_global", valor: regras, perfil: dados?.usuario?.perfil, descricao: "Regras operacionais da agenda." }) });
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok || !json?.ok) throw new Error(json?.erro || "Não foi possível salvar regras da agenda.");
      setMensagem("Regras da agenda salvas. A página Agenda deve consumir esta chave para bloquear horários, exigir responsável e gerar alertas.");
      window.dispatchEvent(new Event("flow-configuracoes-atualizadas"));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar regras da agenda.");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  if (carregando) return <main className="p-6"><div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div></main>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1300px] space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link href="/dashboard/configuracoes" className="inline-flex items-center gap-2 text-sm font-black text-blue-700"><ArrowLeft className="h-4 w-4" /> Voltar para configurações</Link>
          <div className="mt-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div><p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Configurações do módulo</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Agenda</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Define a lógica por trás da agenda: confirmação, atraso, duplicidade, reagendamento e permissões.</p></div>
            <button type="button" disabled={!podeEditar || salvando} onClick={salvar} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 disabled:cursor-not-allowed disabled:opacity-60">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar regras da agenda</button>
          </div>
        </section>
        {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{erro}</div> : null}
        {mensagem ? <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" />{mensagem}</div> : null}
        {!podeEditar ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">Seu perfil não pode alterar regras da agenda.</div> : null}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Numero label="Confirmar presença" suffix="min antes" disabled={!podeEditar} value={Number(regras.confirmar_presenca_minutos)} onChange={(value) => setRegras((atual) => ({ ...atual, confirmar_presenca_minutos: value }))} />
          <Numero label="Alerta de atraso" suffix="min" disabled={!podeEditar} value={Number(regras.alerta_atraso_minutos)} onChange={(value) => setRegras((atual) => ({ ...atual, alerta_atraso_minutos: value }))} />
          <Numero label="Tolerância visita" suffix="min" disabled={!podeEditar} value={Number(regras.tolerancia_visita_minutos)} onChange={(value) => setRegras((atual) => ({ ...atual, tolerancia_visita_minutos: value }))} />
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries({ bloquear_horario_duplicado: "Bloquear horário duplicado", exigir_vendedor_responsavel: "Exigir vendedor responsável", permitir_reagendamento_operador: "Operador pode reagendar", permitir_cancelamento_operador: "Operador pode cancelar", supervisor_confirma_venda: "Supervisor confirma venda", gerar_notificacao_confirmacao: "Gerar notificação de confirmação", gerar_notificacao_atraso: "Gerar notificação de atraso" }).map(([key, label]) => <div key={key} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm font-black text-slate-800">{label}</span><Toggle disabled={!podeEditar} checked={Boolean(regras[key])} onChange={(value) => setRegras((atual) => ({ ...atual, [key]: value }))} /></div>)}
        </section>
      </div>
    </main>
  );
}
