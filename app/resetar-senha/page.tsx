"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetarSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvarNovaSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");
    setSucesso("");

    if (senha.length < 8) {
      setErro("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }

    setCarregando(true);

    const { error } = await supabase.auth.updateUser({
      password: senha,
    });

    if (error) {
      setErro("Não foi possível atualizar a senha. Abra novamente o link de recuperação enviado por e-mail.");
      setCarregando(false);
      return;
    }

    setSucesso("Senha atualizada com sucesso. Você será redirecionado para o login.");

    setTimeout(() => {
      router.push("/login");
    }, 1400);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 text-slate-950">
      <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-blue-200/70 blur-3xl" />
      <div className="absolute right-[-140px] top-[25%] h-[360px] w-[360px] rounded-full bg-sky-100/90 blur-3xl" />
      <div className="absolute bottom-[-150px] left-[28%] h-[380px] w-[380px] rounded-full bg-indigo-100/80 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.82),rgba(241,245,249,0.92)_48%,rgba(226,232,240,0.96)_100%)]" />

      <section className="relative z-10 w-full max-w-[470px] overflow-hidden rounded-[28px] border border-white/80 bg-white px-6 py-8 shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:px-10">
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
            Redefinir senha
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Crie uma nova senha para acessar o sistema.
          </p>
        </div>

        <form onSubmit={salvarNovaSenha} className="space-y-4">
          <div>
            <label
              htmlFor="senha"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Nova senha
            </label>

            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
              autoComplete="new-password"
              placeholder="Digite a nova senha"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmarSenha"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Confirmar nova senha
            </label>

            <input
              id="confirmarSenha"
              type="password"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              required
              autoComplete="new-password"
              placeholder="Digite novamente"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
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
            {carregando ? "Salvando..." : "Salvar nova senha"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Voltar para o login
          </button>
        </form>
      </section>
    </main>
  );
}
