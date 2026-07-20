"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

type LinhaResumo = {
  nome: string;
  total: number;
};

type ResumoVendas = {
  total: number;
  pendentes: number;
  sem_operador: number;
  prontas: number;
  confirmadas: number;
  validadas: number;
  recusadas: number;
  sem_agendamento: number;
  por_loja: LinhaResumo[];
  por_vendedor: LinhaResumo[];
  por_operador: LinhaResumo[];
};

type RetornoResumo = {
  ok: boolean;
  erro?: string;
  resumo: ResumoVendas;
};

const RESUMO_VAZIO: ResumoVendas = {
  total: 0,
  pendentes: 0,
  sem_operador: 0,
  prontas: 0,
  confirmadas: 0,
  validadas: 0,
  recusadas: 0,
  sem_agendamento: 0,
  por_loja: [],
  por_vendedor: [],
  por_operador: [],
};

type VendasDashboardResumoProps = {
  visao?: "acompanhamento" | "status" | "pendentes_resgate";
  validacao?: string;
  titulo?: string;
  subtitulo?: string;
};

export function VendasDashboardResumo({
  visao = "acompanhamento",
  validacao,
  titulo = "Dashboard geral do acompanhamento",
  subtitulo = "Resumo geral da aba AcompanhamentoVendas, sem limitar aos 25 cards da página.",
}: VendasDashboardResumoProps = {}) {
  const [resumo, setResumo] = useState<ResumoVendas>(RESUMO_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const visaoResumo = validacao === "pendente" ? "pendentes_resgate" : visao;

  const carregarResumo = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch(
        `/api/vendas/resumo?visao=${encodeURIComponent(visaoResumo)}`,
      );
      const json = (await resposta.json()) as RetornoResumo;

      if (!json.ok) {
        setErro(json.erro || "Erro ao carregar resumo.");
        setResumo(RESUMO_VAZIO);
        return;
      }

      setResumo(json.resumo || RESUMO_VAZIO);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar resumo.",
      );
      setResumo(RESUMO_VAZIO);
    } finally {
      setCarregando(false);
    }
  }, [visaoResumo]);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const maiorLoja = useMemo(
    () => Math.max(1, ...resumo.por_loja.map((item) => item.total)),
    [resumo.por_loja],
  );

  const maiorVendedor = useMemo(
    () => Math.max(1, ...resumo.por_vendedor.map((item) => item.total)),
    [resumo.por_vendedor],
  );

  const maiorOperador = useMemo(
    () => Math.max(1, ...resumo.por_operador.map((item) => item.total)),
    [resumo.por_operador],
  );

  return (
    <section className="apple-card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="apple-section-title text-[1.9rem]">
            {titulo}
          </h2>
          <p className="apple-section-copy">
            {subtitulo}
          </p>
        </div>

        {carregando ? (
          <div className="apple-pill bg-blue-50 text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Atualizando resumo
          </div>
        ) : null}
      </div>

      {erro ? (
        <div className="mt-4 apple-soft-card apple-tint-red px-4 py-3 text-sm font-bold text-red-700">
          {erro}
        </div>
      ) : null}

      <div className="mt-5 apple-kpi-grid">
        <ResumoCard
          titulo="Total acompanhamento"
          valor={resumo.total}
          detalhe="Registros da AcompanhamentoVendas"
          icon={<BarChart3 />}
        />
        <ResumoCard
          titulo="Pendentes"
          valor={resumo.pendentes}
          detalhe="Aguardando vínculo/validação"
          icon={<Clock3 />}
        />
        <ResumoCard
          titulo="Sem operador"
          valor={resumo.sem_operador}
          detalhe="Precisa vincular resgate"
          icon={<UserRound />}
        />
        <ResumoCard
          titulo="Prontas"
          valor={resumo.prontas}
          detalhe="Com operador, agendamento e validação"
          icon={<ShieldCheck />}
        />
      </div>

      <div className="mt-4 apple-kpi-grid">
        <ResumoCard
          titulo="Confirmadas"
          valor={resumo.confirmadas}
          detalhe="Cruzou com vendidos/status"
          icon={<CheckCircle2 />}
          classe="border-emerald-100 bg-emerald-50"
        />
        <ResumoCard
          titulo="Validadas"
          valor={resumo.validadas}
          detalhe="Crédito confirmado"
          icon={<ShieldCheck />}
          classe="border-blue-100 bg-blue-50"
        />
        <ResumoCard
          titulo="Recusadas"
          valor={resumo.recusadas}
          detalhe="Vínculo recusado"
          icon={<AlertTriangle />}
          classe="border-red-100 bg-red-50"
        />
        <ResumoCard
          titulo="Sem agendamento"
          valor={resumo.sem_agendamento}
          detalhe="Ainda precisa vincular lead/agendamento"
          icon={<AlertTriangle />}
          classe="border-amber-100 bg-amber-50"
        />
      </div>

      <details className="mt-5 apple-soft-card apple-tint-slate px-5 py-4">
        <summary className="cursor-pointer select-none text-sm font-black text-slate-800">
          Ver distribuição por loja, vendedor e operador
        </summary>

        <div className="mt-4 grid max-h-[420px] gap-4 overflow-auto xl:grid-cols-3">
          <RankingCard
            titulo="Por loja"
            linhas={resumo.por_loja}
            maior={maiorLoja}
          />
          <RankingCard
            titulo="Por vendedor"
            linhas={resumo.por_vendedor}
            maior={maiorVendedor}
          />
          <RankingCard
            titulo="Por operador de resgate"
            linhas={resumo.por_operador}
            maior={maiorOperador}
          />
        </div>
      </details>
    </section>
  );
}

function ResumoCard({
  titulo,
  valor,
  detalhe,
  icon,
  classe = "border-slate-200 bg-slate-50",
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  icon: React.ReactNode;
  classe?: string;
}) {
  return (
    <article className={`apple-stat-card ${classe}`}>
      <div className="apple-stat-head">
        <div>
          <p className="apple-stat-title">{titulo}</p>
          <strong className="apple-stat-value mt-3 block">{valor}</strong>
          <span className="apple-stat-note mt-1 block">{detalhe}</span>
        </div>

        <div className="apple-stat-icon text-slate-700">{icon}</div>
      </div>
    </article>
  );
}

function RankingCard({
  titulo,
  linhas,
  maior,
}: {
  titulo: string;
  linhas: LinhaResumo[];
  maior: number;
}) {
  const linhasValidas = linhas.filter(
    (linha) => linha.nome.toLowerCase() !== "não informado",
  );

  const naoInformado =
    linhas.find((linha) => linha.nome.toLowerCase() === "não informado")
      ?.total || 0;

  const isOperador = titulo.toLowerCase().includes("operador");

  if (isOperador && linhasValidas.length === 0) {
    return (
      <article className="apple-card apple-tint-orange p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Atenção
            </div>

            <h3 className="mt-4 text-lg font-black tracking-[-0.03em] text-slate-950">
              Nenhum operador vinculado ainda
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Existem <strong>{naoInformado}</strong> vendas no acompanhamento,
              mas ainda sem operador de resgate vinculado. Conforme os vínculos
              forem feitos no popup da venda, esse ranking passa a aparecer
              aqui.
            </p>
          </div>
        </div>

        <div className="mt-5 apple-soft-card bg-white/80 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Próxima ação
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            Abrir uma venda no acompanhamento e usar “Vincular operador de
            resgate”.
          </p>
        </div>
      </article>
    );
  }

  const lista = linhasValidas.length > 0 ? linhasValidas : linhas;

  return (
    <article className="apple-card p-5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            <UsersRound className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">{titulo}</h3>
            <p className="text-xs font-bold text-slate-400">
              Top {Math.min(lista.length, 8)} registros
            </p>
          </div>
        </div>

        {naoInformado > 0 ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
            {naoInformado} sem vínculo
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {lista.length === 0 ? (
          <p className="apple-soft-card apple-tint-slate px-4 py-4 text-sm font-bold text-slate-400">
            Sem dados para exibir.
          </p>
        ) : (
          lista.slice(0, 8).map((linha, index) => {
            const porcentagem = Math.max(8, (linha.total / maior) * 100);

            return (
              <div
                key={linha.nome}
                className="apple-soft-card apple-tint-slate px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-slate-500 shadow-sm">
                      {index + 1}
                    </span>

                    <span className="truncate text-xs font-black uppercase text-slate-800">
                      {linha.nome}
                    </span>
                  </div>

                  <strong className="shrink-0 text-sm font-black text-slate-950">
                    {linha.total}
                  </strong>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-blue-700"
                    style={{ width: `${porcentagem}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
