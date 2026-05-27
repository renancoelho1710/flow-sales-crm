export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-blue-700 sm:text-sm">
            Flow Sales CRM
          </p>

          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Sistema iniciado com sucesso
          </h1>

          <p className="mb-8 text-sm leading-7 text-slate-700 sm:text-base">
            Estrutura inicial criada para o CRM de vendas com controle 3CX,
            leads, agendamentos, campanhas, simulador e relatórios.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Perfil</p>
              <strong className="mt-1 block text-lg text-slate-950">ADM</strong>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Perfil</p>
              <strong className="mt-1 block text-lg text-slate-950">Suporte</strong>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Perfil</p>
              <strong className="mt-1 block text-lg text-slate-950">Colaborador</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
