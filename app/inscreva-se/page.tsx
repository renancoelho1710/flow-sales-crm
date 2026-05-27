"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Mail,
  MessageSquareText,
  Phone,
  Send,
  User2,
  Users,
} from "lucide-react";

const emailDestino = "renan.azulveiculos@gmail.com";

export default function InscrevaSePage() {
  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    email: "",
    telefone: "",
    quantidadeFuncionarios: "",
    mediaLucro: "",
    observacoes: "",
  });

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const assunto = encodeURIComponent("Solicitação de demonstração - Flow Sales CRM");
    const corpo = encodeURIComponent(
      [
        "Nova solicitação de demonstração:",
        "",
        `Nome: ${form.nome}`,
        `Empresa: ${form.empresa}`,
        `E-mail: ${form.email}`,
        `Telefone: ${form.telefone}`,
        `Quantidade de funcionários: ${form.quantidadeFuncionarios}`,
        `Média de lucro: ${form.mediaLucro}`,
        `Observações: ${form.observacoes || "Não informado"}`,
      ].join("\n")
    );

    window.location.href = `mailto:${emailDestino}?subject=${assunto}&body=${corpo}`;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef4ff] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-160px] top-[-160px] h-[520px] w-[520px] rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute right-[-180px] top-[12%] h-[520px] w-[520px] rounded-full bg-sky-100/95 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[22%] h-[560px] w-[560px] rounded-full bg-white/90 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[18%] h-[420px] w-[420px] rounded-full bg-indigo-100/55 blur-3xl" />
        <div className="absolute left-[-110px] top-[22%] h-[430px] w-[430px] rounded-full border border-white/80" />
        <div className="absolute right-[-140px] bottom-[-120px] h-[540px] w-[540px] rounded-full border border-white/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.96),transparent_20%),radial-gradient(circle_at_78%_82%,rgba(255,255,255,0.78),transparent_24%),linear-gradient(135deg,rgba(239,246,255,0.9),rgba(255,255,255,0.72))]" />
      </div>

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/80 bg-white/85 shadow-[0_35px_100px_rgba(15,23,42,0.15)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative hidden min-h-[720px] overflow-hidden bg-[linear-gradient(180deg,#061943_0%,#071d5a_42%,#06132f_100%)] px-10 py-12 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_13%,rgba(37,99,235,0.22),transparent_28%),radial-gradient(circle_at_86%_80%,rgba(14,165,233,0.18),transparent_22%)]" />

            <div className="relative z-10">
              <img
                src="/logo-slogan.png"
                alt="Flow Sales CRM"
                className="h-12 w-auto brightness-[2.3] contrast-125"
              />

              <div className="mt-10 h-1 w-10 rounded-full bg-blue-500" />

              <h1 className="mt-8 text-5xl font-black leading-[1.06] tracking-[-0.05em]">
                Solicite uma demonstração.
              </h1>

              <p className="mt-5 max-w-md text-lg font-medium leading-8 text-blue-50/90">
                Preencha as informações para avaliarmos sua operação e liberar o contato de demonstração.
              </p>

              <div className="mt-10 space-y-5">
                {[
                  {
                    titulo: "Análise da operação",
                    descricao: "Entendimento da equipe, volume e rotina comercial.",
                    icon: Users,
                  },
                  {
                    titulo: "Contato direcionado",
                    descricao: "A solicitação vai para o responsável pelo acesso.",
                    icon: Mail,
                  },
                  {
                    titulo: "Demonstração alinhada",
                    descricao: "Apresentação de acordo com a necessidade informada.",
                    icon: MessageSquareText,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.titulo}
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-200 ring-1 ring-white/10">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white">{item.titulo}</p>
                        <p className="mt-1 text-sm font-medium leading-6 text-blue-50/80">
                          {item.descricao}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="relative bg-white/86 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="mx-auto max-w-2xl">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para a home
              </Link>

              <div className="mt-6 flex justify-center lg:hidden">
                <img
                  src="/logo-slogan.png"
                  alt="Flow Sales CRM"
                  className="h-12 w-auto object-contain"
                />
              </div>

              <div className="mt-6 text-center lg:mt-0 lg:text-left">
                <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">
                  Inscreva-se
                </h2>
                <p className="mt-3 text-base font-semibold leading-7 text-slate-600">
                  Envie suas informações para análise e liberação de acesso à demonstração.
                </p>
              </div>

              <form onSubmit={enviar} className="mt-8 grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                      Nome
                    </span>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                      <User2 className="h-5 w-5 text-slate-400" />
                      <input
                        value={form.nome}
                        onChange={(e) => atualizar("nome", e.target.value)}
                        required
                        placeholder="Seu nome"
                        className="h-full w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                      Empresa
                    </span>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                      <Building2 className="h-5 w-5 text-slate-400" />
                      <input
                        value={form.empresa}
                        onChange={(e) => atualizar("empresa", e.target.value)}
                        required
                        placeholder="Nome da empresa"
                        className="h-full w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                      E-mail
                    </span>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                      <Mail className="h-5 w-5 text-slate-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => atualizar("email", e.target.value)}
                        required
                        placeholder="seu@email.com"
                        className="h-full w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                      Telefone
                    </span>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                      <Phone className="h-5 w-5 text-slate-400" />
                      <input
                        value={form.telefone}
                        onChange={(e) => atualizar("telefone", e.target.value)}
                        required
                        placeholder="(19) 99999-9999"
                        className="h-full w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                      Quantidade de funcionários
                    </span>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                      <Users className="h-5 w-5 text-slate-400" />
                      <input
                        value={form.quantidadeFuncionarios}
                        onChange={(e) => atualizar("quantidadeFuncionarios", e.target.value)}
                        required
                        placeholder="Ex: 12"
                        className="h-full w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                      Média de lucro
                    </span>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                      <DollarSign className="h-5 w-5 text-slate-400" />
                      <input
                        value={form.mediaLucro}
                        onChange={(e) => atualizar("mediaLucro", e.target.value)}
                        required
                        placeholder="Ex: R$ 80.000/mês"
                        className="h-full w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                    Observações
                  </span>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <textarea
                      value={form.observacoes}
                      onChange={(e) => atualizar("observacoes", e.target.value)}
                      placeholder="Fale rapidamente sobre sua operação, necessidade ou objetivo."
                      rows={5}
                      className="w-full resize-none bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-blue-700 px-8 text-base font-black text-white shadow-xl shadow-blue-700/25 transition hover:bg-blue-800"
                >
                  <Send className="h-5 w-5" />
                  Enviar solicitação
                </button>
              </form>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
