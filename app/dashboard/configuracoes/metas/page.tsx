"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Save, Target, Users } from "lucide-react";
import Link from "next/link";

type Usuario = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string | null;
  recebe_leads: boolean | null;
  status_operacional: string | null;
};

type Meta = {
  id?: string;
  usuario_id: string;
  meta_diaria_agendamentos: number;
  meta_semanal_agendamentos: number;
  meta_mensal_agendamentos: number;
  meta_mensal_vendas: number;
  comissao_por_venda: number | null;
  ativo?: boolean;
  atualizado_em?: string | null;
};

type Dados = {
  ok: boolean;
  usuarios: Usuario[];
  metas: Meta[];
  erro?: string;
};

function metaPadrao(usuarioId: string): Meta {
  return {
    usuario_id: usuarioId,
    meta_diaria_agendamentos: 4,
    meta_semanal_agendamentos: 20,
    meta_mensal_agendamentos: 80,
    meta_mensal_vendas: 8,
    comissao_por_venda: null,
    ativo: true,
  };
}

function dinheiro(valor: number | null) {
  if (valor === null || valor === undefined) return "Sem comissão definida";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function parseNumeroCampo(valor: string, fallback = 0) {
  if (valor.trim() === "") return fallback;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return fallback;
  return Math.max(0, numero);
}

function parseComissao(valor: string) {
  if (valor.trim() === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return Math.max(0, numero);
}

export default function Page() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function carregar() {
    try {
      setCarregando(true);
      setErro("");
      const resposta = await fetch("/api/metas/configuracoes", { cache: "no-store" });
      const dados = (await resposta.json()) as Dados;
      if (!resposta.ok || !dados.ok) throw new Error(dados.erro || "Não foi possível carregar metas.");

      const mapa: Record<string, Meta> = {};
      for (const usuario of dados.usuarios || []) mapa[usuario.id] = metaPadrao(usuario.id);
      for (const meta of dados.metas || []) mapa[meta.usuario_id] = { ...metaPadrao(meta.usuario_id), ...meta };

      setUsuarios(dados.usuarios || []);
      setMetas(mapa);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar metas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((usuario) => [usuario.nome, usuario.email, usuario.perfil].filter(Boolean).join(" ").toLowerCase().includes(termo));
  }, [busca, usuarios]);

  function alterarMeta(usuarioId: string, campo: keyof Meta, valor: number | null) {
    setMetas((atuais) => ({
      ...atuais,
      [usuarioId]: {
        ...(atuais[usuarioId] || metaPadrao(usuarioId)),
        [campo]: valor,
      },
    }));
  }

  async function salvar(usuarioId: string) {
    const meta = metas[usuarioId] || metaPadrao(usuarioId);
    try {
      setSalvandoId(usuarioId);
      setErro("");
      setSucesso("");
      const resposta = await fetch("/api/metas/configuracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok || !dados?.ok) throw new Error(dados?.erro || "Não foi possível salvar a meta.");
      setMetas((atuais) => ({ ...atuais, [usuarioId]: { ...metaPadrao(usuarioId), ...dados.meta } }));
      setSucesso("Meta atualizada com sucesso.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar meta.");
    } finally {
      setSalvandoId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Configurações</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">Metas comerciais</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Defina metas por colaborador. A comissão é opcional e pode ficar em branco quando a operação não usar pagamento por resgate.
              </p>
            </div>
            <Link href="/dashboard" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-blue-100 bg-blue-50 p-5"><Target className="h-6 w-6 text-blue-700" /><p className="mt-3 text-sm font-black text-slate-950">Meta acumulada</p><p className="mt-1 text-xs font-bold text-blue-700">O que não foi feito entra na conta da próxima rotina.</p></div>
          <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-5"><CheckCircle2 className="h-6 w-6 text-emerald-700" /><p className="mt-3 text-sm font-black text-slate-950">Gordurinha positiva</p><p className="mt-1 text-xs font-bold text-emerald-700">Quando passa da meta, o sistema mostra vantagem.</p></div>
          <div className="rounded-[26px] border border-violet-100 bg-violet-50 p-5"><Users className="h-6 w-6 text-violet-700" /><p className="mt-3 text-sm font-black text-slate-950">Gestão por pessoa</p><p className="mt-1 text-xs font-bold text-violet-700">Cada colaborador pode ter uma meta diferente.</p></div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">Colaboradores</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Ajuste metas por colaborador. Comissão é opcional.</p>
            </div>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar colaborador..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 md:w-[360px]"
            />
          </div>

          {erro ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">{erro}</div> : null}
          {sucesso ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">{sucesso}</div> : null}

          {carregando ? (
            <div className="grid place-items-center rounded-3xl border border-slate-100 bg-slate-50 py-14">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
              <p className="mt-3 text-sm font-black text-slate-500">Carregando metas...</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {usuariosFiltrados.map((usuario) => {
                const meta = metas[usuario.id] || metaPadrao(usuario.id);
                return (
                  <article key={usuario.id} className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-4 xl:grid-cols-[minmax(210px,1.2fr)_minmax(560px,2.8fr)_auto] xl:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{usuario.nome}</p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">{usuario.email || "Sem e-mail"} • {usuario.perfil || "perfil"}</p>
                        <p className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                          {usuario.recebe_leads ? "Recebe leads" : "Não recebe leads"}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label className="grid gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Meta dia</span>
                          <input type="number" min={0} value={meta.meta_diaria_agendamentos} onChange={(event) => alterarMeta(usuario.id, "meta_diaria_agendamentos", parseNumeroCampo(event.target.value, 0))} className="h-10 w-full max-w-[120px] rounded-xl border border-slate-200 px-3 text-sm font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                        </label>

                        <label className="grid gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Meta semana</span>
                          <input type="number" min={0} value={meta.meta_semanal_agendamentos} onChange={(event) => alterarMeta(usuario.id, "meta_semanal_agendamentos", parseNumeroCampo(event.target.value, 0))} className="h-10 w-full max-w-[120px] rounded-xl border border-slate-200 px-3 text-sm font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                        </label>

                        <label className="grid gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Meta mês</span>
                          <input type="number" min={0} value={meta.meta_mensal_agendamentos} onChange={(event) => alterarMeta(usuario.id, "meta_mensal_agendamentos", parseNumeroCampo(event.target.value, 0))} className="h-10 w-full max-w-[120px] rounded-xl border border-slate-200 px-3 text-sm font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                        </label>

                        <label className="grid gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Vendas mês</span>
                          <input type="number" min={0} value={meta.meta_mensal_vendas} onChange={(event) => alterarMeta(usuario.id, "meta_mensal_vendas", parseNumeroCampo(event.target.value, 0))} className="h-10 w-full max-w-[120px] rounded-xl border border-slate-200 px-3 text-sm font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                        </label>

                        <label className="grid gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Comissão opcional</span>
                          <input type="number" min={0} value={meta.comissao_por_venda ?? ""} placeholder="Opcional" onChange={(event) => alterarMeta(usuario.id, "comissao_por_venda", parseComissao(event.target.value))} className="h-10 w-full max-w-[150px] rounded-xl border border-slate-200 px-3 text-sm font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                          <span className="text-[10px] font-bold text-slate-400">{dinheiro(meta.comissao_por_venda)}</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => salvar(usuario.id)}
                        disabled={salvandoId === usuario.id}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70 xl:w-[120px]"
                      >
                        {salvandoId === usuario.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
