import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Database,
  Monitor,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type Auditoria = {
  id: string;
  usuario_id: string | null;
  acao: string;
  modulo: string;
  entidade: string | null;
  entidade_id: string | null;
  valor_anterior: any;
  valor_novo: any;
  ip: string | null;
  user_agent: string | null;
  criado_em: string;
};

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "")
    .trim()
    .toLowerCase();
}

function formatarData(valor?: string | null) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function labelAcao(valor: string) {
  return String(valor || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function resumirValor(valor: any) {
  if (!valor) return "—";
  const texto = JSON.stringify(valor);
  if (texto.length <= 180) return texto;
  return `${texto.slice(0, 180)}...`;
}

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuarioInterno) redirect("/login");

  if (!["adm", "admin"].includes(normalizarPerfil(usuarioInterno.perfil))) {
    redirect("/dashboard");
  }

  const { data: auditorias, error } = await supabase
    .from("configuracoes_auditoria")
    .select(
      "id, usuario_id, acao, modulo, entidade, entidade_id, valor_anterior, valor_novo, ip, user_agent, criado_em",
    )
    .order("criado_em", { ascending: false })
    .limit(120);

  const usuariosIds = Array.from(
    new Set((auditorias || []).map((item) => item.usuario_id).filter(Boolean)),
  );
  const { data: usuarios } = usuariosIds.length
    ? await supabase
        .from("usuarios_internos")
        .select("id, nome, email, perfil")
        .in("id", usuariosIds)
    : { data: [] as any[] };

  const usuariosMap = new Map((usuarios || []).map((item) => [item.id, item]));
  const lista = (auditorias || []) as Auditoria[];

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                Controle interno
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                Auditoria
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Histórico de alterações críticas do sistema.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-black text-blue-700">Registros</p>
                <p className="text-2xl font-black text-slate-950">
                  {lista.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black text-slate-500">Módulos</p>
                <p className="text-2xl font-black text-slate-950">
                  {new Set(lista.map((item) => item.modulo)).size}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-black text-emerald-700">Acesso</p>
                <p className="text-sm font-black text-slate-950">ADM</p>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            Não foi possível carregar a auditoria.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-black text-slate-950">Eventos recentes</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Últimos 120 registros.
            </p>
          </div>

          {lista.length === 0 ? (
            <div className="grid min-h-[360px] place-items-center p-8 text-center">
              <div>
                <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 font-black text-slate-950">
                  Nenhum evento encontrado
                </h3>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lista.map((evento) => {
                const usuario = evento.usuario_id
                  ? usuariosMap.get(evento.usuario_id)
                  : null;
                return (
                  <article key={evento.id} className="p-5">
                    <div className="grid gap-4 xl:grid-cols-[1fr_240px_260px] xl:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            <Activity className="h-3.5 w-3.5" />
                            {labelAcao(evento.acao)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {evento.modulo}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                              <UserRound className="h-3.5 w-3.5" />
                              Responsável
                            </p>
                            <p className="mt-1 font-black text-slate-800">
                              {usuario?.nome || "Sistema"}
                            </p>
                            {usuario?.email ? (
                              <p className="text-xs font-semibold text-slate-500">
                                {usuario.email}
                              </p>
                            ) : null}
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                              <Database className="h-3.5 w-3.5" />
                              Entidade
                            </p>
                            <p className="mt-1 font-black text-slate-800">
                              {evento.entidade || "—"}
                            </p>
                            {evento.entidade_id ? (
                              <p className="text-xs font-semibold text-slate-500">
                                {evento.entidade_id}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Data/hora
                        </p>
                        <p className="mt-1 font-black text-slate-800">
                          {formatarData(evento.criado_em)}
                        </p>
                        <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">
                          IP
                        </p>
                        <p className="mt-1 font-black text-slate-800">
                          {evento.ip || "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          <Monitor className="h-3.5 w-3.5" />
                          Dispositivo
                        </p>
                        <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                          {evento.user_agent || "Não identificado"}
                        </p>
                      </div>
                    </div>

                    <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                      <summary className="cursor-pointer text-sm font-black text-slate-700">
                        Ver dados técnicos
                      </summary>
                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        <div className="rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                          <p className="mb-2 font-black text-white">Antes</p>
                          <pre className="whitespace-pre-wrap break-words">
                            {resumirValor(evento.valor_anterior)}
                          </pre>
                        </div>
                        <div className="rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                          <p className="mb-2 font-black text-white">Depois</p>
                          <pre className="whitespace-pre-wrap break-words">
                            {resumirValor(evento.valor_novo)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h2 className="font-black text-amber-900">
                Retenção e segurança
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">
                Eventos críticos devem ser mantidos para rastreabilidade
                operacional e proteção de dados.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
