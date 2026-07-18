"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCcw,
  Search,
  UserRound,
  X,
} from "lucide-react";

type VendaStatus = {
  id: string;
  placa: string;
  veiculo: string | null;
  cliente: string | null;
  vendedor_nome: string | null;
  loja: string | null;
  numero_proposta: string | null;
  data_proposta: string | null;
  status_proposta: string | null;
  data_aprovacao: string | null;
  responsavel_aprovacao: string | null;
  total_venda: number;
  origem_status: string | null;
};

type RetornoVendas = {
  ok: boolean;
  erro?: string;
  vendas: VendaStatus[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const STATUS_CORES: Record<
  string,
  {
    card: string;
    badge: string;
    linha: string;
    texto: string;
  }
> = {
  analise: {
    card: "border-amber-200 bg-amber-50/80",
    badge: "bg-amber-100 text-amber-800",
    linha: "bg-amber-400",
    texto: "text-amber-800",
  },
  comercial: {
    card: "border-blue-200 bg-blue-50/80",
    badge: "bg-blue-100 text-blue-800",
    linha: "bg-blue-500",
    texto: "text-blue-800",
  },
  aprovado: {
    card: "border-emerald-200 bg-emerald-50/80",
    badge: "bg-emerald-100 text-emerald-800",
    linha: "bg-emerald-500",
    texto: "text-emerald-800",
  },
  faturado: {
    card: "border-violet-200 bg-violet-50/80",
    badge: "bg-violet-100 text-violet-800",
    linha: "bg-violet-500",
    texto: "text-violet-800",
  },
  sem: {
    card: "border-slate-200 bg-white",
    badge: "bg-slate-100 text-slate-700",
    linha: "bg-slate-300",
    texto: "text-slate-700",
  },
};

function normalizar(valor: string | null | undefined) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function chaveStatus(status: string | null | undefined) {
  const s = normalizar(status);

  if (s.includes("analise")) return "analise";
  if (s.includes("comercial")) return "comercial";
  if (s.includes("aprov")) return "aprovado";
  if (s.includes("fatur")) return "faturado";

  return "sem";
}

function dataBr(data: string | null | undefined) {
  if (!data) return "Sem data";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export default function StatusVendasPage() {
  const [vendas, setVendas] = useState<VendaStatus[]>([]);
  const [selecionada, setSelecionada] = useState<VendaStatus | null>(null);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [vendedor, setVendedor] = useState("");
  const [loja, setLoja] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  async function carregar(novaPagina = pagina) {
    try {
      setCarregando(true);
      setErro("");

      const params = new URLSearchParams();

      params.set("visao", "status");
      params.set("origem_status", "statuscorreio");
      params.set("page", String(novaPagina));
      params.set("pageSize", String(pageSize));

      if (busca.trim()) params.set("busca", busca.trim());
      if (status !== "todos") params.set("status_proposta", status);
      if (vendedor.trim()) params.set("vendedor", vendedor.trim());
      if (loja.trim()) params.set("loja", loja.trim());

      const resposta = await fetch(`/api/vendas?${params.toString()}`);
      const json = (await resposta.json()) as RetornoVendas;

      if (!json.ok) {
        setErro(json.erro || "Erro ao carregar status de vendas.");
        setVendas([]);
        setTotal(0);
        return;
      }

      setVendas(json.vendas || []);
      setTotal(json.pagination?.total || 0);
      setPagina(novaPagina);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar status de vendas.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = useMemo(() => {
    return vendas.reduce(
      (acc, venda) => {
        const chave = chaveStatus(venda.status_proposta);

        acc.total += 1;
        acc[chave] += 1;

        return acc;
      },
      {
        total: 0,
        analise: 0,
        comercial: 0,
        aprovado: 0,
        faturado: 0,
        sem: 0,
      },
    );
  }, [vendas]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="min-h-screen bg-slate-50 pb-12 text-slate-950">
      <section className="border-b border-slate-200 bg-white px-6 py-7 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-700">
              Vendas
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
              Status de vendas
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
              Painel rápido das propostas da aba statuscorreio. Use as cores
              para identificar análise, comercial, aprovado e faturado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => carregar(1)}
            disabled={carregando}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Atualizar
          </button>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-4 px-6 md:grid-cols-2 xl:grid-cols-5">
        <ResumoCard titulo="Total" valor={resumo.total} icon={<Car />} />
        <ResumoCard
          titulo="Em análise"
          valor={resumo.analise}
          icon={<AlertTriangle />}
          classe="border-amber-200 bg-amber-50"
        />
        <ResumoCard
          titulo="Comercial"
          valor={resumo.comercial}
          icon={<Clock3 />}
          classe="border-blue-200 bg-blue-50"
        />
        <ResumoCard
          titulo="Aprovado"
          valor={resumo.aprovado}
          icon={<BadgeCheck />}
          classe="border-emerald-200 bg-emerald-50"
        />
        <ResumoCard
          titulo="Faturado"
          valor={resumo.faturado}
          icon={<CheckCircle2 />}
          classe="border-violet-200 bg-violet-50"
        />
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_180px_220px_160px_130px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") carregar(1);
                }}
                placeholder="Buscar por placa, veículo, cliente, proposta..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="todos">Todos status</option>
              <option value="Análise">Análise</option>
              <option value="Comercial">Comercial</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Faturado">Faturado</option>
            </select>

            <input
              value={vendedor}
              onChange={(event) => setVendedor(event.target.value)}
              placeholder="Vendedor"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            />

            <input
              value={loja}
              onChange={(event) => setLoja(event.target.value)}
              placeholder="Loja"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            />

            <button
              type="button"
              onClick={() => carregar(1)}
              className="h-12 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800"
            >
              Buscar
            </button>
          </div>
        </div>
      </section>

      {erro ? (
        <section className="mx-auto mt-4 max-w-7xl px-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {erro}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-6 max-w-7xl px-6">
        <div className="grid gap-3">
          {carregando ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" />
              <p className="mt-3 text-sm font-black text-slate-500">
                Carregando status de vendas...
              </p>
            </div>
          ) : vendas.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-black text-slate-900">
                Nenhuma proposta encontrada.
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Ajuste os filtros ou atualize a sincronização.
              </p>
            </div>
          ) : (
            vendas.map((venda) => (
              <StatusVendaCard
                key={venda.id}
                venda={venda}
                onClick={() => setSelecionada(venda)}
              />
            ))
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-bold text-slate-500">
            Página {pagina} de {totalPages} · {total} propostas
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagina <= 1 || carregando}
              onClick={() => carregar(pagina - 1)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina >= totalPages || carregando}
              onClick={() => carregar(pagina + 1)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </section>

      {selecionada ? (
        <StatusDetalhe
          venda={selecionada}
          onClose={() => setSelecionada(null)}
        />
      ) : null}
    </main>
  );
}

function StatusVendaCard({
  venda,
  onClick,
}: {
  venda: VendaStatus;
  onClick: () => void;
}) {
  const chave = chaveStatus(venda.status_proposta);
  const cores = STATUS_CORES[chave] || STATUS_CORES.sem;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[24px] border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cores.card}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1.5 ${cores.linha}`} />

      <div className="flex flex-col gap-4 pl-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-slate-950 px-3 py-1 text-xs font-black text-white">
              {venda.placa}
            </span>
            <span
              className={`rounded-xl px-3 py-1 text-xs font-black ${cores.badge}`}
            >
              {venda.status_proposta || "Sem status"}
            </span>
            <span className="rounded-xl bg-white/80 px-3 py-1 text-xs font-black text-slate-700">
              Proposta {venda.numero_proposta || "não informada"}
            </span>
          </div>

          <h2 className="mt-3 truncate text-lg font-black tracking-[-0.03em] text-slate-950">
            {venda.veiculo || "Veículo não informado"}
          </h2>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-slate-600">
            <span>Cliente: {venda.cliente || "Não informado"}</span>
            <span>Vendedor: {venda.vendedor_nome || "Não informado"}</span>
            <span>Data proposta: {dataBr(venda.data_proposta)}</span>
            <span>Valor: {dinheiro(venda.total_venda)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-sm font-black text-slate-700">
          Ver detalhes
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}

function StatusDetalhe({
  venda,
  onClose,
}: {
  venda: VendaStatus;
  onClose: () => void;
}) {
  const chave = chaveStatus(venda.status_proposta);
  const cores = STATUS_CORES[chave] || STATUS_CORES.sem;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-slate-950 px-3 py-1 text-sm font-black text-white">
                  {venda.placa}
                </span>
                <span
                  className={`rounded-xl px-3 py-1 text-xs font-black ${cores.badge}`}
                >
                  {venda.status_proposta || "Sem status"}
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
                {venda.veiculo || "Veículo não informado"}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 p-3 text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-auto bg-slate-50 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetalheMini
              titulo="Proposta"
              valor={venda.numero_proposta || "Não informada"}
              detalhe={venda.status_proposta || "Sem status"}
            />
            <DetalheMini
              titulo="Cliente"
              valor={venda.cliente || "Não informado"}
              detalhe={venda.vendedor_nome || "Vendedor não informado"}
            />
            <DetalheMini
              titulo="Datas"
              valor={dataBr(venda.data_proposta)}
              detalhe={`Aprovação: ${dataBr(venda.data_aprovacao)}`}
            />
            <DetalheMini
              titulo="Valor"
              valor={dinheiro(venda.total_venda)}
              detalhe={venda.responsavel_aprovacao || "Sem responsável"}
            />
          </div>

          <div className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
              Dados do statuscorreio
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Linha label="Placa" valor={venda.placa} />
              <Linha label="Veículo" valor={venda.veiculo || "Não informado"} />
              <Linha label="Cliente" valor={venda.cliente || "Não informado"} />
              <Linha
                label="Vendedor"
                valor={venda.vendedor_nome || "Não informado"}
              />
              <Linha label="Loja" valor={venda.loja || "Não informada"} />
              <Linha
                label="Origem"
                valor={venda.origem_status || "statuscorreio"}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-[26px] border border-blue-100 bg-blue-50 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-blue-950">
                Quer ver se essa venda já chegou no acompanhamento?
              </p>
              <p className="mt-1 text-xs font-bold text-blue-700">
                Abre a aba de acompanhamento já filtrando pela placa.
              </p>
            </div>

            <Link
              href={`/dashboard/vendas?busca=${encodeURIComponent(venda.placa)}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800"
            >
              Ver acompanhamento da venda
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  icon,
  classe = "border-slate-200 bg-white",
}: {
  titulo: string;
  valor: number;
  icon: React.ReactNode;
  classe?: string;
}) {
  return (
    <article className={`rounded-[24px] border p-5 shadow-sm ${classe}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
            {titulo}
          </p>
          <strong className="mt-3 block text-3xl font-black tracking-[-0.05em] text-slate-950">
            {valor}
          </strong>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
          {icon}
        </div>
      </div>
    </article>
  );
}

function DetalheMini({
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

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-800">{valor}</p>
    </div>
  );
}
