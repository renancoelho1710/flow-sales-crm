"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  DollarSign,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  User2,
  Users,
} from "lucide-react";

const segmentos = [
  "Loja de veículos",
  "Concessionária",
  "Multimarcas",
  "Financiamento / correspondente",
  "Equipe comercial",
  "Outro segmento",
];

const colaboradores = [
  "1 a 3 colaboradores",
  "4 a 10 colaboradores",
  "11 a 25 colaboradores",
  "26 a 50 colaboradores",
  "Mais de 50 colaboradores",
];

const estadoInicial = {
  nome: "",
  empresa: "",
  cargo: "",
  email: "",
  telefone: "",
  colaboradores: "",
  segmento: "",
  mediaLucro: "",
  observacoes: "",
  comunicacoes: true,
};

export default function InscrevaSePage() {
  const [form, setForm] = useState(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const caracteres = useMemo(() => form.observacoes.length, [form.observacoes]);

  function atualizar(campo: keyof typeof form, valor: string | boolean) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/solicitacoes-demonstracao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.error || "Não foi possível enviar sua solicitação agora.");
      }

      setSucesso("Solicitação enviada com sucesso. Em breve entraremos em contato.");
      setForm(estadoInicial);
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : "Não foi possível enviar sua solicitação agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main
      className="min-h-screen overflow-hidden text-slate-950"
      style={{
        backgroundImage: "url('/formulario-background.png')",
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] w-full max-w-[1640px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo-slogan.png"
              alt="Flow Sales CRM"
              className="h-11 w-auto object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-extrabold text-slate-700 lg:flex">
            <Link href="/#produto" className="transition hover:text-blue-700">Produto</Link>
            <Link href="/#solucoes" className="transition hover:text-blue-700">Soluções</Link>
            <Link href="/#recursos" className="transition hover:text-blue-700">Recursos</Link>
            <Link href="/#perguntas" className="transition hover:text-blue-700">Perguntas</Link>
            <Link href="/#contato" className="transition hover:text-blue-700">Contato</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-black text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <section>
        <div className="mx-auto grid min-h-[calc(100vh-74px)] w-full max-w-[1320px] items-center gap-10 px-6 py-14 lg:grid-cols-[0.82fr_1fr] lg:px-10">
          <aside className="self-start pt-3 lg:pt-8">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-800">
              <ArrowLeft className="h-4 w-4" />
              Voltar para home
            </Link>

            <h1 className="mt-8 max-w-[520px] text-5xl font-black leading-[1.08] tracking-[-0.06em] text-slate-950 xl:text-6xl">
              Solicite uma demonstração <span className="text-blue-700">personalizada</span>
            </h1>

            <p className="mt-6 max-w-[500px] text-lg font-semibold leading-8 text-slate-600">
              Preencha o formulário ao lado e descubra como o Flow Sales CRM pode transformar a gestão comercial da sua empresa e impulsionar seus resultados.
            </p>

            <div className="mt-9 space-y-7">
              {[
                {
                  titulo: "Mais organização",
                  descricao: "Centralize leads, negociações e tarefas em um só lugar.",
                  icon: TrendingUp,
                },
                {
                  titulo: "Mais produtividade",
                  descricao: "Automatize processos e foque no que realmente importa: vender.",
                  icon: Users,
                },
                {
                  titulo: "Mais resultado",
                  descricao: "Tenha visibilidade completa do funil e tome decisões com base em dados.",
                  icon: Target,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.titulo} className="flex items-start gap-5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 shadow-[0_18px_40px_rgba(37,99,235,0.14)] ring-1 ring-blue-100">
                      <Icon className="h-8 w-8" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-950">{item.titulo}</h3>
                      <p className="mt-1 max-w-sm text-base font-semibold leading-7 text-slate-600">
                        {item.descricao}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-white/80 bg-white/88 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:p-10">
            <div className="mb-8 flex items-center gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100">
                <CalendarCheck2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-950">
                  Agende sua demonstração
                </h2>
                <p className="mt-2 text-base font-semibold text-slate-500">
                  É rápido, fácil e sem compromisso.
                </p>
              </div>
            </div>

            <form onSubmit={enviar} className="grid gap-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">Nome completo <strong className="text-blue-700">*</strong></span>
                  <div className="relative">
                    <User2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required placeholder="Digite seu nome completo" className="h-14 w-full rounded-xl border border-slate-300 bg-white px-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">E-mail corporativo <strong className="text-blue-700">*</strong></span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={form.email} onChange={(e) => atualizar("email", e.target.value)} required placeholder="seu@email.com" className="h-14 w-full rounded-xl border border-slate-300 bg-white px-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">Empresa <strong className="text-blue-700">*</strong></span>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input value={form.empresa} onChange={(e) => atualizar("empresa", e.target.value)} required placeholder="Nome da sua empresa" className="h-14 w-full rounded-xl border border-slate-300 bg-white px-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">Cargo</span>
                  <input value={form.cargo} onChange={(e) => atualizar("cargo", e.target.value)} placeholder="Seu cargo na empresa" className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">Telefone / WhatsApp <strong className="text-blue-700">*</strong></span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input value={form.telefone} onChange={(e) => atualizar("telefone", e.target.value)} required placeholder="(11) 99999-9999" className="h-14 w-full rounded-xl border border-slate-300 bg-white px-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">Número de colaboradores</span>
                  <select value={form.colaboradores} onChange={(e) => atualizar("colaboradores", e.target.value)} required className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-600 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                    <option value="">Selecione</option>
                    {colaboradores.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-800">Segmento de atuação <strong className="text-blue-700">*</strong></span>
                <select value={form.segmento} onChange={(e) => atualizar("segmento", e.target.value)} required className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-600 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                  <option value="">Selecione o segmento da sua empresa</option>
                  {segmentos.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-800">Média de lucro</span>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input value={form.mediaLucro} onChange={(e) => atualizar("mediaLucro", e.target.value)} placeholder="Ex: R$ 80.000/mês" className="h-14 w-full rounded-xl border border-slate-300 bg-white px-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-800">Como podemos ajudar sua empresa? <strong className="text-blue-700">*</strong></span>
                <div className="relative">
                  <textarea value={form.observacoes} onChange={(e) => atualizar("observacoes", e.target.value.slice(0, 500))} required rows={5} placeholder="Conte-nos sobre os principais desafios e objetivos da sua empresa..." className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                  <span className="absolute bottom-3 right-4 text-xs font-semibold text-slate-500">{caracteres}/500</span>
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

              <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                <ShieldCheck className="h-5 w-5" />
                Suas informações estão seguras e não serão compartilhadas.
              </div>

              <label className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                <input type="checkbox" checked={form.comunicacoes} onChange={(e) => atualizar("comunicacoes", e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-600" />
                Concordo em receber comunicações da Flow Sales CRM sobre novidades e conteúdos.
              </label>

              <button type="submit" disabled={enviando} className="inline-flex h-16 items-center justify-center gap-3 rounded-xl bg-blue-700 px-8 text-lg font-black text-white shadow-xl shadow-blue-700/25 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70">
                {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {enviando ? "Enviando..." : "Solicitar demonstração"}
              </button>

              <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-slate-500">
                <LockKeyhole className="h-4 w-4" />
                Ao enviar, você concorda com nossa Política de Privacidade.
              </p>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
