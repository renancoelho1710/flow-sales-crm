"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        "Não foi possível conectar ao Supabase agora. Confira a internet, as chaves do .env.local e tente novamente."
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 text-slate-950">
      <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-blue-200/70 blur-3xl" />
      <div className="absolute right-[-140px] top-[25%] h-[360px] w-[360px] rounded-full bg-sky-100/90 blur-3xl" />
      <div className="absolute bottom-[-150px] left-[28%] h-[380px] w-[380px] rounded-full bg-indigo-100/80 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.82),rgba(241,245,249,0.92)_48%,rgba(226,232,240,0.96)_100%)]" />

      {carregando ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-7 shadow-2xl">
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

            <p className="text-sm font-semibold text-slate-700">Entrando...</p>
          </div>
        </div>
      ) : null}

      <section className="relative z-10 grid w-full max-w-[980px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] lg:grid-cols-[48%_52%]">
        <aside className="relative hidden min-h-[440px] overflow-hidden bg-slate-950 lg:block">
          <Image
            src="/image-login.png"
            alt="Flow Sales CRM"
            fill
            priority
            sizes="480px"
            className="object-cover"
          />
        </aside>

        <section className="flex min-h-[440px] items-center justify-center bg-white px-6 py-8 sm:px-10">
          <div className="w-full max-w-[380px]">
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
                Bem-vindo de volta
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Faça login para acessar sua conta
              </p>
            </div>

            <form onSubmit={entrar} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  E-mail
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="senha"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Senha
                </label>

                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-24 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 hover:text-blue-800"
                  >
                    {mostrarSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={lembrar}
                    onChange={(event) => setLembrar(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  Lembrar-me
                </label>

                <button
                  type="button"
                  onClick={recuperarSenha}
                  disabled={recuperandoSenha}
                  className="font-semibold text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {recuperandoSenha ? "Enviando..." : "Esqueci minha senha"}
                </button>
              </div>

              {erro ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {erro}
                </div>
              ) : null}

              {sucesso ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {sucesso}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={carregando}
                className="h-12 w-full rounded-xl bg-blue-700 px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(29,78,216,0.26)] transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              © 2026 Flow Sales CRM. Todos os direitos reservados.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
