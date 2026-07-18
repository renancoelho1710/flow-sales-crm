"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";

type Props = {
  campanhaNome: string;
  bloqueadoParaOperador: boolean;
  podeGerenciar: boolean;
};

const COEF = [
  { limite: 10000, c24: 0.0848, c36: 0.06106 },
  { limite: 12500, c24: 0.08223, c36: 0.05936 },
  { limite: 15000, c24: 0.08052, c36: 0.05824 },
  { limite: 17500, c24: 0.07929, c36: 0.05743 },
  { limite: 20000, c24: 0.07738, c36: 0.05783 },
  { limite: 22500, c24: 0.07766, c36: 0.05636 },
  { limite: 25000, c24: 0.07629, c36: 0.05678 },
  { limite: 27500, c24: 0.07589, c36: 0.0564 },
  { limite: 30000, c24: 0.07623, c36: 0.05542 },
  { limite: 35000, c24: 0.07562, c36: 0.05501 },
  { limite: 40000, c24: 0.07516, c36: 0.05471 },
  { limite: 45000, c24: 0.0748, c36: 0.05448 },
  { limite: 50000, c24: 0.07452, c36: 0.05429 },
  { limite: 60000, c24: 0.07409, c36: 0.05401 },
  { limite: 70000, c24: 0.07378, c36: 0.0538 },
  { limite: 80000, c24: 0.07355, c36: 0.05365 },
  { limite: 90000, c24: 0.07338, c36: 0.05354 },
  { limite: 100000, c24: 0.07323, c36: 0.05344 },
  { limite: 110000, c24: 0.07312, c36: 0.05336 },
  { limite: Infinity, c24: 0.07302, c36: 0.0533 },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function numero(valor: string) {
  return Number(String(valor || "").replace(/\D/g, "") || 0);
}

function formatar(valor: string) {
  const n = numero(valor);
  if (!n) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function coeficiente(valor: number) {
  return COEF.find((item) => valor <= item.limite) || COEF[COEF.length - 1];
}

function addMeses(data: Date, meses: number) {
  const nova = new Date(data.getTime());
  nova.setMonth(nova.getMonth() + meses);
  return nova;
}

export function SimuladorCopaAzul({
  campanhaNome,
  bloqueadoParaOperador,
  podeGerenciar,
}: Props) {
  const [anoFab, setAnoFab] = useState("");
  const [anoModelo, setAnoModelo] = useState("");
  const [valor, setValor] = useState("");
  const [entrada, setEntrada] = useState("");
  const [plano, setPlano] = useState<"36" | "24">("36");

  const anos = useMemo(() => {
    const atual = new Date().getFullYear() + 1;
    return Array.from({ length: atual - 2021 + 1 }, (_, i) => atual - i);
  }, []);

  const calc = useMemo(() => {
    const valorVeiculo = numero(valor);
    const valorEntrada = numero(entrada);
    const percentual =
      valorVeiculo > 0 ? (valorEntrada / valorVeiculo) * 100 : 0;
    const camposOk = Boolean(
      anoFab && anoModelo && valorVeiculo > 0 && valorEntrada > 0,
    );
    const entradaOk = percentual >= 30;
    const financiado = Math.max(valorVeiculo - valorEntrada, 0);
    const c = coeficiente(financiado);
    const p36 = financiado * c.c36;
    const p24 = financiado * c.c24;

    return {
      valorVeiculo,
      valorEntrada,
      percentual,
      camposOk,
      entradaOk,
      financiado,
      p36,
      p24,
      parcela: plano === "24" ? p24 : p36,
    };
  }, [anoFab, anoModelo, valor, entrada, plano]);

  const calendario = useMemo(() => {
    if (!calc.camposOk || !calc.entradaOk) return [];

    const linhas = [];
    const hoje = new Date();
    const parcelasCliente = plano === "24" ? 24 : 36;

    for (let i = 1; i <= 12; i++) {
      linhas.push({
        n: i,
        vencimento: addMeses(hoje, i).toLocaleDateString("pt-BR"),
        valor: moeda(99),
        status: "Parcela inicial",
        tipo: "azul",
      });
    }

    for (let i = 1; i <= parcelasCliente; i++) {
      linhas.push({
        n: 12 + i,
        vencimento: addMeses(hoje, 12 + i).toLocaleDateString("pt-BR"),
        valor: moeda(calc.parcela),
        status: "Cliente",
        tipo: "cliente",
      });
    }

    return linhas;
  }, [calc, plano]);

  function alterarValor(valorDigitado: string) {
    const formatado = formatar(valorDigitado);
    setValor(formatado);

    const n = numero(valorDigitado);
    if (n > 0) {
      setEntrada(formatar(String(Math.round(n * 0.3))));
    } else {
      setEntrada("");
    }
  }

  if (bloqueadoParaOperador && !podeGerenciar) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard/campanhas"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border bg-white px-4 text-sm font-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <div className="mt-6 rounded-[32px] border border-red-200 bg-red-50 p-10 text-center">
            <Lock className="mx-auto h-10 w-10 text-red-700" />
            <h1 className="mt-4 text-2xl font-black text-red-800">
              Simulador bloqueado pela supervisão
            </h1>
            <p className="mt-2 text-sm font-bold text-red-700">
              A campanha está liberada, mas a simulação ainda não foi
              autorizada.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-[32px] border border-yellow-400/30 bg-[#061426] p-6">
          <Link
            href="/dashboard/campanhas"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para campanhas
          </Link>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-yellow-300">
            Simulador interno
          </p>

          <h1 className="mt-2 text-4xl font-black text-yellow-300">
            {campanhaNome || "Copa Azul"}
          </h1>

          {bloqueadoParaOperador && podeGerenciar && (
            <div className="mt-4 rounded-3xl border border-red-300/30 bg-red-500/10 p-4 text-sm font-black text-red-100">
              Visualização admin: o simulador está bloqueado para operadores.
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4 rounded-[32px] border border-yellow-400/30 bg-white/10 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase text-blue-100">
                  Ano fabricação
                </span>
                <select
                  value={anoFab}
                  onChange={(e) => setAnoFab(e.target.value)}
                  className="h-14 rounded-2xl bg-white px-4 font-black text-slate-950"
                >
                  <option value="">Selecione</option>
                  {anos.map((ano) => (
                    <option key={ano}>{ano}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase text-blue-100">
                  Ano modelo
                </span>
                <select
                  value={anoModelo}
                  onChange={(e) => setAnoModelo(e.target.value)}
                  className="h-14 rounded-2xl bg-white px-4 font-black text-slate-950"
                >
                  <option value="">Selecione</option>
                  {anos.map((ano) => (
                    <option key={ano}>{ano}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase text-blue-100">
                  Valor do veículo
                </span>
                <input
                  value={valor}
                  onChange={(e) => alterarValor(e.target.value)}
                  inputMode="numeric"
                  placeholder="0,00"
                  className="h-14 rounded-2xl bg-white px-4 font-black text-slate-950"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase text-blue-100">
                  Entrada mínima 30%
                </span>
                <input
                  value={entrada}
                  onChange={(e) => setEntrada(formatar(e.target.value))}
                  inputMode="numeric"
                  placeholder="0,00"
                  className="h-14 rounded-2xl bg-white px-4 font-black text-slate-950"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-yellow-300/40 bg-yellow-300/10 p-4 text-sm font-black text-yellow-300">
              Entrada: {calc.percentual.toFixed(1).replace(".", ",")}%
            </div>

            {!calc.camposOk && (
              <div className="rounded-2xl border border-red-300/40 bg-red-500/10 p-4 text-sm font-black text-red-100">
                Preencha ano, valor do veículo e entrada mínima para calcular.
              </div>
            )}

            {calc.camposOk && !calc.entradaOk && (
              <div className="rounded-2xl border border-red-300/40 bg-red-500/10 p-4 text-sm font-black text-red-100">
                Entrada mínima de 30% para participar da campanha.
              </div>
            )}

            {calc.camposOk && calc.entradaOk && (
              <div className="rounded-[28px] border-2 border-yellow-300 bg-gradient-to-b from-blue-700 to-slate-950 p-6 text-center">
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Copa Azul | CarBank Plano Sob Medida
                </p>
                <p className="mt-2 text-5xl font-black text-yellow-300">
                  12x R$ 99
                </p>
                <p className="mt-2 text-sm font-black uppercase">
                  parcelas iniciais por nossa conta
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-bold text-blue-100">Sua entrada</p>
                <p className="mt-2 text-2xl font-black text-yellow-300">
                  {moeda(calc.valorEntrada)}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-bold text-blue-100">
                  Valor financiado
                </p>
                <p className="mt-2 text-2xl font-black text-yellow-300">
                  {moeda(calc.financiado)}
                </p>
              </div>
            </div>

            <div
              className={`rounded-[28px] border border-white/10 bg-white/10 p-5 ${calc.camposOk && calc.entradaOk ? "opacity-100" : "opacity-45"}`}
            >
              <p className="text-center text-xs font-black uppercase text-blue-100">
                Após as 12 parcelas iniciais de R$ 99
              </p>

              <div className="mt-5 grid grid-cols-[1fr_48px_1fr] items-center gap-3">
                <div className="text-center">
                  <p className="text-5xl font-black text-yellow-300">36x</p>
                  <p className="mt-2 text-xl font-black">{moeda(calc.p36)}</p>
                </div>

                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-white/20 text-xs font-black">
                  OU
                </div>

                <div className="text-center">
                  <p className="text-5xl font-black text-yellow-300">24x</p>
                  <p className="mt-2 text-xl font-black">{moeda(calc.p24)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[32px] border border-yellow-400/30 bg-white/10 p-5">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase text-blue-100">
                Calendário demonstrativo
              </span>
              <select
                value={plano}
                onChange={(e) => setPlano(e.target.value as "36" | "24")}
                className="h-14 rounded-2xl bg-white px-4 font-black text-slate-950"
              >
                <option value="36">12 parcelas de R$ 99 + 36 parcelas</option>
                <option value="24">12 parcelas de R$ 99 + 24 parcelas</option>
              </select>
            </label>

            <div className="max-h-[560px] overflow-auto rounded-3xl border border-white/10 bg-white">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="sticky top-0 bg-[#071945] text-yellow-300">
                    <th className="p-3 text-xs font-black">Parcela</th>
                    <th className="p-3 text-xs font-black">Vencimento</th>
                    <th className="p-3 text-xs font-black">Valor</th>
                    <th className="p-3 text-xs font-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calendario.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-4 text-sm font-bold text-slate-600"
                      >
                        Preencha os dados para simular.
                      </td>
                    </tr>
                  ) : (
                    calendario.map((linha) => (
                      <tr
                        key={linha.n}
                        className={
                          linha.tipo === "azul" ? "bg-yellow-50" : "bg-white"
                        }
                      >
                        <td className="border-b p-3 text-sm font-bold text-slate-900">
                          {linha.n}
                        </td>
                        <td className="border-b p-3 text-sm font-bold text-slate-700">
                          {linha.vencimento}
                        </td>
                        <td className="border-b p-3 text-sm font-black text-slate-900">
                          {linha.valor}
                        </td>
                        <td className="border-b p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${linha.tipo === "azul" ? "bg-yellow-300 text-slate-950" : "bg-slate-100 text-slate-700"}`}
                          >
                            {linha.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-xs font-semibold leading-5 text-blue-100">
              <strong className="block text-sm text-yellow-300">
                Não é proposta final.
              </strong>
              O simulador serve como referência. A condição final depende da
              aprovação do banco CarBank e formalização do contrato.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
