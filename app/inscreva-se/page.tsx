"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Mail,
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf4ff] px-4 py-8 text-slate-950">
      <Image
        src="/login-background.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 object-cover"
      />

      <section className="relative z-10 grid w-full max-w-[980px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] lg:grid-cols-[48%_52%]">
        <aside className="relative hidden min-h-[620px] overflow-hidden bg-slate-950 lg:block">
          <Image
            src="/image-login.png"
            alt="Flow Sales CRM"
            fill
            priority
            sizes="480px"
            className="object-cover"
          />
        </aside>

        <section className="flex min-h-[620px] items-center justify-center bg-white px-6 py-8 sm:px-10">
          <div className="w-full max-w-[420px]">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>

            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex justify-center">
                <Image
                  src="/logo.png"
                  alt="Flow Sales CRM"
                  width={68}
                  height={68}
                  priority
                  className="h-[68px] w-[68px] object-contain"
                />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Solicitar demonstração
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Preencha os dados para liberar acesso.
              </p>
            </div>

            <form onSubmit={enviar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Nome
                  </label>
                  <div className="relative">
                    <User2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.nome}
                      onChange={(event) => atualizar("nome", event.target.value)}
                      required
                      placeholder="Seu nome"
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Empresa
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.empresa}
                      onChange={(event) => atualizar("empresa", event.target.value)}
                      required
                      placeholder="Empresa"
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => atualizar("email", event.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.telefone}
                    onChange={(event) => atualizar("telefone", event.target.value)}
                    required
                    placeholder="(19) 99999-9999"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Funcionários
                  </label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.quantidadeFuncionarios}
                      onChange={(event) =>
                        atualizar("quantidadeFuncionarios", event.target.value)
                      }
                      required
                      placeholder="Ex: 12"
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Média de lucro
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.mediaLucro}
                      onChange={(event) => atualizar("mediaLucro", event.target.value)}
                      required
                      placeholder="Ex: R$ 80 mil/mês"
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Observações
                </label>
                <textarea
                  value={form.observacoes}
                  onChange={(event) => atualizar("observacoes", event.target.value)}
                  rows={3}
                  placeholder="Conte rapidamente sobre sua operação."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-blue-700 px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(29,78,216,0.26)] transition hover:bg-blue-800"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  Enviar solicitação
                </span>
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
