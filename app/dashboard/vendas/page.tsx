"use client";

import { VendasDashboardResumo } from "@/components/vendas/VendasDashboardResumo";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FileWarning,
  Loader2,
  RefreshCcw,
  Search,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Venda = {
  id: string;
  placa: string;
  veiculo: string | null;
  cliente: string | null;
  vendedor_nome: string | null;
  loja: string | null;
  data_venda: string | null;
  instituicao: string | null;
  status: string;
  conferencia_status: string | null;
  presente_acompanhamento: boolean;
  presente_vendidos: boolean;
  total_linhas_acompanhamento: number;
  total_valor_acompanhamento: number;
  origem: string | null;
  numero_proposta?: string | null;
  data_proposta?: string | null;
  status_proposta?: string | null;
  data_aprovacao?: string | null;
  responsavel_aprovacao?: string | null;
  total_venda?: number | null;
  origem_status?: string | null;
  observacao: string | null;
  atualizado_em: string | null;
  ultima_sincronizacao: string | null;
  operador_id?: string | null;
  operador_nome?: string | null;
  operador_email?: string | null;
  validacao_status?: string | null;
  elegivel_comissao?: boolean | null;
  motivo_recusa?: string | null;
  agendamento_id?: string | null;
  lead_id?: string | null;
  financeiro_detalhes?: Array<{
    parcela: string | null;
    instituicao: string | null;
    valor: number | null;
  }>;
  parcela_tipo?: string | null;
  valor_parcela?: number | null;
  operador_vinculado_por_nome?: string | null;
  operador_vinculado_em?: string | null;
  operador_vinculo_atualizado_por_nome?: string | null;
  operador_vinculo_atualizado_em?: string | null;
  operador_vinculo_removido_por_nome?: string | null;
  operador_vinculo_removido_em?: string | null;
  operador_vinculo_remocao_motivo?: string | null;
};

type RetornoVendas = {
  ok: boolean;
  erro?: string;
  pode_gerenciar?: boolean;
  vendas?: Venda[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    from: number;
    to: number;
  };
};

type AgendamentoOpcao = {
  id: string;
  lead_id: string | null;
  lead_nome: string;
  lead_telefone: string;
  veiculo_interesse: string;
  data_agendamento: string | null;
  compareceu: boolean | null;
  status: string | null;
  confirmacao_status: string | null;
  vendedor_nome: string;
  vendedor_email: string;
  loja: string;
  operador_id: string | null;
  operador_nome: string;
  score: number;
};

type RetornoSync = {
  ok: boolean;
  erro?: string;
  acompanhamento_placas?: number;
  vendidos_placas?: number;
  total_processadas?: number;
  criadas?: number;
  confirmadas?: number;
  so_acompanhamento?: number;
  so_vendidos?: number;
  divergentes?: number;
  sincronizado_em?: string;
};

const STATUS_LABEL: Record<string, string> = {
  confirmado: "Venda confirmada",
  so_acompanhamento: "Conferir Dados financeiros",
  so_vendidos: "Conferir Dados do veículo",
  divergente: "Divergente",
};

const STATUS_BADGE: Record<string, string> = {
  confirmado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  so_acompanhamento: "border-amber-200 bg-amber-50 text-amber-700",
  so_vendidos: "border-orange-200 bg-orange-50 text-orange-700",
  divergente: "border-red-200 bg-red-50 text-red-700",
};

function dinheiro(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBr(valor: string | null | undefined) {
  if (!valor) return "Sem data";

  const data = new Date(`${valor}T12:00:00`);

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleDateString("pt-BR");
}

function dataHoraBr(valor: string | null | undefined) {
  if (!valor) return "Nunca";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleString("pt-BR");
}

export default function Page() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroLoja, setFiltroLoja] = useState("todas");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroOperador, setFiltroOperador] = useState("");
  const [filtroCarro, setFiltroCarro] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
    from: 0,
    to: 0,
  });
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [syncMensagem, setSyncMensagem] = useState("");
  const [syncProgresso, setSyncProgresso] = useState(0);
  const [resultadoSync, setResultadoSync] = useState<RetornoSync | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [exportMenuAberto, setExportMenuAberto] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);

  async function carregar() {
    try {
      setCarregando(true);
      setErro("");

      const params = new URLSearchParams();

      params.set("visao", "acompanhamento");
      params.set("page", String(pagina));
      params.set("pageSize", String(pageSize));

      if (busca) params.set("busca", busca);
      if (filtroStatus !== "todos") params.set("status", filtroStatus);
      if (filtroLoja !== "todas") params.set("loja", filtroLoja);
      if (filtroVendedor) params.set("vendedor", filtroVendedor);
      if (filtroOperador) params.set("operador", filtroOperador);
      if (filtroCarro) params.set("carro", filtroCarro);
      if (valorMin) params.set("valor_min", valorMin);
      if (valorMax) params.set("valor_max", valorMax);
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);

      const resposta = await fetch(`/api/vendas?${params.toString()}`);
      const json = (await resposta.json()) as RetornoVendas;

      if (!json.ok) {
        setErro(json.erro || "Erro ao carregar vendas.");
        setVendas([]);
        return;
      }

      setVendas(json.vendas || []);
      setPagination(
        json.pagination || {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 1,
          from: 0,
          to: 0,
        },
      );
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar vendas.",
      );
      setVendas([]);
    } finally {
      setCarregando(false);
    }
  }
  function abrirRelatorio(formato: "pdf" | "xls") {
    const params = new URLSearchParams();

    params.set("formato", formato);

    params.set("visao", "acompanhamento");
    params.set("page", String(pagina));
    params.set("pageSize", String(pageSize));

    if (busca) params.set("busca", busca);
    if (filtroStatus !== "todos") params.set("status", filtroStatus);
    if (filtroLoja !== "todas") params.set("loja", filtroLoja);
    if (filtroVendedor) params.set("vendedor", filtroVendedor);
    if (filtroOperador) params.set("operador", filtroOperador);
    if (filtroCarro) params.set("carro", filtroCarro);
    if (valorMin) params.set("valor_min", valorMin);
    if (valorMax) params.set("valor_max", valorMax);
    if (dataInicio) params.set("data_inicio", dataInicio);
    if (dataFim) params.set("data_fim", dataFim);

    window.open(`/api/vendas/relatorio?${params.toString()}`, "_blank");
  }

  async function sincronizar() {
    try {
      setSincronizando(true);
      setErro("");
      setResultadoSync(null);

      setSyncMensagem("Preparando atualização...");
      setSyncProgresso(10);

      await new Promise((resolve) => setTimeout(resolve, 300));
      setSyncMensagem("Lendo planilha de acompanhamento financeiro...");
      setSyncProgresso(25);

      await new Promise((resolve) => setTimeout(resolve, 300));
      setSyncMensagem("Conferindo status das propostas...");
      setSyncProgresso(45);

      await new Promise((resolve) => setTimeout(resolve, 300));
      setSyncMensagem("Cruzando Flash, vendidos e propostas...");
      setSyncProgresso(65);

      const resposta = await fetch("/api/vendas/sincronizar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data_inicio: dataInicio || null,
          data_fim: dataFim || null,
        }),
      });

      setSyncMensagem("Atualizando vendas no sistema...");
      setSyncProgresso(85);

      const json = (await resposta.json()) as RetornoSync;

      if (!json.ok) {
        setSyncMensagem("Erro ao atualizar.");
        setSyncProgresso(0);
        setErro(json.erro || "Erro ao sincronizar planilha.");
        return;
      }

      setResultadoSync(json);
      setSyncMensagem("Atualização concluída.");
      setSyncProgresso(100);
      setPagina(1);

      await carregar();

      setTimeout(() => {
        setSyncMensagem("");
        setSyncProgresso(0);
      }, 5000);
    } catch (error) {
      setSyncMensagem("Erro ao atualizar.");
      setSyncProgresso(0);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao sincronizar planilha.",
      );
    } finally {
      setSincronizando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, pageSize]);

  const lojas = useMemo(() => {
    const lista = new Set<string>();

    for (const venda of vendas) {
      if (venda.loja) lista.add(venda.loja);
    }

    return Array.from(lista).sort();
  }, [vendas]);

  const indicadores = useMemo(() => {
    const confirmadas = vendas.filter(
      (venda) => venda.conferencia_status === "confirmado",
    ).length;

    const soAcompanhamento = vendas.filter(
      (venda) => venda.conferencia_status === "so_acompanhamento",
    ).length;

    const soVendidos = vendas.filter(
      (venda) => venda.conferencia_status === "so_vendidos",
    ).length;

    const divergentes = vendas.filter(
      (venda) => venda.conferencia_status === "divergente",
    ).length;

    return {
      total: vendas.length,
      confirmadas,
      soAcompanhamento,
      soVendidos,
      divergentes,
    };
  }, [vendas]);

  const ultimaSincronizacao = useMemo(() => {
    const datas = vendas
      .map((venda) => venda.ultima_sincronizacao || venda.atualizado_em)
      .filter(Boolean)
      .sort()
      .reverse();

    return datas[0] || null;
  }, [vendas]);

  return (
    <main className="flow-premium-page apple-page-shell">
      <div className="apple-page-stack">
      <section className="apple-surface p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="apple-eyebrow">
              Vendas
            </p>
            <h1 className="apple-title text-[2.4rem]">
              Acompanhamento de vendas
            </h1>
            <p className="apple-copy max-w-4xl">
              Acompanhe vendas confirmadas, pendências comerciais e divergências
              em um painel único, limpo e fácil de conferir.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <button
                onClick={() => setExportMenuAberto((aberto) => !aberto)}
                className="apple-btn-secondary"
              >
                <Download className="h-4 w-4" />
                Baixar relatório
              </button>

              {exportMenuAberto ? (
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    onClick={() => {
                      setExportMenuAberto(false);
                      abrirRelatorio("pdf");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4 text-red-600" />
                    Baixar em PDF
                  </button>
                  <button
                    onClick={() => {
                      setExportMenuAberto(false);
                      abrirRelatorio("xls");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Baixar em XLS
                  </button>
                </div>
              ) : null}
            </div>

            <button
              onClick={carregar}
              disabled={carregando || sincronizando}
              className="apple-btn-secondary disabled:opacity-60"
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Atualizar tela
            </button>

            <button
              onClick={sincronizar}
              disabled={sincronizando}
              className="apple-btn-primary disabled:opacity-60"
            >
              {sincronizando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Atualizar da planilha
            </button>
          </div>
        </div>

        <div className="mt-5 apple-soft-card apple-tint-blue px-4 py-3 text-xs font-bold text-blue-800">
          Última sincronização: {dataHoraBr(ultimaSincronizacao)}
        </div>
      </section>

      <VendasDashboardResumo
        titulo="Dashboard geral das vendas"
        subtitulo="Resumo de conferência, validação, lojas, vendedores e operadores."
      />

      {syncMensagem ? (
        <section className="apple-soft-card apple-tint-blue p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-black text-blue-800">{syncMensagem}</p>
            <span className="text-sm font-black text-blue-800">
              {syncProgresso}%
            </span>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-blue-700 transition-all duration-500"
              style={{ width: `${syncProgresso}%` }}
            />
          </div>
        </section>
      ) : null}

      {erro ? (
        <div className="apple-soft-card apple-tint-red px-5 py-4 text-sm font-bold text-red-700">
          {erro}
        </div>
      ) : null}

      {resultadoSync?.ok ? (
        <div className="apple-soft-card apple-tint-emerald px-5 py-4 text-sm font-bold text-emerald-800">
          Planilha sincronizada: {resultadoSync.total_processadas || 0} placas
          processadas, {resultadoSync.confirmadas || 0} confirmadas,{" "}
          {resultadoSync.so_acompanhamento || 0} só no acompanhamento e{" "}
          {resultadoSync.so_vendidos || 0} só na Estoque.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Indicador
          titulo="Total conferido"
          valor={indicadores.total}
          descricao="Placas únicas processadas"
          icon={ClipboardCheck}
          classe="border-slate-200 bg-white text-slate-950"
        />
        <Indicador
          titulo="Confirmadas"
          valor={indicadores.confirmadas}
          descricao="Nas duas abas"
          icon={CheckCircle2}
          classe="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
        <Indicador
          titulo="Conferir Dados financeiros"
          valor={indicadores.soAcompanhamento}
          descricao="Pagamento sem vendido"
          icon={AlertTriangle}
          classe="border-amber-200 bg-amber-50 text-amber-800"
        />
        <Indicador
          titulo="Conferir Dados do veículo"
          valor={indicadores.soVendidos}
          descricao="Vendido sem acompanhamento"
          icon={FileWarning}
          classe="border-orange-200 bg-orange-50 text-orange-800"
        />
        <Indicador
          titulo="Divergências"
          valor={indicadores.divergentes}
          descricao="Conferir manualmente"
          icon={AlertTriangle}
          classe="border-red-200 bg-red-50 text-red-800"
        />
      </section>

      <section className="apple-card p-5">
        <div className="grid gap-4">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_180px_180px_140px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPagina(1);
                    carregar();
                  }
                }}
                placeholder="Buscar por placa, cliente, veículo, vendedor ou operador..."
                className="apple-input pl-11 pr-4 text-sm font-semibold text-slate-800"
              />
            </label>

            <select
              value={filtroStatus}
              onChange={(event) => {
                setFiltroStatus(event.target.value);
                setPagina(1);
              }}
              className="apple-select px-4 text-sm font-black text-slate-800"
            >
              <option value="todos">Todos os status</option>
              <option value="confirmado">Venda confirmada</option>
              <option value="so_acompanhamento">Conferir financeiro</option>
              <option value="so_vendidos">Conferir estoque</option>
              <option value="divergente">Divergente</option>
            </select>

            <select
              value={filtroLoja}
              onChange={(event) => {
                setFiltroLoja(event.target.value);
                setPagina(1);
              }}
              className="apple-select px-4 text-sm font-black text-slate-800"
            >
              <option value="todas">Todas as lojas</option>
              {lojas.map((loja) => (
                <option key={loja} value={loja}>
                  Loja {loja}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setPagina(1);
                carregar();
              }}
              className="apple-btn-primary h-12"
            >
              Buscar
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              value={filtroVendedor}
              onChange={(event) => setFiltroVendedor(event.target.value)}
              placeholder="Vendedor"
              className="apple-input px-4 text-sm font-semibold text-slate-800"
            />

            <input
              value={filtroOperador}
              onChange={(event) => setFiltroOperador(event.target.value)}
              placeholder="Operador de resgate"
              className="apple-input px-4 text-sm font-semibold text-slate-800"
            />

            <input
              value={filtroCarro}
              onChange={(event) => setFiltroCarro(event.target.value)}
              placeholder="Carro / modelo"
              className="apple-input px-4 text-sm font-semibold text-slate-800"
            />

            <input
              value={valorMin}
              onChange={(event) => setValorMin(event.target.value)}
              placeholder="Valor mínimo"
              className="apple-input px-4 text-sm font-semibold text-slate-800"
            />

            <input
              value={valorMax}
              onChange={(event) => setValorMax(event.target.value)}
              placeholder="Valor máximo"
              className="apple-input px-4 text-sm font-semibold text-slate-800"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Data inicial
              </span>
              <input
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                className="apple-input px-4 text-sm font-black text-slate-800"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Data final
              </span>
              <input
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className="apple-input px-4 text-sm font-black text-slate-800"
              />
            </label>

            <button
              onClick={() => {
                setBusca("");
                setFiltroStatus("todos");
                setFiltroLoja("todas");
                setFiltroVendedor("");
                setFiltroOperador("");
                setFiltroCarro("");
                setValorMin("");
                setValorMax("");
                setDataInicio("");
                setDataFim("");
                setPagina(1);
              }}
              className="self-end h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:bg-slate-50"
            >
              Limpar filtros
            </button>

            <div className="self-end apple-soft-card apple-tint-blue px-4 py-3 text-xs font-bold text-blue-800">
              Mostrando {pagination.from} até {pagination.to} de{" "}
              {pagination.total} vendas.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        {carregando ? (
          <div className="apple-card p-12 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-black text-slate-600">
              Carregando vendas...
            </p>
          </div>
        ) : vendas.length === 0 ? (
          <div className="apple-card p-12 text-center border-dashed border-slate-300">
            <ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Nenhuma venda encontrada
            </h3>
            <p className="mt-1 text-sm font-semibold text-blue-100">
              Clique em Atualizar da planilha ou ajuste os filtros.
            </p>
          </div>
        ) : (
          vendas.map((venda) => (
            <VendaCard
              key={venda.id}
              venda={venda}
              onClick={() => setVendaSelecionada(venda)}
            />
          ))
        )}
      </section>

      <PaginacaoVendas
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        from={pagination.from}
        to={pagination.to}
        onPageChange={setPagina}
        pageSize={pageSize}
        onPageSizeChange={(novoPageSize) => {
          setPageSize(novoPageSize);
          setPagina(1);
        }}
      />

      {vendaSelecionada ? (
        <DetalheVenda
          venda={vendaSelecionada}
          onClose={() => setVendaSelecionada(null)}
        />
      ) : null}
      </div>
    </main>
  );
}

function PaginacaoVendas({
  page,
  totalPages,
  total,
  from,
  to,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const paginas = Array.from({ length: totalPages })
    .map((_, index) => index + 1)
    .filter((item) => {
      if (item === 1 || item === totalPages) return true;
      return Math.abs(item - page) <= 2;
    });

  if (total === 0) return null;

  return (
    <section className="apple-card flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-sm font-bold text-slate-500">
          Mostrando <strong className="text-slate-950">{from}</strong> até{" "}
          <strong className="text-slate-950">{to}</strong> de{" "}
          <strong className="text-slate-950">{total}</strong> vendas.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="apple-select h-10 px-3 text-sm font-black text-slate-700"
        >
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
        </select>

        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page <= 1}
          className="apple-btn-secondary h-10 px-4 text-sm font-black text-slate-700 disabled:opacity-40"
        >
          Anterior
        </button>

        {paginas.map((item, index) => {
          const anterior = paginas[index - 1];
          const mostrarSeparador = anterior && item - anterior > 1;

          return (
            <span key={item} className="flex gap-2">
              {mostrarSeparador ? (
                <span className="px-2 py-2 text-sm font-black text-slate-400">
                  ...
                </span>
              ) : null}

              <button
                onClick={() => onPageChange(item)}
                className={`h-10 rounded-xl px-4 text-sm font-black transition ${
                  item === page
                    ? "apple-btn-primary text-white"
                    : "apple-btn-secondary text-slate-700"
                }`}
              >
                {item}
              </button>
            </span>
          );
        })}

        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page >= totalPages}
          className="apple-btn-secondary h-10 px-4 text-sm font-black text-slate-700 disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </section>
  );
}
function Indicador({
  titulo,
  valor,
  descricao,
  icon: Icon,
  classe,
}: {
  titulo: string;
  valor: number;
  descricao: string;
  icon: React.ElementType;
  classe: string;
}) {
  return (
    <article className={`apple-stat-card ${classe}`}>
      <div className="apple-stat-head">
        <div>
          <p className="apple-stat-title opacity-70">{titulo}</p>
          <strong className="apple-stat-value mt-3 block">{valor}</strong>
          <span className="apple-stat-note mt-1 block opacity-80">{descricao}</span>
        </div>
        <div className="apple-stat-icon">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function VendaCard({ venda, onClick }: { venda: Venda; onClick: () => void }) {
  const status = venda.conferencia_status || "divergente";
  const badge = STATUS_BADGE[status] || STATUS_BADGE.divergente;
  const label = STATUS_LABEL[status] || "Divergente";

  return (
    <article
      onClick={onClick}
      className="apple-list-card cursor-pointer p-5"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-slate-950 px-3 py-1 text-sm font-black text-white">
              {venda.placa}
            </span>

            <span
              className={`rounded-xl border px-3 py-1 text-xs font-black ${badge}`}
            >
              {label}
            </span>

            {venda.validacao_status === "validado" ? (
              <span className="rounded-xl bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Venda confirmada para operador
              </span>
            ) : venda.validacao_status === "recusado" ? (
              <span className="rounded-xl bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                Vínculo recusado
              </span>
            ) : (
              <span className="rounded-xl bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                Validação pendente
              </span>
            )}
          </div>

          <h3 className="mt-3 text-lg font-black leading-6 text-slate-950">
            {venda.veiculo || "Veículo não informado"}
          </h3>

          <div className="mt-4 grid gap-3 text-xs font-bold text-slate-500 md:grid-cols-2 xl:grid-cols-5">
            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Cliente: {venda.cliente || "Não informado"}
            </span>

            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Vendedor: {venda.vendedor_nome || "Não informado"}
            </span>

            <span className="inline-flex items-center gap-2">
              <Store className="h-4 w-4" />
              {venda.loja ? `Loja ${venda.loja}` : "Loja não informada"}
            </span>

            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {dataBr(venda.data_venda)}
            </span>

            <span className="inline-flex items-center gap-2 font-black text-slate-800">
              Valor: {dinheiro(venda.total_valor_acompanhamento)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <MiniSelo
              ativo={venda.presente_acompanhamento}
              texto="Dados financeiros"
            />
            <MiniSelo
              ativo={venda.presente_vendidos}
              texto="Dados do veículo"
            />

            {venda.operador_nome ? (
              <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                Operador de resgate: {venda.operador_nome}
              </span>
            ) : (
              <span className="rounded-xl bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                Sem operador vinculado
              </span>
            )}

            {venda.agendamento_id ? (
              <span className="rounded-xl bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Agendamento vinculado
              </span>
            ) : (
              <span className="rounded-xl bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                Sem agendamento
              </span>
            )}

            {venda.total_linhas_acompanhamento > 1 ? (
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                {venda.total_linhas_acompanhamento} linhas agrupadas
              </span>
            ) : null}
          </div>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className="apple-btn-secondary"
        >
          Ver detalhes
        </button>
      </div>
    </article>
  );
}
function MiniSelo({ ativo, texto }: { ativo: boolean; texto: string }) {
  return (
    <span
      className={`rounded-xl px-3 py-1 text-xs font-black ${
        ativo ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {ativo ? "✓" : "×"} {texto}
    </span>
  );
}

function DetalheVenda({
  venda,
  onClose,
}: {
  venda: Venda;
  onClose: () => void;
}) {
  const status = venda.conferencia_status || "divergente";
  const label = STATUS_LABEL[status] || "Divergência";

  const valorPrincipal =
    venda.total_venda && venda.total_venda > 0
      ? venda.total_venda
      : venda.total_valor_acompanhamento || 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md">
      <div className="apple-detail-card max-h-[92vh] w-full max-w-6xl overflow-hidden shadow-2xl">
        <div className="border-b border-white/70 bg-white/80 px-7 py-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-slate-950 px-3 py-1 text-sm font-black text-white">
                  {venda.placa}
                </span>

                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                  {label}
                </span>

                <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {venda.status_proposta || "Sem status de proposta"}
                </span>

                <span
                  className={`rounded-xl px-3 py-1 text-xs font-black ${
                    venda.validacao_status === "validado"
                      ? "bg-emerald-50 text-emerald-700"
                      : venda.validacao_status === "recusado"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {venda.validacao_status === "validado"
                    ? "Venda confirmada para operador"
                    : venda.validacao_status === "recusado"
                      ? "Vínculo recusado"
                      : "Aguardando vínculo"}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
                {venda.veiculo || "Veículo não informado"}
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Cliente: {venda.cliente || "Não informado"} · Vendedor:{" "}
                {venda.vendedor_nome || "Não informado"}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[74vh] overflow-auto bg-slate-50/70 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PainelResumo
              titulo="Cliente"
              valor={venda.cliente || "Não informado"}
              detalhe={venda.vendedor_nome || "Vendedor não informado"}
            />
            <PainelResumo
              titulo="Loja / Data"
              valor={venda.loja ? `Loja ${venda.loja}` : "Loja não informada"}
              detalhe={dataBr(venda.data_venda)}
            />
            <PainelResumo
              titulo="Total financeiro da placa"
              valor={dinheiro(valorPrincipal)}
              detalhe={
                venda.instituicao || "Instituição / origem não informada"
              }
            />
            <PainelResumo
              titulo="Operador de resgate"
              valor={venda.operador_nome || "Não vinculado"}
              detalhe={venda.operador_email || "Aguardando vínculo"}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                Proposta
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <LinhaDetalhe
                  label="Número"
                  valor={venda.numero_proposta || "Não informado"}
                />
                <LinhaDetalhe
                  label="Status"
                  valor={venda.status_proposta || "Sem status"}
                />
                <LinhaDetalhe
                  label="Data proposta"
                  valor={dataBr(venda.data_proposta)}
                />
                <LinhaDetalhe
                  label="Data aprovação"
                  valor={dataBr(venda.data_aprovacao)}
                />
                <LinhaDetalhe
                  label="Responsável aprovação"
                  valor={venda.responsavel_aprovacao || "Não informado"}
                />
                <LinhaDetalhe
                  label="Total venda"
                  valor={dinheiro(venda.total_venda || 0)}
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                Movimentações financeiras
              </p>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-xs font-black uppercase tracking-[0.16em] text-white">
                    <tr>
                      <th className="px-4 py-3">Tipo / parcela</th>
                      <th className="px-4 py-3">Instituição / origem</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(venda.financeiro_detalhes?.length
                      ? venda.financeiro_detalhes
                      : [
                          {
                            parcela: venda.parcela_tipo || "Não informado",
                            instituicao: venda.instituicao || null,
                            valor:
                              venda.valor_parcela ||
                              venda.total_valor_acompanhamento ||
                              0,
                          },
                        ]
                    ).map((item, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {item.parcela || "Não informado"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-500">
                          {item.instituicao || "Não informado"}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {dinheiro(item.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
              Vínculo do resgate
            </p>

            <ValidacaoVenda venda={venda} />
          </section>
        </div>
      </div>
    </div>
  );
}

function ValidacaoVenda({ venda }: { venda: Venda }) {
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editando, setEditando] = useState(
    !venda.operador_nome && !venda.operador_email,
  );
  const [operadorNome, setOperadorNome] = useState(venda.operador_nome || "");
  const [operadorEmail, setOperadorEmail] = useState(
    venda.operador_email || "",
  );

  function dataHoraBr(valor: string | null | undefined) {
    if (!valor) return "Não registrado";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return valor;

    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function vincularOperador() {
    if (!operadorNome.trim() && !operadorEmail.trim()) {
      setMensagem("Informe nome ou e-mail do operador de resgate.");
      return;
    }

    try {
      setSalvando(true);
      setMensagem(
        venda.operador_nome
          ? "Atualizando vínculo do operador de resgate..."
          : "Vinculando operador de resgate...",
      );

      const resposta = await fetch(
        `/api/vendas/${venda.id}/vincular-operador`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placa: venda.placa,
            operador_nome: operadorNome,
            operador_email: operadorEmail,
          }),
        },
      );

      const json = await resposta.json();

      if (!json.ok) {
        setMensagem(json.erro || "Erro ao salvar vínculo do resgate.");
        return;
      }

      setMensagem(json.mensagem || "Vínculo do resgate salvo.");
      setEditando(false);
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Erro ao salvar vínculo do resgate.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerVinculo() {
    if (!venda.operador_nome && !venda.operador_email) {
      setMensagem("Essa venda ainda não tem operador vinculado.");
      return;
    }

    const motivo = window.prompt("Informe o motivo para remover o vínculo:");

    if (!motivo) return;

    try {
      setSalvando(true);
      setMensagem("Removendo vínculo do operador de resgate...");

      const resposta = await fetch(
        `/api/vendas/${venda.id}/vincular-operador`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo, placa: venda.placa }),
        },
      );

      const json = await resposta.json();

      if (!json.ok) {
        setMensagem(json.erro || "Erro ao remover vínculo.");
        return;
      }

      setMensagem(json.mensagem || "Vínculo removido.");
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setMensagem(
        error instanceof Error ? error.message : "Erro ao remover vínculo.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function validar() {
    const nomeMudou = operadorNome.trim() !== (venda.operador_nome || "");
    const emailMudou = operadorEmail.trim() !== (venda.operador_email || "");

    if (nomeMudou || emailMudou || editando) {
      setMensagem("Salve a edição do vínculo antes de confirmar a venda.");
      return;
    }

    if (!venda.operador_nome && !venda.operador_email) {
      setMensagem("Antes de confirmar, vincule o operador de resgate.");
      return;
    }

    try {
      setSalvando(true);
      setMensagem("Confirmando venda para operador...");

      const resposta = await fetch(`/api/vendas/${venda.id}/validacao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "validar",
        }),
      });

      const json = await resposta.json();

      if (!json.ok) {
        setMensagem(json.erro || "Erro ao confirmar venda para operador.");
        return;
      }

      setMensagem("Venda confirmada para o operador.");
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Erro ao confirmar venda para operador.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function recusar() {
    const motivo = window.prompt("Informe o motivo da recusa do vínculo:");

    if (!motivo) return;

    try {
      setSalvando(true);
      setMensagem("Registrando recusa do vínculo...");

      const resposta = await fetch(`/api/vendas/${venda.id}/validacao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "recusar",
          motivo_recusa: motivo,
        }),
      });

      const json = await resposta.json();

      if (!json.ok) {
        setMensagem(json.erro || "Erro ao recusar vínculo.");
        return;
      }

      setMensagem("Vínculo recusado.");
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setMensagem(
        error instanceof Error ? error.message : "Erro ao recusar vínculo.",
      );
    } finally {
      setSalvando(false);
    }
  }

  const statusAtual =
    venda.validacao_status === "validado"
      ? "Venda confirmada para operador"
      : venda.validacao_status === "recusado"
        ? "Vínculo recusado"
        : "Aguardando vínculo";

  const temVinculo = Boolean(venda.operador_nome || venda.operador_email);

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_400px]">
      <div className="grid gap-3 md:grid-cols-2">
        <LinhaDetalhe label="Status da validação" valor={statusAtual} />
        <LinhaDetalhe
          label="Elegível para crédito"
          valor={venda.elegivel_comissao ? "Sim" : "Ainda não"}
        />
        <LinhaDetalhe
          label="Operador de resgate"
          valor={venda.operador_nome || "Não vinculado"}
        />
        <LinhaDetalhe
          label="E-mail do operador"
          valor={venda.operador_email || "Não informado"}
        />
        <LinhaDetalhe
          label="Agendamento"
          valor={venda.agendamento_id ? "Vinculado" : "Não vinculado"}
        />
        <LinhaDetalhe
          label="Motivo recusa"
          valor={venda.motivo_recusa || "Sem recusa registrada"}
        />
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Vínculo do resgate
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Registro do operador vinculado à venda.
            </p>
          </div>

          <span
            className={`rounded-xl px-3 py-1 text-xs font-black ${
              temVinculo
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {temVinculo ? "Vinculado" : "Pendente"}
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Operador gravado
          </p>

          <div className="mt-3 grid gap-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Nome
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {venda.operador_nome || "Não vinculado"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                E-mail
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {venda.operador_email || "Não informado"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Histórico do vínculo
          </p>

          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600">
            <p>
              <span className="text-slate-400">Vinculado por:</span>{" "}
              {venda.operador_vinculado_por_nome || "Não registrado"}
            </p>
            <p>
              <span className="text-slate-400">Data/hora do vínculo:</span>{" "}
              {dataHoraBr(venda.operador_vinculado_em)}
            </p>
            <p>
              <span className="text-slate-400">Última edição:</span>{" "}
              {venda.operador_vinculo_atualizado_por_nome || "Não registrada"} ·{" "}
              {dataHoraBr(venda.operador_vinculo_atualizado_em)}
            </p>

            {venda.operador_vinculo_removido_em ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
                Removido por{" "}
                {venda.operador_vinculo_removido_por_nome ||
                  "usuário não registrado"}{" "}
                em {dataHoraBr(venda.operador_vinculo_removido_em)}. Motivo:{" "}
                {venda.operador_vinculo_remocao_motivo || "Não informado"}.
              </p>
            ) : null}
          </div>
        </div>

        {editando ? (
          <div className="mt-4 grid gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Editar vínculo
            </p>

            <input
              value={operadorNome}
              onChange={(event) => setOperadorNome(event.target.value)}
              placeholder="Nome do operador"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500"
            />

            <input
              value={operadorEmail}
              onChange={(event) => setOperadorEmail(event.target.value)}
              placeholder="E-mail do operador"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500"
            />

            <div className="grid gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={vincularOperador}
                disabled={salvando}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Salvar vínculo
              </button>

              <button
                type="button"
                onClick={() => {
                  setOperadorNome(venda.operador_nome || "");
                  setOperadorEmail(venda.operador_email || "");
                  setEditando(false);
                  setMensagem("");
                }}
                disabled={salvando}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            disabled={salvando}
            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Editar vínculo
          </button>
        )}

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={removerVinculo}
            disabled={salvando || !temVinculo}
            className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Remover vínculo
          </button>

          <button
            type="button"
            onClick={validar}
            disabled={salvando}
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirmar venda para operador
          </button>

          <button
            type="button"
            onClick={recusar}
            disabled={salvando}
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Recusar vínculo
          </button>
        </div>

        <AgendamentosVenda venda={venda} />

        {mensagem ? (
          <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
            {mensagem}
          </p>
        ) : null}
      </div>
    </div>
  );
}
type AgendamentoSugestao = {
  id: string;
  lead_id: string | null;
  lead_nome: string | null;
  lead_telefone: string | null;
  veiculo_interesse: string | null;
  data_agendamento: string | null;
  status: string | null;
  confirmacao_status: string | null;
  vendedor_nome: string | null;
  vendedor_email: string | null;
  loja: string | null;
  operador_id: string | null;
  operador_nome: string | null;
  score: number | null;
};

function AgendamentosVenda({ venda }: { venda: Venda }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvandoId, setSalvandoId] = useState("");
  const [erro, setErro] = useState("");
  const [agendamentos, setAgendamentos] = useState<AgendamentoSugestao[]>([]);

  function dataHoraAgendamento(valor: string | null | undefined) {
    if (!valor) return "Sem data";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return valor;

    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function buscarAgendamentos() {
    try {
      setAberto(true);
      setCarregando(true);
      setErro("");

      const params = new URLSearchParams();

      params.set("venda_id", venda.id);
      params.set("vendaId", venda.id);
      params.set("placa", venda.placa || "");

      if (venda.cliente) params.set("cliente", venda.cliente);
      if (venda.veiculo) params.set("veiculo", venda.veiculo);

      const resposta = await fetch(
        `/api/vendas/agendamentos?${params.toString()}`,
      );
      const json = await resposta.json();

      if (!json.ok) {
        setErro(json.erro || "Erro ao buscar agendamentos possíveis.");
        setAgendamentos([]);
        return;
      }

      const lista =
        json.agendamentos ||
        json.resultados ||
        json.sugestoes ||
        json.vinculos ||
        [];

      setAgendamentos(lista as AgendamentoSugestao[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao buscar agendamentos possíveis.",
      );
      setAgendamentos([]);
    } finally {
      setCarregando(false);
    }
  }

  async function vincularAgendamento(agendamento: AgendamentoSugestao) {
    try {
      setSalvandoId(agendamento.id);
      setErro("");

      const resposta = await fetch(`/api/vendas/${venda.id}/validacao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "vincular_agendamento",
          agendamento_id: agendamento.id,
        }),
      });

      const json = await resposta.json();

      if (!json.ok) {
        setErro(json.erro || "Erro ao vincular agendamento.");
        return;
      }

      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao vincular agendamento.",
      );
    } finally {
      setSalvandoId("");
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Agendamento / lead do resgate
          </p>
          <p className="mt-1 text-xs font-bold text-blue-800">
            Busca agendamentos possíveis pelo cliente e veículo para vincular o
            lead correto à venda.
          </p>
        </div>

        <button
          type="button"
          onClick={buscarAgendamentos}
          disabled={carregando}
          className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {carregando ? "Buscando..." : "Buscar agendamentos possíveis"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Agendamento atual
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {venda.agendamento_id ? "Vinculado" : "Não vinculado"}
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Lead atual
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {venda.lead_id ? "Vinculado" : "Não vinculado"}
          </p>
        </div>
      </div>

      {erro ? (
        <p className="mt-3 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-700">
          {erro}
        </p>
      ) : null}

      {aberto ? (
        <div className="mt-4 grid gap-3">
          {carregando ? (
            <div className="rounded-2xl bg-white px-4 py-5 text-center text-sm font-black text-slate-500">
              Procurando agendamentos...
            </div>
          ) : agendamentos.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-5 text-center">
              <p className="text-sm font-black text-slate-800">
                Nenhum agendamento possível encontrado.
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Nesse caso, mantenha o vínculo manual do operador de resgate.
              </p>
            </div>
          ) : (
            agendamentos.map((agendamento) => {
              const score = Math.round(Number(agendamento.score || 0));

              return (
                <article
                  key={agendamento.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl bg-slate-950 px-3 py-1 text-xs font-black text-white">
                          {score}% confiança
                        </span>

                        <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                          {agendamento.confirmacao_status ||
                            agendamento.status ||
                            "Sem status"}
                        </span>
                      </div>

                      <h4 className="mt-3 text-sm font-black text-slate-950">
                        {agendamento.lead_nome || "Lead sem nome"}
                      </h4>

                      <div className="mt-2 grid gap-1 text-xs font-bold text-slate-500">
                        <p>
                          Telefone:{" "}
                          {agendamento.lead_telefone || "Não informado"}
                        </p>
                        <p>
                          Veículo:{" "}
                          {agendamento.veiculo_interesse || "Não informado"}
                        </p>
                        <p>
                          Data:{" "}
                          {dataHoraAgendamento(agendamento.data_agendamento)}
                        </p>
                        <p>
                          Operador:{" "}
                          {agendamento.operador_nome || "Não identificado"}
                        </p>
                        <p>
                          Vendedor:{" "}
                          {agendamento.vendedor_nome || "Não informado"}
                        </p>
                        <p>Loja: {agendamento.loja || "Não informada"}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => vincularAgendamento(agendamento)}
                      disabled={Boolean(salvandoId)}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {salvandoId === agendamento.id
                        ? "Vinculando..."
                        : "Vincular este agendamento"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
function LinhaDetalhe({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-800">{valor}</p>
    </div>
  );
}

function PainelResumo({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {titulo}
      </p>
      <strong className="mt-2 block truncate text-lg font-black text-slate-950">
        {valor}
      </strong>
      <span className="mt-1 block truncate text-xs font-bold text-slate-500">
        {detalhe}
      </span>
    </article>
  );
}
function InfoCard({
  titulo,
  ativo,
  linhas,
}: {
  titulo: string;
  ativo: boolean;
  linhas: [string, string][];
}) {
  return (
    <article
      className={`rounded-3xl border p-5 ${
        ativo ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">{titulo}</h3>
        {ativo ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-red-700" />
        )}
      </div>

      <div className="mt-4 grid gap-3">
        {linhas.map(([label, valor]) => (
          <div
            key={label}
            className="rounded-2xl bg-white/70 px-4 py-3 text-sm"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              {label}
            </p>
            <p className="mt-1 font-bold text-slate-800">{valor}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
