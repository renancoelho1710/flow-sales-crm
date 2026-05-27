"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Plus, ShieldCheck, X } from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
};

type Props = {
  perfilUsuarioLogado: string;
};

type TokenGerado = {
  token: string;
  usuario_nome: string;
  nome_dispositivo: string;
  aviso: string;
};

function podeGerarToken(perfil: string) {
  return ["adm", "suporte"].includes(perfil);
}

export function GerarConectorWhatsApp({ perfilUsuarioLogado }: Props) {
  const [aberto, setAberto] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [nomeDispositivo, setNomeDispositivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tokenGerado, setTokenGerado] = useState<TokenGerado | null>(null);
  const [copiado, setCopiado] = useState(false);

  const permitido = podeGerarToken(perfilUsuarioLogado);

  async function carregarUsuarios() {
    if (!permitido) return;

    setCarregandoUsuarios(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/whatsapp/conector/tokens", {
        method: "GET",
        cache: "no-store",
      });

      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        setErro(json.erro || "Erro ao carregar usuários.");
        setCarregandoUsuarios(false);
        return;
      }

      setUsuarios(json.usuarios || []);

      if (!usuarioId && json.usuarios?.[0]?.id) {
        setUsuarioId(json.usuarios[0].id);
      }
    } catch {
      setErro("Erro ao carregar usuários.");
    }

    setCarregandoUsuarios(false);
  }

  async function gerarToken() {
    if (!usuarioId) {
      setErro("Selecione um funcionário.");
      return;
    }

    setGerando(true);
    setErro(null);
    setTokenGerado(null);
    setCopiado(false);

    try {
      const resposta = await fetch("/api/whatsapp/conector/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario_id: usuarioId,
          nome_dispositivo: nomeDispositivo,
          observacao,
        }),
      });

      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        setErro(json.erro || "Erro ao gerar token.");
        setGerando(false);
        return;
      }

      setTokenGerado({
        token: json.token,
        usuario_nome: json.usuario_nome,
        nome_dispositivo: json.nome_dispositivo,
        aviso: json.aviso,
      });
    } catch {
      setErro("Erro ao gerar token.");
    }

    setGerando(false);
  }

  async function copiarToken() {
    if (!tokenGerado?.token) return;

    await navigator.clipboard.writeText(tokenGerado.token);
    setCopiado(true);

    setTimeout(() => setCopiado(false), 1800);
  }

  useEffect(() => {
    if (aberto) {
      carregarUsuarios();
    }
  }, [aberto]);

  if (!permitido) {
    return null;
  }

  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
            <KeyRound className="h-5 w-5 text-blue-700" />
            Conector WhatsApp
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gere o token individual para instalar o conector no PC do atendente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
        >
          {aberto ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {aberto ? "Fechar" : "Gerar conector"}
        </button>
      </div>

      {aberto ? (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 xl:grid-cols-[1.2fr_1fr_1.2fr_auto]">
          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Funcionário
            </span>
            <select
              value={usuarioId}
              onChange={(event) => setUsuarioId(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              {carregandoUsuarios ? (
                <option>Carregando...</option>
              ) : null}

              {!carregandoUsuarios && usuarios.length === 0 ? (
                <option value="">Nenhum usuário encontrado</option>
              ) : null}

              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome} — {usuario.perfil}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Nome do dispositivo
            </span>
            <input
              value={nomeDispositivo}
              onChange={(event) => setNomeDispositivo(event.target.value)}
              placeholder="Ex: PC João Loja 02"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Observação
            </span>
            <input
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              placeholder="Ex: WhatsApp comercial loja 02"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <button
            type="button"
            onClick={gerarToken}
            disabled={gerando || carregandoUsuarios}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 xl:mt-auto"
          >
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Gerar token
          </button>
        </div>
      ) : null}

      {erro ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {erro}
        </div>
      ) : null}

      {tokenGerado ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-bold text-emerald-800">
                Token gerado para {tokenGerado.usuario_nome}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {tokenGerado.nome_dispositivo}
              </p>
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                {tokenGerado.aviso}
              </p>
            </div>

            <button
              type="button"
              onClick={copiarToken}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              <Copy className="h-4 w-4" />
              {copiado ? "Copiado" : "Copiar token"}
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 font-mono text-sm font-bold text-slate-900">
            {tokenGerado.token}
          </div>
        </div>
      ) : null}
    </section>
  );
}
