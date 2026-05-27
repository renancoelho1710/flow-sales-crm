import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Users,
} from "lucide-react";

const modulos = [
  {
    titulo: "CRM de leads",
    descricao: "Organize leads, responsáveis, status, histórico e oportunidades em um fluxo comercial único.",
    icon: Users,
  },
  {
    titulo: "Monitor WhatsApp",
    descricao: "Audite respostas, conversas fora da base, clientes sem retorno e WhatsApp sem ligação 3CX.",
    icon: MessageCircle,
  },
  {
    titulo: "Controle 3CX",
    descricao: "Acompanhe contatos telefônicos, ligações, status de atendimento e cruzamento com leads.",
    icon: PhoneCall,
  },
  {
    titulo: "Agenda e Kanban",
    descricao: "Controle visitas, agendamentos, funil de recuperação e tarefas comerciais por responsável.",
    icon: CalendarDays,
  },
  {
    titulo: "Relatórios",
    descricao: "Visualize indicadores por loja, equipe, conversão, atendimento e oportunidades pendentes.",
    icon: BarChart3,
  },
  {
    titulo: "Gestão segura",
    descricao: "Permissões por perfil, controle de usuários e módulos preparados para operação real.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.32),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" />

        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Flow Sales CRM"
              className="h-10 w-10 object-contain"
            />

            <div>
              <p className="text-base font-black tracking-tight text-white">
                Flow Sales CRM
              </p>
              <p className="text-xs font-semibold text-blue-200">
                Recuperação comercial inteligente
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-slate-950 shadow-lg shadow-blue-950/20 transition hover:bg-blue-50"
          >
            Entrar
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-7xl items-center gap-10 px-5 pb-10 pt-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
              Sistema interno
            </div>

            <h1 className="max-w-4xl text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
              Gestão comercial completa para recuperar leads, medir contatos e vender mais.
            </h1>

            <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-300 sm:text-lg">
              O Flow Sales CRM conecta CRM, C2S, 3CX, WhatsApp, agenda, kanban e relatórios em uma operação única para acompanhar o trabalho real da equipe comercial.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-2xl shadow-blue-600/25 transition hover:bg-blue-500"
              >
                Entrar no sistema
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#modulos"
                className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/15 bg-white/8 px-6 py-4 text-sm font-black text-white transition hover:bg-white/12"
              >
                Conhecer módulos
              </a>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["Leads", "WhatsApp", "3CX"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                >
                  <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" />
                  <p className="text-sm font-black text-white">{item}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Integrado ao fluxo
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="rounded-[1.55rem] border border-slate-200/10 bg-slate-950/70 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                    Painel operacional
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                    Visão da operação
                  </h2>
                </div>

                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                  Online
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-bold text-slate-400">
                    Conversas monitoradas
                  </p>
                  <strong className="mt-2 block text-3xl font-black text-white">
                    48
                  </strong>
                  <p className="mt-1 text-xs font-bold text-emerald-300">
                    WhatsApp sincronizado
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-bold text-slate-400">
                    WhatsApp sem 3CX
                  </p>
                  <strong className="mt-2 block text-3xl font-black text-white">
                    47
                  </strong>
                  <p className="mt-1 text-xs font-bold text-orange-300">
                    Requer atenção
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-bold text-slate-400">
                    Leads fora da base
                  </p>
                  <strong className="mt-2 block text-3xl font-black text-white">
                    48
                  </strong>
                  <p className="mt-1 text-xs font-bold text-blue-300">
                    Auditoria ativa
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-bold text-slate-400">
                    Clientes responderam
                  </p>
                  <strong className="mt-2 block text-3xl font-black text-white">
                    47
                  </strong>
                  <p className="mt-1 text-xs font-bold text-emerald-300">
                    Precisa tratar
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
                <p className="text-sm font-black text-white">
                  Monitor WhatsApp + 3CX
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Cruzamento preparado para identificar contatos sem ligação, conversas fora da base e respostas não atualizadas no C2S.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section
        id="modulos"
        className="relative z-10 border-t border-white/10 bg-slate-950 px-5 py-16 sm:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
              Módulos principais
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Tudo preparado para uma operação comercial real.
            </h2>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => {
              const Icon = modulo.icon;

              return (
                <div
                  key={modulo.titulo}
                  className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 transition hover:border-blue-400/40 hover:bg-white/[0.075]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-black text-white">
                    {modulo.titulo}
                  </h3>

                  <p className="mt-3 text-sm font-medium leading-7 text-slate-400">
                    {modulo.descricao}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}