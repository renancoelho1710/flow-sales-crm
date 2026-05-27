import Link from "next/link";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
};

export function ModulePlaceholder({ title, description, primaryHref = "/dashboard", primaryLabel = "Voltar para dashboard" }: ModulePlaceholderProps) {
  return (
    <main className="px-6 py-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-700">Flow Sales CRM</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={primaryHref} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800">
            {primaryLabel}
          </Link>
          <Link href="/dashboard/relatorios" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            Ver relatórios
          </Link>
        </div>
      </section>
    </main>
  );
}
