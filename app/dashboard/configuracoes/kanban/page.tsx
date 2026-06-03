"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";

type ConfigItem = { chave: string; valor: Record<string, any> };
type ApiConfiguracoes = {
  ok: boolean;
  usuario: { id: string; nome: string; perfil: string };
  permissoes: { pode_editar_global: boolean; pode_editar_perfil: boolean; pode_editar_usuario: boolean };
  configuracoes: { sistema: ConfigItem[]; perfil: ConfigItem[]; usuario: ConfigItem[] };
};

type ColunaKanban = {
  chave: string;
  titulo: string;
  descricao: string;
  cor: string;
  ativa: boolean;
  exige_observacao: boolean;
  exige_proxima_acao: boolean;
  bloqueada_operador: boolean;
  etapa_venda: boolean;
  etapa_final: boolean;
};

const colunasPadrao: ColunaKanban[] = [
  { chave: "morno", titulo: "Morno", descricao: "Lead em fase inicial de recuperação.", cor: "blue", ativa: true, exige_observacao: false, exige_proxima_acao: true, bloqueada_operador: false, etapa_venda: false, etapa_final: false },
  { chave: "em_contato", titulo: "Em contato", descricao: "Lead com atendimento em andamento.", cor: "sky", ativa: true, exige_observacao: true, exige_proxima_acao: true, bloqueada_operador: false, etapa_venda: false, etapa_final: false },
  { chave: "agendado", titulo: "Agendado", descricao: "Cliente com visita ou test-drive marcado.", cor: "violet", ativa: true, exige_observacao: true, exige_proxima_acao: false, bloqueada_operador: false, etapa_venda: false, etapa_final: false },
  { chave: "visitou_loja", titulo: "Visitou loja", descricao: "Cliente compareceu à loja.", cor: "emerald", ativa: true, exige_observacao: true, exige_proxima_acao: true, bloqueada_operador: false, etapa_venda: false, etapa_final: false },
  { chave: "venda_pendente", titulo: "Venda pendente", descricao: "Venda aguardando validação.", cor: "orange", ativa: true, exige_observacao: true, exige_proxima_acao: false, bloqueada_operador: true, etapa_venda: true, etapa_final: false },
  { chave: "venda_validada", titulo: "Venda validada", descricao: "Venda validada pela gestão.", cor: "green", ativa: true, exige_observacao: true, exige_proxima_acao: false, bloqueada_operador: true, etapa_venda: true, etapa_final: true },
];

const regrasPadrao = {
  exigir_observacao_ao_mover: true,
  exigir_proxima_acao: true,
  bloquear_etapa_final_operador: true,
  permitir_arrastar_cards: true,
  manter_vendedor_original: true,
  somente_supervisor_valida_venda: true,
  registrar_historico_movimentacao: true,
  impedir_mover_sem_responsavel: true,
};

function buscarValor(configs: ConfigItem[], chave: string, fallback: Record<string, any>) {
  return configs.find((item) => item.chave === chave)?.valor || fallback;
}

function slug(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "nova_etapa";
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-blue-700" : "bg-slate-300"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function Page() {
  const [dados, setDados] = useState<ApiConfiguracoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [regras, setRegras] = useState(regrasPadrao);
  const [colunas, setColunas] = useState<ColunaKanban[]>(colunasPadrao);

  const podeEditar = Boolean(dados?.permissoes?.pode_editar_global);
  const colunasAtivas = useMemo(() => colunas.filter((coluna) => coluna.ativa).length, [colunas]);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/configuracoes", { method: "GET", cache: "no-store" });
      const json = await resposta.json();
      if (!resposta.ok || !json.ok) throw new Error(json?.erro || "Não foi possível carregar configurações.");
      setDados(json);
      const sistema = json.configuracoes?.sistema || [];
      setRegras({ ...regrasPadrao, ...buscarValor(sistema, "kanban_regras_global", regrasPadrao) });
      const configuracaoColunas = buscarValor(sistema, "kanban_colunas_global", { colunas: colunasPadrao });
      setColunas(Array.isArray(configuracaoColunas.colunas) ? configuracaoColunas.colunas : colunasPadrao);
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
      for (const item of [
        { chave: "kanban_regras_global", valor: regras, descricao: "Regras globais do Kanban." },
        { chave: "kanban_colunas_global", valor: { colunas }, descricao: "Estrutura de colunas do Kanban." },
      ]) {
        const resposta = await fetch("/api/configuracoes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ escopo: "global", ...item }),
        });
        const json = await resposta.json().catch(() => null);
        if (!resposta.ok || !json?.ok) throw new Error(json?.erro || "Não foi possível salvar configurações do Kanban.");
      }
      setMensagem("Configurações do Kanban salvas. A página Kanban deve consumir estas chaves para aplicar as regras operacionais.");
      window.dispatchEvent(new Event("flow-configuracoes-atualizadas"));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  }

  function atualizarColuna(index: number, campo: keyof ColunaKanban, valor: any) {
    setColunas((atuais) => atuais.map((coluna, i) => i === index ? { ...coluna, [campo]: valor, chave: campo === "titulo" ? slug(valor) : coluna.chave } : coluna));
  }

  function adicionarColuna() {
    setColunas((atuais) => [...atuais, { chave: `nova_etapa_${atuais.length + 1}`, titulo: "Nova etapa", descricao: "Descreva a regra desta etapa.", cor: "blue", ativa: true, exige_observacao: true, exige_proxima_acao: true, bloqueada_operador: false, etapa_venda: false, etapa_final: false }]);
  }

  function removerColuna(index: number) {
    setColunas((atuais) => atuais.filter((_, i) => i !== index));
  }

  useEffect(() => { carregar(); }, []);

  if (carregando) {
    return <main className="p-6"><div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link href="/dashboard/configuracoes" className="inline-flex items-center gap-2 text-sm font-black text-blue-700"><ArrowLeft className="h-4 w-4" /> Voltar para configurações</Link>
          <div className="mt-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Configurações do módulo</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Kanban</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Define a lógica por trás do Kanban: etapas, bloqueios, validações, próxima ação e regras de venda.</p>
            </div>
            <button type="button" disabled={!podeEditar || salvando} onClick={salvar} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 disabled:cursor-not-allowed disabled:opacity-60">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar regras do Kanban
            </button>
          </div>
        </section>

        {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{erro}</div> : null}
        {mensagem ? <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" />{mensagem}</div> : null}
        {!podeEditar ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">Somente ADM/Suporte pode alterar regras globais do Kanban.</div> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries({
            exigir_observacao_ao_mover: "Exigir observação ao mover",
            exigir_proxima_acao: "Exigir próxima ação",
            bloquear_etapa_final_operador: "Bloquear etapa final para operador",
            permitir_arrastar_cards: "Permitir arrastar cards",
            manter_vendedor_original: "Manter vendedor original",
            somente_supervisor_valida_venda: "Só supervisão valida venda",
            registrar_historico_movimentacao: "Registrar histórico de movimentação",
            impedir_mover_sem_responsavel: "Impedir sem responsável",
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-sm font-black text-slate-800">{label}</span>
              <Toggle disabled={!podeEditar} checked={Boolean((regras as any)[key])} onChange={(value) => setRegras((atual) => ({ ...atual, [key]: value }))} />
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-black text-slate-950">Etapas do Kanban</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{colunasAtivas} etapa(s) ativa(s). Cada etapa tem sua própria regra operacional.</p>
            </div>
            <button type="button" disabled={!podeEditar} onClick={adicionarColuna} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 disabled:opacity-60"><Plus className="h-4 w-4" /> Nova etapa</button>
          </div>

          <div className="grid gap-4">
            {colunas.map((coluna, index) => (
              <div key={`${coluna.chave}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr_150px_auto] xl:items-end">
                  <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-wide text-slate-400">Título</span><input disabled={!podeEditar} value={coluna.titulo} onChange={(e) => atualizarColuna(index, "titulo", e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none" /></label>
                  <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-wide text-slate-400">Descrição</span><input disabled={!podeEditar} value={coluna.descricao} onChange={(e) => atualizarColuna(index, "descricao", e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none" /></label>
                  <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-wide text-slate-400">Cor</span><select disabled={!podeEditar} value={coluna.cor} onChange={(e) => atualizarColuna(index, "cor", e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"><option>blue</option><option>sky</option><option>violet</option><option>emerald</option><option>orange</option><option>green</option><option>red</option><option>slate</option></select></label>
                  <button type="button" disabled={!podeEditar} onClick={() => removerColuna(index)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 disabled:opacity-60"><Trash2 className="h-4 w-4" /> Remover</button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  {([
                    ["ativa", "Ativa"], ["exige_observacao", "Exige observação"], ["exige_proxima_acao", "Exige próxima ação"], ["bloqueada_operador", "Bloqueia operador"], ["etapa_venda", "Etapa de venda"], ["etapa_final", "Etapa final"],
                  ] as Array<[keyof ColunaKanban, string]>).map(([campo, label]) => (
                    <div key={String(campo)} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3"><span className="text-xs font-black text-slate-600">{label}</span><Toggle disabled={!podeEditar} checked={Boolean(coluna[campo])} onChange={(value) => atualizarColuna(index, campo, value)} /></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
