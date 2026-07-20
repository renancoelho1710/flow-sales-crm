"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Copy,
  KeyRound,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApiToken = {
  id: string;
  nome: string;
  prefixo: string | null;
  ativo: boolean;
  permissoes: Record<string, boolean>;
  ultimo_uso_em: string | null;
  criado_em: string;
  revogado_em: string | null;
};

type ApiLog = {
  id: string;
  token_id: string | null;
  nome_token: string | null;
  metodo: string | null;
  rota: string | null;
  status: number | null;
  sucesso: boolean;
  ip: string | null;
  user_agent: string | null;
  duracao_ms: number | null;
  erro: string | null;
  metadata: Record<string, any>;
  criado_em: string;
};

const PERMISSOES = [
  {
    chave: "health:ler",
    label: "Consultar saúde",
    descricao: "Permite GET /api/public/v1/health",
  },
  {
    chave: "vendas:ler",
    label: "Consultar vendas",
    descricao: "Permite GET /api/public/v1/vendas?placa=...",
  },
  {
    chave: "leads:criar",
    label: "Criar leads",
    descricao: "Reservado para endpoint futuro de criação de lead.",
  },
  {
    chave: "*",
    label: "Acesso total",
    descricao: "Libera todas as permissões da API pública.",
  },
];

function dataHora(valor?: string | null) {
  if (!valor) return "Nunca";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(valor));
  } catch {
    return "Nunca";
  }
}

function permissaoAtiva(
  permissoes: Record<string, boolean> | null,
  chave: string,
) {
  if (!permissoes) return false;
  return permissoes[chave] === true;
}

export function ApiPublicaPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [nomeToken, setNomeToken] = useState("Novo acesso externo");
  const [permissoes, setPermissoes] = useState<Record<string, boolean>>({
    "health:ler": true,
    "vendas:ler": true,
  });
  const [tokenGerado, setTokenGerado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [filtroLog, setFiltroLog] = useState("");

  const tokensAtivos = useMemo(
    () => tokens.filter((token) => token.ativo && !token.revogado_em).length,
    [tokens],
  );

  const logsComErro = useMemo(
    () => logs.filter((log) => !log.sucesso).length,
    [logs],
  );

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const [tokensResposta, logsResposta] = await Promise.all([
        fetch("/api/sistema/api-tokens", { cache: "no-store" }),
        fetch("/api/sistema/api-logs?limit=80", { cache: "no-store" }),
      ]);

      const tokensJson = await tokensResposta.json().catch(() => null);
      const logsJson = await logsResposta.json().catch(() => null);

      if (!tokensResposta.ok || !tokensJson?.ok) {
        throw new Error(
          tokensJson?.erro || "Não foi possível carregar tokens.",
        );
      }

      if (!logsResposta.ok || !logsJson?.ok) {
        throw new Error(logsJson?.erro || "Não foi possível carregar logs.");
      }

      setTokens(tokensJson.tokens || []);
      setLogs(logsJson.logs || []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar API pública.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function togglePermissao(chave: string) {
    setPermissoes((atual) => {
      const proximo = {
        ...atual,
        [chave]: !Boolean(atual[chave]),
      };

      if (chave === "*" && proximo["*"]) {
        return { "*": true };
      }

      if (chave !== "*" && proximo[chave]) {
        delete proximo["*"];
      }

      return proximo;
    });
  }

  async function gerarToken() {
    try {
      setSalvando(true);
      setErro("");
      setSucesso("");
      setTokenGerado("");

      const resposta = await fetch("/api/sistema/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeToken,
          permissoes,
        }),
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível gerar token.");
      }

      setTokenGerado(json.token_copiavel || "");
      setSucesso("Token criado. Copie agora, ele não aparece novamente.");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao gerar token.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarToken(id: string, acao: "revogar" | "reativar") {
    const confirmar =
      acao === "revogar"
        ? window.confirm(
            "Revogar este token? Sistemas externos que usam ele vão parar de acessar a API.",
          )
        : true;

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      const resposta = await fetch(`/api/sistema/api-tokens/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível alterar token.");
      }

      setSucesso(acao === "revogar" ? "Token revogado." : "Token reativado.");
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao alterar token.",
      );
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setSucesso("Copiado para a área de transferência.");
    } catch {
      setErro("Não foi possível copiar automaticamente.");
    }
  }

  const logsFiltrados = logs.filter((log) => {
    if (!filtroLog.trim()) return true;

    const termo = filtroLog.toLowerCase();

    return (
      String(log.rota || "")
        .toLowerCase()
        .includes(termo) ||
      String(log.nome_token || "")
        .toLowerCase()
        .includes(termo) ||
      String(log.status || "").includes(termo) ||
      String(log.erro || "")
        .toLowerCase()
        .includes(termo)
    );
  });

  return (
    <main className="flow-premium-page min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-700">
                API pública
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                Tokens, permissões e logs
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                Controle os acessos externos ao Flow Sales CRM. Use tokens para
                sistemas externos consultarem vendas, saúde do sistema e futuros
                endpoints.
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              disabled={carregando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Atualizar
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <ResumoCard
            icon={KeyRound}
            label="Tokens ativos"
            value={String(tokensAtivos)}
          />
          <ResumoCard
            icon={Activity}
            label="Logs recentes"
            value={String(logs.length)}
          />
          <ResumoCard
            icon={logsComErro > 0 ? AlertTriangle : ShieldCheck}
            label="Logs com erro"
            value={String(logsComErro)}
          />
        </section>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {erro}
          </div>
        ) : null}

        {sucesso ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {sucesso}
          </div>
        ) : null}

        {tokenGerado ? (
          <section className="rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                  Token gerado
                </p>
                <h2 className="mt-1 text-lg font-black text-amber-950">
                  Copie agora. Ele não será exibido novamente.
                </h2>
                <p className="mt-2 break-all rounded-2xl bg-white p-3 font-mono text-xs font-bold text-slate-800">
                  {tokenGerado}
                </p>
              </div>

              <button
                type="button"
                onClick={() => copiar(tokenGerado)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-700"
              >
                <Copy className="h-4 w-4" />
                Copiar token
              </button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[430px_1fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Gerar novo token
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  Crie acesso para site, robô, BI ou outro sistema.
                </p>
              </div>
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Nome do token
              </span>
              <input
                value={nomeToken}
                onChange={(event) => setNomeToken(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-blue-600 focus:bg-white"
                placeholder="Ex: Site Azul, BI, Robô externo..."
              />
            </label>

            <div className="mt-5 space-y-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Permissões
              </p>

              {PERMISSOES.map((permissao) => (
                <button
                  key={permissao.chave}
                  type="button"
                  onClick={() => togglePermissao(permissao.chave)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    permissoes[permissao.chave]
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">
                        {permissao.label}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        {permissao.descricao}
                      </p>
                    </div>

                    {permissoes[permissao.chave] ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-700" />
                    ) : (
                      <XCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={salvando}
              onClick={gerarToken}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Gerar token
            </button>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Tokens cadastrados
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  Por segurança, o token completo só aparece no momento da
                  criação.
                </p>
              </div>
              <LockKeyhole className="h-6 w-6 text-blue-700" />
            </div>

            <div className="mt-5 space-y-3">
              {carregando ? (
                <div className="rounded-2xl border border-slate-200 p-5 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-700" />
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    Carregando tokens...
                  </p>
                </div>
              ) : null}

              {!carregando && tokens.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 p-5 text-center">
                  <KeyRound className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    Nenhum token criado ainda.
                  </p>
                </div>
              ) : null}

              {tokens.map((token) => {
                const ativo = token.ativo && !token.revogado_em;

                return (
                  <article
                    key={token.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                              ativo
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {ativo ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {ativo ? "Ativo" : "Revogado"}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-500">
                            {token.prefixo || "sem prefixo"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-black text-slate-950">
                          {token.nome}
                        </h3>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Criado em {dataHora(token.criado_em)} · Último uso:{" "}
                          {dataHora(token.ultimo_uso_em)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {PERMISSOES.filter((p) =>
                            permissaoAtiva(token.permissoes, p.chave),
                          ).map((p) => (
                            <span
                              key={p.chave}
                              className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700"
                            >
                              {p.chave}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          alterarToken(token.id, ativo ? "revogar" : "reativar")
                        }
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                          ativo
                            ? "border border-red-100 text-red-700 hover:bg-red-50"
                            : "border border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {ativo ? (
                          <Trash2 className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {ativo ? "Revogar" : "Reativar"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Endpoints disponíveis
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Primeira versão da API pública do Flow.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                copiar(
                  "Authorization: Bearer SEU_TOKEN\n\nGET /api/public/v1/health\nGET /api/public/v1/vendas?placa=FFE5B10",
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <Clipboard className="h-4 w-4" />
              Copiar exemplo
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Endpoint
              metodo="GET"
              rota="/api/public/v1/health"
              permissao="health:ler"
              descricao="Consulta se o Flow está online."
            />
            <Endpoint
              metodo="GET"
              rota="/api/public/v1/vendas?placa=FFE5B10"
              permissao="vendas:ler"
              descricao="Consulta venda/acompanhamento pela placa."
            />
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Logs recentes da API
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Cada chamada externa gera log com token, rota, status e duração.
              </p>
            </div>

            <input
              value={filtroLog}
              onChange={(event) => setFiltroLog(event.target.value)}
              placeholder="Filtrar logs..."
              className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Quando</th>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">Rota</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Duração</th>
                    <th className="px-4 py-3">Erro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {logsFiltrados.map((log) => (
                    <tr key={log.id} className="align-top">
                      <td className="px-4 py-3 font-bold text-slate-600">
                        {dataHora(log.criado_em)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {log.nome_token || "Sem token"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {log.metodo || "GET"} {log.rota}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            log.sucesso
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {log.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-600">
                        {log.duracao_ms ?? 0}ms
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-red-700">
                        {log.erro || "-"}
                      </td>
                    </tr>
                  ))}

                  {logsFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm font-bold text-slate-400"
                      >
                        Nenhum log encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Endpoint({
  metodo,
  rota,
  permissao,
  descricao,
}: {
  metodo: string;
  rota: string;
  permissao: string;
  descricao: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-black text-white">
          {metodo}
        </span>
        <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
          {permissao}
        </span>
      </div>
      <p className="mt-3 break-all font-mono text-xs font-black text-slate-800">
        {rota}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-500">{descricao}</p>
    </div>
  );
}
