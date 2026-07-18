"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, Save, Search, ShieldCheck, Users, XCircle } from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  recebe_leads: boolean;
  status_operacional: string;
  status_administrativo: string;
};

type Modulo = {
  chave: string;
  nome: string;
  descricao: string;
};

type Permissao = {
  id: string;
  usuario_id: string;
  modulo_chave: string;
  permitido: boolean;
  atualizado_em?: string;
};

type ApiResponse = {
  ok: boolean;
  erro?: string;
  pode_editar: boolean;
  usuarios: Usuario[];
  modulos: Modulo[];
  permissoes: Permissao[];
};

function perfilBadge(perfil: string) {
  const base = String(perfil || "").toLowerCase();
  if (["adm", "admin"].includes(base)) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (base === "suporte") return "bg-violet-50 text-violet-700 ring-violet-100";
  if (["supervisor", "gerente"].includes(base)) return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function Page() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [podeEditar, setPodeEditar] = useState(false);

  const usuarioAtual = useMemo(
    () => usuarios.find((usuario) => usuario.id === usuarioSelecionado) || usuarios[0],
    [usuarios, usuarioSelecionado]
  );

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((usuario) =>
      `${usuario.nome} ${usuario.email} ${usuario.perfil}`.toLowerCase().includes(termo)
    );
  }, [usuarios, busca]);

  function permissaoAtiva(usuarioId: string, moduloChave: string) {
    return permissoes.some((permissao) => permissao.usuario_id === usuarioId && permissao.modulo_chave === moduloChave && permissao.permitido);
  }

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/usuarios/permissoes", { method: "GET", cache: "no-store" });
      const dados = (await resposta.json()) as ApiResponse;

      if (!resposta.ok || !dados.ok) {
        throw new Error(dados.erro || "Não foi possível carregar permissões.");
      }

      setUsuarios(dados.usuarios || []);
      setModulos(dados.modulos || []);
      setPermissoes(dados.permissoes || []);
      setPodeEditar(Boolean(dados.pode_editar));
      setUsuarioSelecionado((atual) => atual || dados.usuarios?.[0]?.id || "");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar permissões.");
    } finally {
      setCarregando(false);
    }
  }

  async function alterarPermissao(moduloChave: string, permitido: boolean) {
    if (!usuarioAtual) return;
    setSalvando(moduloChave);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/usuarios/permissoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: usuarioAtual.id,
          modulo_chave: moduloChave,
          permitido,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.ok) {
        throw new Error(dados.erro || "Não foi possível salvar permissão.");
      }

      setPermissoes((atuais) => {
        const semAtual = atuais.filter(
          (permissao) => !(permissao.usuario_id === usuarioAtual.id && permissao.modulo_chave === moduloChave)
        );
        return [...semAtual, dados.permissao];
      });
      setSucesso("Permissão salva com sucesso.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar permissão.");
    } finally {
      setSalvando("");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  if (carregando) {
    return (
      <main className="p-4 sm:p-6">
        <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">Carregando permissões...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Usuários</p>
          <div className="mt-2 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Perfis e permissões</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Aqui você define o que cada colaborador pode acessar. Configurações cria a regra; esta tela aplica o acesso por usuário.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              {podeEditar ? "ADM/Suporte pode editar permissões." : "Você pode visualizar, mas não editar permissões."}
            </div>
          </div>
        </section>

        {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{erro}</div> : null}
        {sucesso ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{sucesso}</div> : null}

        <section className="grid gap-5 xl:grid-cols-[390px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-700" />
              <h2 className="font-black text-slate-950">Colaboradores</h2>
            </div>

            <label className="relative mb-4 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, e-mail ou perfil..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {usuariosFiltrados.map((usuario) => {
                const ativo = usuarioAtual?.id === usuario.id;
                return (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => setUsuarioSelecionado(usuario.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      ativo ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{usuario.nome}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{usuario.email}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1 ${perfilBadge(usuario.perfil)}`}>
                        {usuario.perfil}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {usuarioAtual ? (
              <>
                <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Permissões de acesso</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{usuarioAtual.nome}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{usuarioAtual.email}</p>
                  </div>
                  <div className="grid gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <span className="font-bold text-slate-500">Perfil: <strong className="text-slate-950">{usuarioAtual.perfil}</strong></span>
                    <span className="font-bold text-slate-500">Recebe leads: <strong className="text-slate-950">{usuarioAtual.recebe_leads ? "Sim" : "Não"}</strong></span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {modulos.map((modulo) => {
                    const ativo = permissaoAtiva(usuarioAtual.id, modulo.chave);
                    return (
                      <div key={modulo.chave} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              {ativo ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-slate-300" />}
                              <h3 className="font-black text-slate-950">{modulo.nome}</h3>
                            </div>
                            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{modulo.descricao}</p>
                          </div>
                          <button
                            type="button"
                            disabled={!podeEditar || salvando === modulo.chave}
                            onClick={() => alterarPermissao(modulo.chave, !ativo)}
                            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${ativo ? "bg-blue-700" : "bg-slate-300"}`}
                          >
                            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${ativo ? "left-6" : "left-1"}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-center">
                <div>
                  <LockKeyhole className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-500">Nenhum usuário encontrado.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {salvando ? (
          <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl">
            <Save className="h-4 w-4" />
            Salvando permissão...
          </div>
        ) : null}
      </div>
    </main>
  );
}
