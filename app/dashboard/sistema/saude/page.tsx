"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileClock,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Table2,
  Wifi,
  XCircle,
} from "lucide-react";

type TabelaSaude = {
  tabela: string;
  ok: boolean;
  total: number;
  erro: string | null;
};

type AbaSheet = {
  nome: string;
  ok: boolean;
  status: number;
  tamanho: number;
  erro: string | null;
};

type SyncItem = {
  id: string;
  modulo: string;
  origem: string;
  status: string;
  iniciado_por_nome: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  total_processados: number;
  total_criados: number;
  total_erros: number;
  erro: string | null;
};

type ErroItem = {
  id: string;
  modulo: string;
  origem: string | null;
  mensagem: string;
  usuario_email: string | null;
  criado_em: string;
};

type RetornoSaude = {
  ok: boolean;
  erro?: string;
  saude: {
    status_geral: "ok" | "atencao";
    tabelas: TabelaSaude[];
    google_sheets: {
      ok: boolean;
      erro: string | null;
      abas: AbaSheet[];
    };
    ultima_sincronizacao: SyncItem[];
    erros_recentes: ErroItem[];
  };
};

function dataBr(data: string | null | undefined) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

export default function SaudeSistemaPage() {
  const [dados, setDados] = useState<RetornoSaude["saude"] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregar() {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch("/api/sistema/saude");
      const json = (await resposta.json()) as RetornoSaude;

      if (!json.ok) {
        setErro(json.erro || "Erro ao carregar saúde do sistema.");
        setDados(null);
        return;
      }

      setDados(json.saude);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar saúde do sistema.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <main className="flow-premium-page min-h-screen bg-slate-50 p-6 text-slate-950">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.34em] text-blue-700">
                Sistema
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                Saúde do sistema
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Monitoramento de planilhas, banco, sincronizações e erros.
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              disabled={carregando}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Atualizar
            </button>
          </div>
        </div>

        {erro ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {erro}
          </div>
        ) : null}

        {carregando ? (
          <div className="mt-6 rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-black text-slate-500">
              Verificando saúde do sistema...
            </p>
          </div>
        ) : dados ? (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard
                titulo="Status geral"
                valor={dados.status_geral === "ok" ? "OK" : "Atenção"}
                ok={dados.status_geral === "ok"}
                icon={<ShieldCheck />}
              />
              <StatusCard
                titulo="Google Sheets"
                valor={dados.google_sheets.ok ? "OK" : "Atenção"}
                ok={dados.google_sheets.ok}
                icon={<Wifi />}
              />
              <StatusCard
                titulo="Tabelas"
                valor={`${dados.tabelas.filter((t) => t.ok).length}/${dados.tabelas.length}`}
                ok={dados.tabelas.every((t) => t.ok)}
                icon={<Database />}
              />
              <StatusCard
                titulo="Erros recentes"
                valor={String(dados.erros_recentes.length)}
                ok={dados.erros_recentes.length === 0}
                icon={<AlertTriangle />}
              />
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-2">
              <Painel titulo="Tabelas do sistema" icon={<Table2 />}>
                <div className="grid gap-3">
                  {dados.tabelas.map((tabela) => (
                    <LinhaStatus
                      key={tabela.tabela}
                      titulo={tabela.tabela}
                      detalhe={`${tabela.total} registros`}
                      ok={tabela.ok}
                      erro={tabela.erro}
                    />
                  ))}
                </div>
              </Painel>

              <Painel titulo="Google Sheets" icon={<Wifi />}>
                <div className="grid gap-3">
                  {dados.google_sheets.abas.map((aba) => (
                    <LinhaStatus
                      key={aba.nome}
                      titulo={aba.nome}
                      detalhe={`HTTP ${aba.status} · ${aba.tamanho} caracteres`}
                      ok={aba.ok}
                      erro={aba.erro}
                    />
                  ))}
                </div>
              </Painel>
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-2">
              <Painel titulo="Últimas sincronizações" icon={<FileClock />}>
                <div className="grid gap-3">
                  {dados.ultima_sincronizacao.length === 0 ? (
                    <p className="text-sm font-bold text-slate-400">
                      Nenhuma sincronização registrada ainda.
                    </p>
                  ) : (
                    dados.ultima_sincronizacao.map((sync) => (
                      <div
                        key={sync.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-sm font-black text-slate-950">
                            {sync.modulo} · {sync.origem}
                          </strong>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                            {sync.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {dataBr(sync.iniciado_em)} ·{" "}
                          {sync.iniciado_por_nome || "Usuário não informado"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Processados: {sync.total_processados} · Criados:{" "}
                          {sync.total_criados} · Erros: {sync.total_erros}
                        </p>
                        {sync.erro ? (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            {sync.erro}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </Painel>

              <Painel titulo="Erros recentes" icon={<AlertTriangle />}>
                <div className="grid gap-3">
                  {dados.erros_recentes.length === 0 ? (
                    <p className="text-sm font-bold text-slate-400">
                      Nenhum erro recente registrado.
                    </p>
                  ) : (
                    dados.erros_recentes.map((erro) => (
                      <div
                        key={erro.id}
                        className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3"
                      >
                        <strong className="text-sm font-black text-red-800">
                          {erro.modulo}
                        </strong>
                        <p className="mt-1 text-xs font-bold text-red-700">
                          {erro.mensagem}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {dataBr(erro.criado_em)} ·{" "}
                          {erro.usuario_email || "Sem usuário"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Painel>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function StatusCard({
  titulo,
  valor,
  ok,
  icon,
}: {
  titulo: string;
  valor: string;
  ok: boolean;
  icon: React.ReactNode;
}) {
  return (
    <article
      className={`rounded-[24px] border p-5 shadow-sm ${
        ok ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            {titulo}
          </p>
          <strong className="mt-3 block text-3xl font-black tracking-[-0.05em] text-slate-950">
            {valor}
          </strong>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
          {icon}
        </div>
      </div>
    </article>
  );
}

function Painel({
  titulo,
  icon,
  children,
}: {
  titulo: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
        <h2 className="text-sm font-black text-slate-950">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function LinhaStatus({
  titulo,
  detalhe,
  ok,
  erro,
}: {
  titulo: string;
  detalhe: string;
  ok: boolean;
  erro?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <strong className="text-sm font-black text-slate-950">
            {titulo}
          </strong>
          <p className="mt-1 text-xs font-bold text-slate-500">{detalhe}</p>
        </div>

        {ok ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-red-600" />
        )}
      </div>

      {erro ? (
        <p className="mt-2 text-xs font-bold text-red-600">{erro}</p>
      ) : null}
    </div>
  );
}
