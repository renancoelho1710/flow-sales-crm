"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  CarFront,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Phone,
  Send,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const estadoInicial = {
  nome_indicado: "",
  telefone_indicado: "",
  email_indicado: "",
  nome_indicador: "",
  telefone_indicador: "",
  veiculo_interesse: "",
  observacao_atendente: "",
};

export function NovoLeadClient() {
  const [form, setForm] = useState(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/leads/solicitacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível enviar a solicitação.");
      }

      setSucesso("Solicitação enviada para supervisão. O lead só será criado após aprovação.");
      setForm(estadoInicial);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar a solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/dashboard/leads"
            className="mb-5 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para leads
          </Link>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                Solicitação de novo lead
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                Solicitar novo lead para supervisão
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Use esta tela quando um cliente indicar outra pessoa durante a ligação. O atendente solicita, e a supervisão/ADM revisa antes de criar oficialmente no C2S.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-950">Fluxo seguro</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                O atendente apenas solicita. A supervisão completa origem, campanha, tags, fila/vendedor e confirma a criação no C2S.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-950">Evita duplicidade</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                O sistema verifica telefone já existente em leads ativos e em solicitações pendentes antes de registrar a solicitação.
              </p>
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={enviar} className="grid gap-6">
              <div>
                <h2 className="text-xl font-black text-slate-950">Dados do indicado</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Informações mínimas para a supervisão validar o cadastro.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">
                    Nome do indicado <strong className="text-blue-700">*</strong>
                  </span>
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.nome_indicado}
                      onChange={(e) => atualizar("nome_indicado", e.target.value)}
                      required
                      placeholder="Nome da pessoa indicada"
                      className="h-13 w-full rounded-xl border border-slate-300 bg-white px-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">
                    Telefone do indicado <strong className="text-blue-700">*</strong>
                  </span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.telefone_indicado}
                      onChange={(e) => atualizar("telefone_indicado", e.target.value)}
                      required
                      placeholder="(11) 99999-9999"
                      className="h-13 w-full rounded-xl border border-slate-300 bg-white px-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-800">E-mail do indicado</span>
                <input
                  type="email"
                  value={form.email_indicado}
                  onChange={(e) => atualizar("email_indicado", e.target.value)}
                  placeholder="email@cliente.com.br"
                  className="h-13 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="border-t border-slate-100 pt-2">
                <h2 className="text-xl font-black text-slate-950">Quem indicou</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Dados do cliente que estava na ligação e fez a indicação.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">Nome de quem indicou</span>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.nome_indicador}
                      onChange={(e) => atualizar("nome_indicador", e.target.value)}
                      placeholder="Nome do cliente que indicou"
                      className="h-13 w-full rounded-xl border border-slate-300 bg-white px-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">Telefone de quem indicou</span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.telefone_indicador}
                      onChange={(e) => atualizar("telefone_indicador", e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="h-13 w-full rounded-xl border border-slate-300 bg-white px-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-800">Veículo de interesse</span>
                <div className="relative">
                  <CarFront className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.veiculo_interesse}
                    onChange={(e) => atualizar("veiculo_interesse", e.target.value)}
                    placeholder="Ex: Onix, HB20, SUV automático, até R$ 80 mil..."
                    className="h-13 w-full rounded-xl border border-slate-300 bg-white px-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-800">
                  Observação da ligação <strong className="text-blue-700">*</strong>
                </span>
                <div className="relative">
                  <MessageSquareText className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                  <textarea
                    value={form.observacao_atendente}
                    onChange={(e) => atualizar("observacao_atendente", e.target.value)}
                    required
                    rows={5}
                    placeholder="Explique o contexto da indicação, interesse do cliente e qualquer informação útil para a supervisão."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-12 py-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </label>

              {erro ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {erro}
                </div>
              ) : null}

              {sucesso ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  {sucesso}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={enviando}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-blue-700 px-8 text-base font-black text-white shadow-xl shadow-blue-700/25 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {enviando ? "Enviando..." : "Enviar solicitação para supervisão"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
