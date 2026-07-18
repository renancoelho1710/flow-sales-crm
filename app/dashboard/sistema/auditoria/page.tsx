"use client";

import {
  Activity,
  Clock3,
  Database,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type AuditoriaLog = {
  id: string;
  modulo: string | null;
  acao: string | null;
  entidade: string | null;
  entidade_id: string | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  descricao: string | null;
  metadata: Record<string, unknown> | null;
  criado_em: string | null;
};

type RetornoAuditoria = {
  ok: boolean;
  erro?: string;
  logs: AuditoriaLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function dataHoraBr(valor: string | null | undefined) {
  if (!valor) return "Sem data";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function acaoBonita(acao: string | null | undefined) {
  const mapa: Record<string, string> = {
    vincular_operador_resgate: "Vinculou operador",
    editar_vinculo_operador_resgate: "Editou vínculo",
    remover_vinculo_operador_resgate: "Removeu vínculo",
    vincular_agendamento_resgate: "Vinculou agendamento",
    confirmar_venda_operador: "Confirmou venda",
    recusar_vinculo_resgate: "Recusou vínculo",
  };

  return mapa[String(acao || "")] || acao || "Ação não informada";
}

function moduloBonito(modulo: string | null | undefined) {
  const mapa: Record<string, string> = {
    vendas_resgate: "Vendas / Resgate",
    sistema: "Sistema",
    configuracoes: "Configurações",
  };

  return mapa[String(modulo || "")] || modulo || "Módulo não informado";
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState("todos");
  const [acao, setAcao] = useState("todos");
  const [usuario, setUsuario] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (busca.trim()) params.set("busca", busca.trim());
      if (modulo !== "todos") params.set("modulo", modulo);
      if (acao !== "todos") params.set("acao", acao);
      if (usuario.trim()) params.set("usuario", usuario.trim());

      const resposta = await fetch(
        `/api/sistema/auditoria?${params.toString()}`,
      );
      const json = (await resposta.json()) as RetornoAuditoria;

      if (!json.ok) {
        setErro(json.erro || "Erro ao carregar auditoria.");
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      setLogs(json.logs || []);
      setTotal(json.pagination?.total || 0);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar auditoria.",
      );
    } finally {
      setCarregando(false);
    }
  }, [acao, busca, modulo, page, pageSize, usuario]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const resumo = useMemo(() => {
    const usuarios = new Set(
      logs.map((log) => log.usuario_email || log.usuario_nome).filter(Boolean),
    );

    return {
      totalPagina: logs.length,
      usuarios: usuarios.size,
      vendasResgate: logs.filter((log) => log.modulo === "vendas_resgate")
        .length,
    };
  }, [logs]);

  return (
    <div className="space-y-6 px-3 pb-8 pt-10 md:px-4 md:pt-12 lg:px-5 lg:pt-14">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-700 px-7 py-7 text-white">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-100">
                Sistema
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                Auditoria
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold text-blue-100">
                Histórico das ações importantes do CRM: vínculos, validações,
                recusas, edições e operações sensíveis.
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              disabled={carregando}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-blue-900 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            titulo="Eventos"
            valor={total}
            detalhe="Total filtrado"
            icon={<Activity />}
          />
          <ResumoCard
            titulo="Nesta página"
            valor={resumo.totalPagina}
            detalhe="Eventos carregados"
            icon={<Database />}
          />
          <ResumoCard
            titulo="Usuários"
            valor={resumo.usuarios}
            detalhe="Usuários nesta página"
            icon={<UserRound />}
          />
          <ResumoCard
            titulo="Vendas/Resgate"
            valor={resumo.vendasResgate}
            detalhe="Eventos do módulo"
            icon={<ShieldCheck />}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_190px_220px_220px_130px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => {
                setBusca(event.target.value);
                setPage(1);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") carregar();
              }}
              placeholder="Buscar por placa, descrição, usuário, ação..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </label>

          <select
            value={modulo}
            onChange={(event) => {
              setModulo(event.target.value);
              setPage(1);
            }}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="todos">Todos módulos</option>
            <option value="vendas_resgate">Vendas / Resgate</option>
            <option value="sistema">Sistema</option>
            <option value="configuracoes">Configurações</option>
          </select>

          <select
            value={acao}
            onChange={(event) => {
              setAcao(event.target.value);
              setPage(1);
            }}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="todos">Todas ações</option>
            <option value="vincular_operador_resgate">Vincular operador</option>
            <option value="editar_vinculo_operador_resgate">
              Editar vínculo
            </option>
            <option value="remover_vinculo_operador_resgate">
              Remover vínculo
            </option>
            <option value="vincular_agendamento_resgate">
              Vincular agendamento
            </option>
            <option value="confirmar_venda_operador">Confirmar venda</option>
            <option value="recusar_vinculo_resgate">Recusar vínculo</option>
          </select>

          <input
            value={usuario}
            onChange={(event) => {
              setUsuario(event.target.value);
              setPage(1);
            }}
            placeholder="Usuário"
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
          />

          <button
            type="button"
            onClick={carregar}
            className="h-12 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800"
          >
            Buscar
          </button>
        </div>
      </section>

      {erro ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {erro}
        </section>
      ) : null}

      <section className="grid gap-3">
        {carregando ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-black text-slate-500">
              Carregando auditoria...
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Nenhum evento encontrado
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Ajuste os filtros ou realize uma ação auditada.
            </p>
          </div>
        ) : (
          logs.map((log) => <AuditoriaCard key={log.id} log={log} />)
        )}
      </section>

      {total > 0 ? (
        <section className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-bold text-slate-500">
            Página {page} de {totalPages} · {total} eventos
          </p>

          <div className="flex flex-wrap gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>

            <button
              type="button"
              disabled={page <= 1 || carregando}
              onClick={() => setPage((atual) => Math.max(1, atual - 1))}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            <button
              type="button"
              disabled={page >= totalPages || carregando}
              onClick={() =>
                setPage((atual) => Math.min(totalPages, atual + 1))
              }
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  detalhe,
  icon,
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            {titulo}
          </p>
          <strong className="mt-3 block text-3xl font-black tracking-[-0.05em] text-slate-950">
            {valor}
          </strong>
          <span className="mt-1 block text-xs font-bold text-slate-500">
            {detalhe}
          </span>
        </div>

        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
          {icon}
        </div>
      </div>
    </article>
  );
}

function AuditoriaCard({ log }: { log: AuditoriaLog }) {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-slate-950 px-3 py-1 text-xs font-black text-white">
              {moduloBonito(log.modulo)}
            </span>
            <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {acaoBonita(log.acao)}
            </span>
            {log.entidade_id ? (
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                ID: {log.entidade_id}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-base font-black text-slate-950">
            {log.descricao || "Evento sem descrição."}
          </h3>

          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-2 xl:grid-cols-4">
            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              {log.usuario_nome || "Usuário não informado"}
            </span>

            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {log.usuario_email || "E-mail não informado"}
            </span>

            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {dataHoraBr(log.criado_em)}
            </span>

            <span className="inline-flex items-center gap-2">
              <Database className="h-4 w-4" />
              {log.entidade || "Entidade não informada"}
            </span>
          </div>

          {log.metadata ? (
            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Ver detalhes técnicos
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs font-bold text-slate-100">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}
