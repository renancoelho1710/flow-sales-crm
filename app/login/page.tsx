"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  TrendingUp,
  Users,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha inválidos. Confira os dados e tente novamente.");
        setCarregando(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErro(
        "Não foi possível conectar ao Supabase agora. Confira a internet, as chaves do ambiente e tente novamente."
      );
      setCarregando(false);
    }
  }

  async function recuperarSenha() {
    setErro("");
    setSucesso("");

    if (!email) {
      setErro("Digite seu e-mail no campo acima antes de recuperar a senha.");
      return;
    }

    setRecuperandoSenha(true);

    try {
      const redirectTo = `${window.location.origin}/resetar-senha`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo,
        }
      );

      if (error) {
        setErro(
          "Não foi possível enviar o e-mail de recuperação. Confira o e-mail e tente novamente."
        );
        setRecuperandoSenha(false);
        return;
      }

      setSucesso("Enviamos um link de recuperação para o seu e-mail.");
      setRecuperandoSenha(false);
    } catch {
      setErro(
        "Não foi possível conectar ao Supabase para recuperar a senha. Tente novamente."
      );
      setRecuperandoSenha(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef4ff] px-4 py-8 text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-180px] top-[-170px] h-[520px] w-[520px] rounded-full bg-blue-200/45 blur-3xl" />
        <div className="absolute right-[-220px] top-[16%] h-[560px] w-[560px] rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[28%] h-[560px] w-[560px] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.95),transparent_18%),radial-gradient(circle_at_78%_82%,rgba(255,255,255,0.72),transparent_23%),linear-gradient(135deg,rgba(239,246,255,0.85),rgba(255,255,255,0.72))]" />
        <div className="absolute left-[-120px] top-[25%] h-[420px] w-[420px] rounded-full border border-white/80" />
        <div className="absolute right-[-90px] bottom-[-110px] h-[520px] w-[520px] rounded-full border border-white/70" />
        <div className="absolute bottom-0 left-0 h-72 w-full bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.10),transparent_32%),radial-gradient(circle_at_80%_55%,rgba(148,163,184,0.14),transparent_28%)]" />
      </div>

      {carregando ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white px-8 py-7 shadow-2xl">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
              <Image
                src="/logo.png"
                alt="Flow Sales CRM"
                width={34}
                height={34}
                priority
                className="h-[34px] w-[34px] object-contain"
              />
            </div>

            <p className="text-sm font-black text-slate-700">Entrando...</p>
          </div>
        </div>
      ) : null}

      <section className="relative z-10 grid w-full max-w-[1360px] overflow-hidden rounded-[34px] border border-white/80 bg-white/86 shadow-[0_35px_100px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:grid-cols-[49%_51%]">
        <aside className="relative hidden min-h-[710px] overflow-hidden bg-[linear-gradient(180deg,#061943_0%,#071d5a_42%,#06132f_100%)] px-14 py-14 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_13%,rgba(37,99,235,0.22),transparent_28%),radial-gradient(circle_at_86%_80%,rgba(14,165,233,0.18),transparent_22%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-64 opacity-70">
            <svg viewBox="0 0 620 260" className="h-full w-full">
              <path
                d="M0 230 C75 174 122 166 175 181 S270 210 337 151 S432 92 488 45 S560 46 620 0"
                fill="none"
                stroke="#2563eb"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M0 260 C72 212 128 204 188 217 S284 238 356 180 S440 122 500 70 S570 66 620 38"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2"
                opacity="0.4"
              />
              <path
                d="M0 260 C75 204 122 196 175 211 S270 240 337 181 S432 122 488 75 S560 76 620 30 L620 260 Z"
                fill="url(#flowGradient)"
                opacity="0.22"
              />
              <defs>
                <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#2563eb" />
                  <stop offset="1" stopColor="#020617" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="relative z-10">
            <Image
              src="/logo-slogan.png"
              alt="Flow Sales CRM"
              width={290}
              height={72}
              priority
              className="h-16 w-auto object-contain brightness-[2.4] contrast-125"
            />

            <div className="mt-10 h-1 w-10 rounded-full bg-blue-500" />

            <h1 className="mt-8 max-w-[520px] text-5xl font-black leading-[1.08] tracking-[-0.055em]">
              Gerencie relacionamentos.
              <br />
              Aumente resultados.
            </h1>

            <p className="mt-5 max-w-[480px] text-lg font-medium leading-8 text-blue-50/86">
              O CRM completo para sua equipe vender mais, atender melhor e crescer junto.
            </p>

            <div className="mt-10 space-y-5">
              {[
                {
                  titulo: "Gestão de Leads",
                  descricao: "Organize e acompanhe todas as oportunidades.",
                  icon: Users,
                },
                {
                  titulo: "Pipeline de Vendas",
                  descricao: "Visualize seu funil e acelere negociações.",
                  icon: TrendingUp,
                },
                {
                  titulo: "Agenda e Tarefas",
                  descricao: "Nunca mais perca um compromisso.",
                  icon: CalendarDays,
                },
                {
                  titulo: "Relatórios e Insights",
                  descricao: "Dados que ajudam a tomar melhores decisões.",
                  icon: BarChart3,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.titulo} className="flex items-center gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/14 text-blue-300 ring-1 ring-white/10">
                      <Icon className="h-7 w-7" />
                    </div>

                    <div>
                      <p className="text-base font-black text-white">{item.titulo}</p>
                      <p className="mt-1 text-sm font-medium text-blue-50/76">
                        {item.descricao}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[710px] items-center justify-center bg-white/92 px-6 py-10 sm:px-10">
          <div className="w-full max-w-[500px]">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-6 flex justify-center">
                <Image
                  src="/logo.png"
                  alt="Flow Sales CRM"
                  width={76}
                  height={76}
                  priority
                  className="h-[76px] w-[76px] object-contain"
                />
              </div>

              <h1 className="text-4xl font-black tracking-[-0.05em] text-slate-950">
                Bem-vindo de volta
              </h1>

              <p className="mt-3 text-base font-semibold text-slate-500">
                Faça login para acessar sua conta
              </p>
            </div>

            <form onSubmit={entrar} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-black text-slate-800"
                >
                  E-mail
                </label>

                <div className="flex h-16 items-center gap-4 rounded-2xl border border-slate-300 bg-white px-5 shadow-sm transition focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                  <Mail className="h-6 w-6 shrink-0 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-full w-full bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="senha"
                  className="mb-2 block text-sm font-black text-slate-800"
                >
                  Senha
                </label>

                <div className="flex h-16 items-center gap-4 rounded-2xl border border-slate-300 bg-white px-5 shadow-sm transition focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                  <LockKeyhole className="h-6 w-6 shrink-0 text-slate-500" />
                  <input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="h-full w-full bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-3 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={lembrar}
                    onChange={(event) => setLembrar(event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  Lembrar-me
                </label>

                <button
                  type="button"
                  onClick={recuperarSenha}
                  disabled={recuperandoSenha}
                  className="font-black text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {recuperandoSenha ? "Enviando..." : "Esqueci minha senha"}
                </button>
              </div>

              {erro ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {erro}
                </div>
              ) : null}

              {sucesso ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {sucesso}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={carregando}
                className="h-16 w-full rounded-2xl bg-blue-700 px-4 text-base font-black text-white shadow-[0_16px_34px_rgba(29,78,216,0.30)] transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <p className="mt-9 text-center text-sm font-semibold text-slate-500">
              © 2026 Flow Sales CRM. Todos os direitos reservados.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
