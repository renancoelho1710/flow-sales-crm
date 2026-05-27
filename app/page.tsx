import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Crown,
  Headphones,
  LineChart,
  LockKeyhole,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Target,
  Users,
  Zap,
} from "lucide-react";

const faixaModulos = [
  {
    titulo: "Distribuição",
    subtitulo: "inteligente de leads",
    icon: Users,
  },
  {
    titulo: "Agenda",
    subtitulo: "comercial",
    icon: CalendarDays,
  },
  {
    titulo: "Conferência",
    subtitulo: "de veículos",
    icon: CarFront,
  },
  {
    titulo: "Relatórios",
    subtitulo: "estratégicos",
    icon: BarChart3,
  },
  {
    titulo: "Gestão",
    subtitulo: "de usuários",
    icon: Users,
  },
  {
    titulo: "Permissões",
    subtitulo: "por perfil",
    icon: ShieldCheck,
  },
];

const modulos = [
  {
    titulo: "Leads",
    descricao: "Capture, distribua e gerencie leads de todas as origens em um só lugar.",
    icon: Users,
  },
  {
    titulo: "Kanban",
    descricao: "Acompanhe cada negociação de forma visual e organizada.",
    icon: LineChart,
  },
  {
    titulo: "Agenda",
    descricao: "Agendamentos, compromissos e follow-ups sem perder nada.",
    icon: CalendarDays,
  },
  {
    titulo: "Conferência",
    descricao: "Conferência de veículos completa com histórico e apontamentos.",
    icon: CarFront,
  },
  {
    titulo: "Equipe",
    descricao: "Gestão de usuários, metas e performance do time comercial.",
    icon: Users,
  },
  {
    titulo: "Relatórios",
    descricao: "Relatórios estratégicos para decisões mais rápidas e precisas.",
    icon: BarChart3,
  },
  {
    titulo: "Controle por unidade",
    descricao: "Acompanhe resultados por loja, unidade e responsável.",
    icon: Target,
  },
  {
    titulo: "Validação de vendas",
    descricao: "Processos de validação para garantir segurança nas negociações.",
    icon: ShieldCheck,
  },
];

const perfis = [
  {
    titulo: "Administrador",
    descricao:
      "Visão completa do negócio, controle de unidades, permissões, relatórios e performance para decisões estratégicas.",
    icon: Crown,
  },
  {
    titulo: "Suporte",
    descricao:
      "Apoio ao time comercial com ferramentas para conferência, validações e resolução de pendências com agilidade.",
    icon: Headphones,
  },
  {
    titulo: "Colaborador",
    descricao:
      "Tudo que o atendente precisa para atender, acompanhar negociações e fechar mais vendas todos os dias.",
    icon: Users,
  },
];

const resultados = [
  {
    titulo: "Mais organização",
    descricao: "Centralize informações e ganhe visibilidade total da operação.",
    icon: Target,
    tom: "emerald",
  },
  {
    titulo: "Resposta mais rápida",
    descricao: "Acompanhe e responda leads no tempo certo.",
    icon: Zap,
    tom: "blue",
  },
  {
    titulo: "Acompanhamento por unidade",
    descricao: "Compare resultados e impulsione o desempenho de cada loja.",
    icon: BarChart3,
    tom: "violet",
  },
  {
    titulo: "Menos leads esquecidos",
    descricao: "Distribuição inteligente e follow-up garantem mais conversões.",
    icon: MessageCircle,
    tom: "orange",
  },
];

function IconBox({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 ${className}`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] w-full max-w-[1640px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-slogan.png" alt="Flow Sales CRM" className="h-11 w-auto object-contain" />
          </Link>

          <nav className="hidden items-center gap-10 text-sm font-bold text-slate-700 lg:flex">
            <a href="#produto" className="transition hover:text-blue-700">
              Produto
            </a>
            <a href="#solucoes" className="transition hover:text-blue-700">
              Soluções
            </a>
            <a href="#recursos" className="transition hover:text-blue-700">
              Recursos
            </a>
            <a href="#planos" className="transition hover:text-blue-700">
              Planos
            </a>
            <a href="#contato" className="transition hover:text-blue-700">
              Contato
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-black text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 md:inline-flex"
            >
              Entrar
            </Link>

            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-6 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 md:px-8"
            >
              Solicitar demonstração
            </Link>
          </div>
        </div>
      </header>

      <section
        id="produto"
        className="relative border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_72%)]"
      >
        <div className="absolute left-0 top-28 h-96 w-96 rounded-full border border-blue-100/80 opacity-80" />
        <div className="absolute left-[-180px] top-24 h-[520px] w-[520px] rounded-full border border-blue-100/70 opacity-60" />

        <div className="relative mx-auto grid min-h-[650px] w-full max-w-[1640px] items-center gap-12 px-6 py-14 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-black leading-[1.04] tracking-[-0.07em] text-slate-950 md:text-6xl xl:text-[72px]">
              Recupere leads.
              <br />
              Organize sua operação.
              <br />
              <span className="text-blue-700">Venda com mais inteligência.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
              O Flow Sales CRM centraliza leads, agenda, conferência de veículos,
              equipe, relatórios e acompanhamento comercial em um só lugar.
              Mais controle, mais produtividade e melhores resultados para o seu negócio.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-blue-700 px-8 text-base font-black text-white shadow-xl shadow-blue-700/25 transition hover:bg-blue-800"
              >
                <CalendarDays className="h-5 w-5" />
                Agendar demonstração
              </Link>

              <Link
                href="/login"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-blue-200 bg-white px-8 text-base font-black text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                <MessageCircle className="h-5 w-5" />
                Falar com especialista
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[500px] lg:block">
            <div className="absolute right-14 top-4 w-[760px] rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-blue-950/12">
              <div className="mb-3 flex items-center justify-between px-2">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <span className="h-2 w-20 rounded-full bg-slate-100" />
                  <span className="h-2 w-8 rounded-full bg-slate-100" />
                </div>
              </div>

              <div className="rounded-[1.45rem] border border-slate-100 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Flow" className="h-8 w-8 object-contain" />
                    <span className="text-sm font-black text-blue-700">Flow Sales CRM</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                    <span className="h-8 w-8 rounded-full bg-slate-900" />
                    <div>
                      <p className="text-xs font-black text-slate-900">Vinícius Silva</p>
                      <p className="text-[10px] font-bold text-slate-400">Administrador</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[150px_1fr] gap-4">
                  <aside className="rounded-2xl bg-white p-3 shadow-sm">
                    {["Painel", "Leads", "Kanban", "Agenda", "Conferência", "Equipes", "Relatórios"].map(
                      (item, index) => (
                        <div
                          key={item}
                          className={`mb-2 rounded-xl px-3 py-2 text-xs font-black ${
                            index === 0 ? "bg-blue-50 text-blue-700" : "text-slate-500"
                          }`}
                        >
                          {item}
                        </div>
                      )
                    )}
                  </aside>

                  <section className="space-y-4">
                    <div>
                      <p className="text-lg font-black text-slate-950">Painel de controle</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        ["Leads recebidos", "1.248", "+10%"],
                        ["Leads ativos", "843", "+12%"],
                        ["Vendas realizadas", "156", "+26%"],
                        ["Taxa de conversão", "12,5%", "+4,3%"],
                      ].map(([label, value, trend]) => (
                        <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-[11px] font-bold text-slate-400">{label}</p>
                          <strong className="mt-1 block text-2xl font-black text-slate-950">{value}</strong>
                          <p className="mt-1 text-[11px] font-black text-emerald-500">{trend} vs mês anterior</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
                      <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-xs font-black text-slate-800">Leads por origem</p>
                        <div className="mt-5 flex items-center gap-5">
                          <div className="h-28 w-28 rounded-full border-[18px] border-blue-700 border-r-blue-100 border-t-blue-400" />
                          <div className="space-y-2 text-[11px] font-bold text-slate-500">
                            <p>Site 40%</p>
                            <p>WhatsApp 30%</p>
                            <p>Indicação 17%</p>
                            <p>Outros 13%</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-xs font-black text-slate-800">Leads ao longo do tempo</p>
                        <div className="mt-5 h-32 rounded-xl bg-[linear-gradient(180deg,#f8fbff,#fff)]">
                          <svg viewBox="0 0 360 130" className="h-full w-full">
                            <path
                              d="M10 92 C55 72, 70 48, 110 70 S165 104, 205 64 S285 40, 350 26"
                              fill="none"
                              stroke="#2563eb"
                              strokeWidth="8"
                              strokeLinecap="round"
                            />
                            <path
                              d="M10 104 C60 95, 95 85, 130 90 S205 100, 248 78 S305 66, 350 58"
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="5"
                              strokeLinecap="round"
                              opacity="0.55"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="absolute left-2 top-[270px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <LineChart className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-500">Faturamento este mês</p>
                  <p className="text-2xl font-black text-slate-950">R$ 1,2M</p>
                  <p className="text-xs font-black text-emerald-500">+24% vs mês anterior</p>
                </div>
              </div>
            </div>

            <div className="absolute right-0 top-[112px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Users className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-700">Equipe ativa</p>
              <p className="text-4xl font-black text-slate-950">28</p>
              <p className="text-xs font-bold text-slate-400">Usuários</p>
            </div>

            <div className="absolute bottom-16 right-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-700">Negociações em andamento</p>
              <p className="text-4xl font-black text-slate-950">212</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto -mt-2 w-full max-w-[1540px] px-6 pb-8 lg:px-10">
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-blue-950/8 sm:grid-cols-2 lg:grid-cols-6">
            {faixaModulos.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.titulo}
                  className={`flex items-center gap-4 px-7 py-6 ${
                    index > 0 ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""
                  }`}
                >
                  <Icon className="h-8 w-8 text-blue-700" />
                  <div>
                    <p className="text-sm font-black text-slate-800">{item.titulo}</p>
                    <p className="text-sm font-bold text-slate-500">{item.subtitulo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="solucoes" className="bg-white px-6 py-6 lg:px-10">
        <div className="mx-auto max-w-[1420px]">
          <h2 className="text-center text-3xl font-black tracking-[-0.04em] text-slate-950">
            Tudo que sua operação precisa
          </h2>
          <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-blue-700" />

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modulos.map((modulo) => {
              const Icon = modulo.icon;

              return (
                <div
                  key={modulo.titulo}
                  className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/8"
                >
                  <IconBox>
                    <Icon className="h-7 w-7" />
                  </IconBox>
                  <div>
                    <h3 className="text-base font-black text-slate-950">{modulo.titulo}</h3>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                      {modulo.descricao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="recursos" className="bg-white px-6 py-4 lg:px-10">
        <div className="mx-auto max-w-[1420px]">
          <h2 className="text-center text-3xl font-black tracking-[-0.04em] text-slate-950">
            Feito para equipes comerciais que precisam de controle real
          </h2>
          <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-blue-700" />

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {perfis.map((perfil) => {
              const Icon = perfil.icon;

              return (
                <div
                  key={perfil.titulo}
                  className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{perfil.titulo}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                      {perfil.descricao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="planos" className="bg-white px-6 py-6 lg:px-10">
        <div className="mx-auto max-w-[1420px]">
          <h2 className="text-center text-3xl font-black tracking-[-0.04em] text-slate-950">
            Resultados que você sente na prática
          </h2>
          <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-blue-700" />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {resultados.map((resultado) => {
              const Icon = resultado.icon;
              const tom =
                resultado.tom === "emerald"
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                  : resultado.tom === "violet"
                    ? "bg-violet-50 text-violet-700 ring-violet-100"
                    : resultado.tom === "orange"
                      ? "bg-orange-50 text-orange-500 ring-orange-100"
                      : "bg-blue-50 text-blue-700 ring-blue-100";

              return (
                <div
                  key={resultado.titulo}
                  className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${tom}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">{resultado.titulo}</h3>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                      {resultado.descricao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-9 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 p-8 shadow-xl shadow-blue-700/20">
            <div className="flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white">
                  Pronto para transformar sua operação comercial?
                </h2>
                <p className="mt-2 text-base font-semibold text-blue-50">
                  Agende uma demonstração personalizada e veja o Flow Sales CRM na prática.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-white px-8 py-4 text-sm font-black text-blue-700 shadow-lg transition hover:bg-blue-50"
              >
                <CalendarDays className="h-5 w-5" />
                Agendar demonstração
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer id="contato" className="border-t border-slate-200 bg-white px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-[1420px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <img src="/logo-slogan.png" alt="Flow Sales CRM" className="h-11 w-auto object-contain" />

          <div className="grid gap-4 text-sm font-bold text-slate-500 sm:grid-cols-5 lg:gap-12">
            <a href="#produto" className="hover:text-blue-700">Produto</a>
            <a href="#solucoes" className="hover:text-blue-700">Soluções</a>
            <a href="#recursos" className="hover:text-blue-700">Recursos</a>
            <a href="#contato" className="hover:text-blue-700">Contato</a>
            <Link href="/login" className="hover:text-blue-700">Entrar</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}