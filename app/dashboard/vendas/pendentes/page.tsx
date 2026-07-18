"use client";

import { VendasDashboardResumo } from "@/components/vendas/VendasDashboardResumo";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type VendaPendente = {
  id: string;
  placa: string;
  veiculo: string | null;
  cliente: string | null;
  vendedor_nome: string | null;
  loja: string | null;
  data_venda: string | null;
  conferencia_status: string | null;
  operador_nome: string | null;
  agendamento_id: string | null;
  validacao_status: string | null;
  elegivel_comissao: boolean | null;
  motivo_recusa: string | null;
};

function dataBr(valor: string | null | undefined) {
  if (!valor) return "Sem data";

  const data = new Date(`${valor}T12:00:00`);

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleDateString("pt-BR");
}

function motivoPendencia(venda: VendaPendente) {
  const motivos: string[] = [];

  if (!venda.operador_nome) motivos.push("sem operador vinculado");
  if (!venda.agendamento_id) motivos.push("sem agendamento vinculado");
  if (venda.conferencia_status !== "confirmado") {
    motivos.push("venda ainda não confirmada");
  }

  if (motivos.length === 0) return "pronta para validação da supervisora";

  return motivos.join(", ");
}

export default function VendasPendentesPage() {
  const [vendas, setVendas] = useState<VendaPendente[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [exportMenuAberto, setExportMenuAberto] = useState(false);

  async function carregar() {
    try {
      setCarregando(true);
      setErro("");

      const params = new URLSearchParams();

      params.set("visao", "pendentes_resgate");

      if (busca) params.set("busca", busca);

      const resposta = await fetch(`/api/vendas?${params.toString()}`);
      const json = await resposta.json();

      if (!json.ok) {
        setErro(json.erro || "Erro ao carregar pendências do resgate.");
        setVendas([]);
        return;
      }

      setVendas(json.vendas || []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar pendências do resgate.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function abrirRelatorio(formato: "pdf" | "xls") {
    const params = new URLSearchParams();

    params.set("formato", formato);
    params.set("visao", "pendentes_resgate");

    if (busca) params.set("busca", busca);

    window.open(`/api/vendas/relatorio?${params.toString()}`, "_blank");
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indicadores = useMemo(() => {
    return {
      total: vendas.length,
      semOperador: vendas.filter((venda) => !venda.operador_nome).length,
      semAgendamento: vendas.filter((venda) => !venda.agendamento_id).length,
      prontas: vendas.filter(
        (venda) =>
          venda.operador_nome &&
          venda.agendamento_id &&
          venda.conferencia_status === "confirmado",
      ).length,
    };
  }, [vendas]);

  return (
    <div className="space-y-7 px-3 pb-8 pt-10 md:px-4 md:pt-12 lg:px-5 lg:pt-14">
      <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-700">
              Supervisão
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
              Pendências do resgate
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
              Central para conferir pendências, vincular operador e validar se a
              venda conta para crédito do resgate ou prêmio.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <button
                onClick={() => setExportMenuAberto((aberto) => !aberto)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
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
              disabled={carregando}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {erro ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {erro}
        </div>
      ) : null}

      <VendasDashboardResumo
        validacao="pendente"
        titulo="Dashboard das pendências"
        subtitulo="Resumo do que precisa ser resolvido antes de liberar crédito do resgate ou prêmio."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card titulo="Pendentes" valor={indicadores.total} icon={Clock3} />
        <Card
          titulo="Sem operador"
          valor={indicadores.semOperador}
          icon={UserRound}
        />
        <Card
          titulo="Sem agendamento"
          valor={indicadores.semAgendamento}
          icon={AlertTriangle}
        />
        <Card
          titulo="Prontas para validar"
          valor={indicadores.prontas}
          icon={ShieldCheck}
        />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_140px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") carregar();
              }}
              placeholder="Buscar por placa, cliente, veículo, vendedor ou operador..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white"
            />
          </label>

          <button
            onClick={carregar}
            className="h-12 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800"
          >
            Buscar
          </button>
        </div>
      </section>

      <section className="grid gap-5">
        {carregando ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-black text-slate-600">
              Carregando pendências do resgate...
            </p>
          </div>
        ) : vendas.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Nenhuma venda pendente
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Quando houver venda aguardando validação, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          vendas.map((venda) => (
            <article
              key={venda.id}
              className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-slate-950 px-3 py-1 text-sm font-black text-white">
                      {venda.placa}
                    </span>
                    <span className="rounded-xl bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      Pendente de validação
                    </span>
                    {venda.operador_nome ? (
                      <span className="rounded-xl bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        Operador vinculado
                      </span>
                    ) : (
                      <span className="rounded-xl bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                        Sem operador
                      </span>
                    )}
                    {venda.agendamento_id ? (
                      <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        Agendamento vinculado
                      </span>
                    ) : (
                      <span className="rounded-xl bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                        Sem agendamento
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-lg font-black text-slate-950">
                    {venda.veiculo || "Veículo não informado"}
                  </h3>

                  <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-2 xl:grid-cols-4">
                    <span>Cliente: {venda.cliente || "Não informado"}</span>
                    <span>
                      Vendedor: {venda.vendedor_nome || "Não informado"}
                    </span>
                    <span>
                      Operador: {venda.operador_nome || "Não vinculado"}
                    </span>
                    <span>Data: {dataBr(venda.data_venda)}</span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                      Por que está pendente?
                    </p>
                    <p className="mt-1 text-sm font-bold text-amber-900">
                      {motivoPendencia(venda)}
                    </p>
                  </div>

                  {venda.motivo_recusa ? (
                    <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">
                        Recusa anterior
                      </p>
                      <p className="mt-1 text-sm font-bold text-red-900">
                        {venda.motivo_recusa}
                      </p>
                    </div>
                  ) : null}
                </div>

                <a
                  href={`/dashboard/vendas?busca=${encodeURIComponent(venda.placa)}`}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  Abrir validação
                </a>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function Card({
  titulo,
  valor,
  icon: Icon,
}: {
  titulo: string;
  valor: number;
  icon: React.ElementType;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
            {titulo}
          </p>
          <strong className="mt-3 block text-3xl font-black text-slate-950">
            {valor}
          </strong>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}
