import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, Clock3, LockKeyhole, Users } from "lucide-react";

type PageProps = {
  searchParams?: Promise<{ aba?: string }>;
};

function badgeStatus(status: string) {
  if (status === "disponivel") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status?.includes("pausa")) return "bg-amber-50 text-amber-700 ring-amber-100";
  if (["offline", "bloqueado"].includes(status)) return "bg-red-50 text-red-700 ring-red-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;

  if (params?.aba === "status") {
    redirect("/dashboard/usuarios/status");
  }

  if (params?.aba === "perfis" || params?.aba === "perfil") {
    redirect("/dashboard/usuarios/permissoes");
  }

  const supabase = await createClient();

  const { data: usuarios } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo")
    .order("nome", { ascending: true });

  const lista = usuarios || [];
  const ativos = lista.filter((usuario) => usuario.ativo).length;
  const recebendo = lista.filter((usuario) => usuario.recebe_leads).length;
  const disponiveis = lista.filter((usuario) => usuario.status_operacional === "disponivel").length;

  return (
    <main className="flow-premium-page p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Flow Sales CRM</p>
          <div className="mt-2 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Usuários</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                Gestão dos colaboradores, permissões e status operacional. As regras por trás ficam em Configurações.
              </p>
            </div>
            <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 sm:grid-cols-3">
              <span>{ativos} ativos</span>
              <span>{disponiveis} disponíveis</span>
              <span>{recebendo} recebendo leads</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/usuarios" className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Users className="h-7 w-7 text-blue-700" />
            <h2 className="mt-4 font-black text-slate-950">Todos os usuários</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Lista geral dos colaboradores ativos e inativos do CRM.</p>
          </Link>
          <Link href="/dashboard/usuarios/permissoes" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <LockKeyhole className="h-7 w-7 text-blue-700" />
            <h2 className="mt-4 font-black text-slate-950">Perfis e permissões</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Controle de acessos por usuário e módulo.</p>
          </Link>
          <Link href="/dashboard/usuarios/status" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <Clock3 className="h-7 w-7 text-blue-700" />
            <h2 className="mt-4 font-black text-slate-950">Status da equipe</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Pausas, disponibilidade, almoço e feedback da equipe.</p>
          </Link>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-700" />
            <h2 className="font-black text-slate-950">Colaboradores cadastrados</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recebe leads</th>
                  <th className="px-4 py-3">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <strong className="block text-slate-950">{usuario.nome}</strong>
                      <span className="text-xs font-semibold text-slate-500">{usuario.email}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">{usuario.perfil}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${badgeStatus(usuario.status_operacional)}`}>
                        {usuario.status_operacional}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">{usuario.recebe_leads ? "Sim" : "Não"}</td>
                    <td className="px-4 py-3 font-bold">{usuario.ativo ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
