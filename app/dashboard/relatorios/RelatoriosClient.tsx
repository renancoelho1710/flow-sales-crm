"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileDown,
  Filter,
  Gauge,
  Loader2,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

type Aba = "geral" | "equipe" | "colaboradores";
type TipoRelatorio = "simples" | "detalhado" | "personalizado";
type Orientacao = "paisagem" | "vertical";

type RelatoriosData = {
  ok: boolean;
  gerado_em: string;
  filtros: any;
  permissoes: { gestao: boolean };
  resumo: Record<string, number>;
  por_usuario: Array<Record<string, any>>;
  por_loja: Array<Record<string, any>>;
  por_origem: Array<Record<string, any>>;
  importacoes: Array<Record<string, any>>;
  alertas: string[];
  fontes: Record<string, boolean>;
  erro?: string;
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaMes() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}

function dinheiro(valor?: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor || 0));
}

function segundos(valor?: number) {
  const v = Number(valor || 0);
  const m = Math.floor(v / 60);
  const s = v % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function statusTexto(valor?: string | null) {
  return String(valor || "offline")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function limitar(valor: number) {
  return Math.max(0, Math.min(100, Number(valor || 0)));
}

function Card({ titulo, valor, detalhe, icon: Icon, tom }: { titulo: string; valor: string | number; detalhe: string;icon: any; tom: string }) {
  const tons: Record<string, string> = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    red: "border-red-100 bg-red-50 text-red-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{titulo}</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{valor}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{detalhe}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tons[tom] || tons.slate}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Barra({ valor }: { valor: number }) {
  const pct = limitar(valor);
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${pct}%` }} /></div>;
}

function Secao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function RelatoriosClient({ abaInicial, modoGraficos = false }: { abaInicial: Aba; modoGraficos?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [tipo, setTipo] = useState<TipoRelatorio>("detalhado");
  const [orientacaoPdf, setOrientacaoPdf] = useState<Orientacao>("paisagem");
  const [menuDownloadAberto, setMenuDownloadAberto] = useState(false);
  const [inicio, setInicio] = useState(primeiroDiaMes());
  const [fim, setFim] = useState(hojeISO());
  const [usuarioId, setUsuarioId] = useState("todos");
  const [loja, setLoja] = useState("todas");
  const [origem, setOrigem] = useState("todas");
  const [data, setData] = useState<RelatoriosData | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setAba(abaInicial);
  }, [abaInicial]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ inicio, fim, usuario_id: usuarioId, loja, origem, tipo });
    return params.toString();
  }, [inicio, fim, usuarioId, loja, origem, tipo]);

  function montarPdfUrl(formato: Orientacao) {
    const params = new URLSearchParams(query);
    params.set("orientacao", formato);
    params.set("aba", aba);
    return `/api/relatorios/pdf?${params.toString()}`;
  }

  function baixarPdf(formato: Orientacao) {
    setOrientacaoPdf(formato);
    setMenuDownloadAberto(false);
    window.location.href = montarPdfUrl(formato);
  }

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/relatorios?${query}`, { cache: "no-store" });
      const json = (await resposta.json()) as RelatoriosData;
      if (!resposta.ok || !json.ok) throw new Error(json.erro || "Não foi possível carregar relatórios.");
      setData(json);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar relatórios.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [query]);

  function mudarAba(novaAba: Aba) {
    setAba(novaAba);
    const params = new URLSearchParams();
    if (novaAba !== "geral") params.set("aba", novaAba);
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const usuarios = data?.por_usuario || [];
  const lojas = data?.por_loja || [];
  const origens = data?.por_origem || [];
  const melhorUsuario = [...usuarios].sort((a, b) => Number(b.produtividade_score || 0) - Number(a.produtividade_score || 0))[0];
  const mediaConversaoAg = data?.resumo?.conversao_agendamento || 0;
  const mediaConversaoVenda = data?.resumo?.conversao_venda || 0;

  return (
    <main className="flow-premium-page min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1760px] space-y-5">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Relatórios gerenciais</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">Central de inteligência comercial</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                Relatórios de leads, performance, produtividade, conversão, vendas, agendamentos, 3CX, WhatsApp, pausas e operação por colaborador.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuDownloadAberto((atual) => !atual)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15"
                >
                  <FileDown className="h-4 w-4" /> Baixar relatório
                </button>

                {menuDownloadAberto ? (
                  <div className="absolute right-0 top-12 z-30 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                    <button
                      type="button"
                      onClick={() => baixarPdf("paisagem")}
                      className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-blue-50"
                    >
                      <p className="text-sm font-black text-slate-950">Baixar horizontal</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">Melhor para tabelas e produtividade por colaborador.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => baixarPdf("vertical")}
                      className="w-full rounded-xl px-4 py-3 text-left transition hover:bg-blue-50"
                    >
                      <p className="text-sm font-black text-slate-950">Baixar vertical</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">Melhor para resumo executivo e envio rápido.</p>
                    </button>
                  </div>
                ) : null}
              </div>

              <button onClick={carregar} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50">
                <RefreshCw className="h-4 w-4" /> Atualizar
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950"><Filter className="h-4 w-4 text-blue-700" /> Filtros e formato do relatório</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <label className="grid gap-1"><span className="text-xs font-black uppercase text-slate-400">Início</span><input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600" /></label>
            <label className="grid gap-1"><span className="text-xs font-black uppercase text-slate-400">Fim</span><input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600" /></label>
            <label className="grid gap-1"><span className="text-xs font-black uppercase text-slate-400">Tipo</span><select value={tipo} onChange={(e) => setTipo(e.target.value as TipoRelatorio)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600"><option value="simples">Simples</option><option value="detalhado">Detalhado</option><option value="personalizado">Personalizado</option></select></label>
            
            <label className="grid gap-1"><span className="text-xs font-black uppercase text-slate-400">Usuário</span><select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600"><option value="todos">Todos</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>
            <label className="grid gap-1"><span className="text-xs font-black uppercase text-slate-400">Loja/carteira</span><select value={loja} onChange={(e) => setLoja(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600"><option value="todas">Todas</option>{lojas.map((l) => <option key={l.loja} value={l.loja}>{l.loja}</option>)}</select></label>
            <label className="grid gap-1"><span className="text-xs font-black uppercase text-slate-400">Origem</span><select value={origem} onChange={(e) => setOrigem(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600"><option value="todas">Todas</option>{origens.map((o) => <option key={o.origem} value={o.origem}>{o.origem}</option>)}</select></label>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {[
            ["geral", "Geral"],
            ["equipe", "Equipe"],
            ["colaboradores", "Colaboradores"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => mudarAba(key as Aba)} className={`rounded-full border px-4 py-2 text-sm font-black ${aba === key ? "border-blue-200 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{label}</button>
          ))}
          <Link href="/dashboard/relatorios/graficos" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">Gráficos</Link>
        </section>

        {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><AlertTriangle className="mr-2 inline h-5 w-5" />{erro}</div> : null}
        {carregando ? <div className="grid min-h-[340px] place-items-center rounded-[28px] border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div> : null}

        {data && !carregando ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <Card titulo="Leads" valor={data.resumo.leads_recebidos || 0} detalhe="Recebidos no período" icon={Users} tom="blue" />
              <Card titulo="Trabalhados" valor={data.resumo.leads_trabalhados || 0} detalhe="Com interação registrada" icon={CheckCircle2} tom="emerald" />
              <Card titulo="Agendamentos" valor={data.resumo.agendamentos || 0} detalhe="Visitas/retornos" icon={CalendarDays} tom="violet" />
              <Card titulo="Vendas" valor={data.resumo.vendas_confirmadas || 0} detalhe="Confirmadas" icon={WalletCards} tom="emerald" />
              <Card titulo="Ligações" valor={data.resumo.ligacoes || 0} detalhe={`TMA ${segundos(data.resumo.tma_segundos)}`} icon={PhoneCall} tom="orange" />
              <Card titulo="WhatsApp" valor={data.resumo.whatsapp_mensagens || 0} detalhe={`${data.resumo.whatsapp_conversas || 0} conversas`} icon={MessageCircle} tom="blue" />
            </section>

            {data.alertas?.length ? (
              <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-black text-amber-800">Pontos de atenção gerencial</p>
                <div className="mt-3 grid gap-2">
                  {data.alertas.map((alerta, index) => <p key={index} className="text-sm font-bold text-amber-800">• {alerta}</p>)}
                </div>
              </section>
            ) : null}

            {aba === "geral" ? (
              <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                <Secao>
                  <h2 className="text-xl font-black text-slate-950">Relatório geral executivo</h2>
                  <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-700">
                    <p>Conversão para agendamento: <strong>{mediaConversaoAg}%</strong>. Conversão para venda confirmada: <strong>{mediaConversaoVenda}%</strong>.</p>
                    <p>Perdas/oportunidades arquivadas: <strong>{data.resumo.leads_arquivados || 0}</strong>. Leads sem primeiro contato: <strong>{data.resumo.leads_sem_contato || 0}</strong>.</p>
                    <p>Resultado financeiro real só deve ser considerado quando venda e valor/margem estiverem validados. Quando o CRM não tiver valor real, o relatório separa confirmado, previsto e perdas operacionais.</p>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-700">Avanço</p><p className="mt-2 text-sm font-bold text-slate-700">{data.resumo.leads_trabalhados || 0} leads trabalhados no período.</p></div>
                    <div className="rounded-2xl bg-orange-50 p-4"><p className="text-xs font-black uppercase text-orange-700">Risco</p><p className="mt-2 text-sm font-bold text-slate-700">{data.resumo.leads_sem_contato || 0} sem primeiro contato.</p></div>
                    <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-black uppercase text-blue-700">Melhor colaborador</p><p className="mt-2 text-sm font-bold text-slate-700">{melhorUsuario?.nome || "Sem dados"}</p></div>
                  </div>
                </Secao>
                <Secao>
                  <h2 className="text-xl font-black text-slate-950">Fontes conectadas</h2>
                  <div className="mt-4 grid gap-2">
                    {Object.entries(data.fontes || {}).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold"><span>{key}</span><span className={value ? "text-emerald-700" : "text-orange-700"}>{value ? "OK" : "Fallback / ausente"}</span></div>)}
                  </div>
                  <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-700">WhatsApp depende do conector alimentando as tabelas de conversas e mensagens. Se o conector não estiver rodando, o relatório mostra fallback pelas interações do lead.</p>
                </Secao>
              </section>
            ) : null}

            {aba === "equipe" ? (
              <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <Secao>
                  <h2 className="text-xl font-black text-slate-950">Equipe consolidada</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Visão de gestão: volume da equipe, gargalos e ranking saudável de produção.</p>
                  <div className="mt-5 grid gap-3">
                    {usuarios.slice(0, 8).map((u) => (
                      <div key={u.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div><p className="font-black text-slate-950">{u.nome}</p><p className="text-xs font-bold text-slate-500">{statusTexto(u.perfil)} • {statusTexto(u.status_operacional)}</p></div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">Score {u.produtividade_score || 0}</span>
                        </div>
                        <Barra valor={Number(u.produtividade_score || 0) / 3} />
                        <p className="mt-2 text-xs font-bold text-slate-500">{u.leads_trabalhados || 0} trabalhados •{u.agendamentos || 0} agendamentos • {u.vendas_confirmadas || 0} vendas</p>
                      </div>
                    ))}
                  </div>
                </Secao>
                <Secao>
                  <h2 className="text-xl font-black text-slate-950">Produtividade da equipe</h2>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="py-3">Colaborador</th><th>Status</th><th>Leads</th><th>Lig.</th><th>Wpp</th><th>Agend.</th><th>Vendas</th><th>Score</th></tr></thead>
                      <tbody>{usuarios.map((u) => <tr key={u.id} className="border-b border-slate-100 font-bold text-slate-700"><td className="py-3 text-slate-950">{u.nome}</td><td>{statusTexto(u.status_operacional)}</td><td>{u.leads}</td><td>{u.ligacoes}</td><td>{u.whatsapp_mensagens}</td><td>{u.agendamentos}</td><td>{u.vendas_confirmadas}</td><td>{u.produtividade_score}</td></tr>)}</tbody>
                    </table>
                  </div>
                </Secao>
              </section>
            ) : null}

            {aba === "colaboradores" ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Desempenho operacional por colaborador</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Resumo individual de produtividade: leads recebidos, leads trabalhados, ligações, TMA, WhatsApp, agendamentos, vendas, pausas e indicador de desempenho.</p>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="py-3">Usuário</th><th>Perfil</th><th>Leads</th><th>Trab.</th><th>Ligações</th><th>Válidas</th><th>TMA</th><th>Wpp conv.</th><th>Wpp msg.</th><th>Agend.</th><th>Vendas</th><th>Pausas</th><th>Score</th></tr></thead>
                    <tbody>
                      {usuarios.map((u) => <tr key={u.id} className="border-b border-slate-100 font-bold text-slate-700"><td className="py-3 text-slate-950">{u.nome}</td><td>{statusTexto(u.perfil)}</td><td>{u.leads}</td><td>{u.leads_trabalhados}</td><td>{u.ligacoes}</td><td>{u.ligacoes_validas}</td><td>{segundos(u.tma_segundos)}</td><td>{u.whatsapp_conversas}</td><td>{u.whatsapp_mensagens}</td><td>{u.agendamentos}</td><td>{u.vendas_confirmadas}</td><td>{u.pausas_minutos || 0} min</td><td>{u.produtividade_score}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {modoGraficos ? (
              <section className="grid gap-5 xl:grid-cols-2">
                <Secao>
                  <h2 className="text-xl font-black text-slate-950">Conversão por loja/carteira</h2>
                  <div className="mt-5 grid gap-4">
                    {lojas.map((l) => <div key={l.loja} className="rounded-2xl bg-slate-50 p-4"><div className="mb-2 flex justify-between text-sm font-black"><span>{l.loja}</span><span>{l.conversao}%</span></div><Barra valor={l.conversao} /></div>)}
                  </div>
                </Secao>
                <Secao>
                  <h2 className="text-xl font-black text-slate-950">Origem dos leads</h2>
                  <div className="mt-5 grid gap-4">
                    {origens.map((o) => <div key={o.origem} className="rounded-2xl bg-slate-50 p-4"><div className="mb-2 flex justify-between text-sm font-black"><span>{o.origem}</span><span>{o.leads} leads</span></div><Barra valor={data.resumo.leads_recebidos ? (o.leads / data.resumo.leads_recebidos) * 100 : 0} /></div>)}
                  </div>
                </Secao>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
