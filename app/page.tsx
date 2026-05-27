import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  Crown,
  Headphones,
  LineChart,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Target,
  Users,
  Zap,
} from "lucide-react";

const faixaModulos = [
  { titulo: "Distribuição", subtitulo: "inteligente de leads", icon: Users },
  { titulo: "Agenda", subtitulo: "comercial", icon: CalendarDays },
  { titulo: "Monitor", subtitulo: "WhatsApp + 3CX", icon: MessageCircle },
  { titulo: "Conferência", subtitulo: "de veículos", icon: CarFront },
  { titulo: "Relatórios", subtitulo: "estratégicos", icon: BarChart3 },
  { titulo: "Permissões", subtitulo: "por perfil", icon: ShieldCheck },
];

const modulos = [
  {
    titulo: "CRM de leads",
    descricao: "Centralize leads, histórico, responsável, status, origem e próximos passos em uma operação única.",
    icon: Users,
  },
  {
    titulo: "Kanban comercial",
    descricao: "Acompanhe cada negociação por etapa, visualize pendências e avance oportunidades com controle.",
    icon: LineChart,
  },
  {
    titulo: "Agenda e visitas",
    descricao: "Organize agendamentos, test-drives, visitas na loja, retornos e follow-ups importantes.",
    icon: CalendarDays,
  },
  {
    titulo: "Monitor WhatsApp",
    descricao: "Identifique respostas, conversas fora da base, WhatsApp sem 3CX e clientes sem retorno.",
    icon: MessageCircle,
  },
  {
    titulo: "Controle 3CX",
    descricao: "Cruze ligações com leads para entender se o contato foi feito antes do WhatsApp.",
    icon: PhoneCall,
  },
  {
    titulo: "Conferência de veículos",
    descricao: "Acompanhe divergências, validações e informações importantes da operação de estoque.",
    icon: CarFront,
  },
  {
    titulo: "Relatórios por unidade",
    descricao: "Compare lojas, responsáveis, conversões, agendamentos e pendências em tempo real.",
    icon: BarChart3,
  },
  {
    titulo: "Gestão de usuários",
    descricao: "Controle perfis, permissões, status operacional, recebimento de leads e acessos internos.",
    icon: ShieldCheck,
  },
];

const perfis = [
  {
    titulo: "Administrador",
    descricao: "Visão completa da operação, permissões, relatórios, usuários, unidades e indicadores estratégicos.",
    icon: Crown,
  },
  {
    titulo: "Suporte",
    descricao: "Apoio ao time com validações, conferências, auditorias e resolução de pendências operacionais.",
    icon: Headphones,
  },
  {
    titulo: "Colaborador",
    descricao: "Tela prática para atender leads, acompanhar agenda, registrar evolução e evitar esquecimentos.",
    icon: Users,
  },
];

const resultados = [
  {
    titulo: "Mais organização",
    descricao: "Leads, agenda, WhatsApp e 3CX no mesmo fluxo de acompanhamento.",
    icon: Target,
    tom: "emerald",
  },
  {
    titulo: "Resposta mais rápida",
    descricao: "Alertas e filtros ajudam o time a agir no momento certo.",
    icon: Zap,
    tom: "blue",
  },
  {
    titulo: "Mais controle por loja",
    descricao: "Indicadores por unidade, responsável e etapa da recuperação.",
    icon: BarChart3,
    tom: "violet",
  },
  {
    titulo: "Menos leads esquecidos",
    descricao: "Auditoria mostra contatos sem retorno e C2S não atualizado.",
    icon: MessageCircle,
    tom: "orange",
  },
];

const perguntas = [
  {
    pergunta: "O Flow Sales CRM substitui o C2S?",
    resposta: "Não. O Flow Sales CRM atua como camada operacional para organizar recuperação de leads, agenda, acompanhamento, auditoria de WhatsApp, 3CX e relatórios.",
  },
  {
    pergunta: "Como o Monitor WhatsApp ajuda a operação?",
    resposta: "Ele mostra se o cliente está na base, se teve ligação 3CX, se respondeu no WhatsApp, se existe conversa fora da base e se o atendimento não foi atualizado corretamente.",
  },
  {
    pergunta: "O sistema controla permissões por perfil?",
    resposta: "Sim. A estrutura foi pensada para administrador, suporte, supervisor/gerente e colaborador, com acesso diferente conforme a função.",
  },
  {
    pergunta: "Consigo acompanhar resultados por loja?",
    resposta: "Sim. Os relatórios e indicadores foram pensados para visão por unidade, equipe, responsável e situação dos leads.",
  },
];

function IconBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 ${className}`}>
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] w-full max-w-[1640px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-slogan.png" alt="Flow Sales CRM" className="h-11 w-auto object-contain" />
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-extrabold text-slate-700 lg:flex">
            <a href="#produto" className="flex items-center gap-1 transition hover:text-blue-700">Produto <ChevronDown className="h-3.5 w-3.5" /></a>
            <a href="#solucoes" className="flex items-center gap-1 transition hover:text-blue-700">Soluções <ChevronDown className="h-3.5 w-3.5" /></a>
            <a href="#recursos" className="flex items-center gap-1 transition hover:text-blue-700">Recursos <ChevronDown className="h-3.5 w-3.5" /></a>
            <a href="#perguntas" className="transition hover:text-blue-700">Perguntas</a>
            <a href="#contato" className="transition hover:text-blue-700">Contato</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-black text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 md:inline-flex">
              Entrar
            </Link>

            <Link href="/inscreva-se" className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-6 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 md:px-8">
              Solicitar demonstração
            </Link>
          </div>
        </div>
      </header>

      <section id="produto" className="relative border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_72%)]">
        <div className="absolute left-0 top-28 h-96 w-96 rounded-full border border-blue-100/80 opacity-80" />
        <div className="absolute left-[-180px] top-24 h-[520px] w-[520px] rounded-full border border-blue-100/70 opacity-60" />

        <div className="relative mx-auto grid min-h-[650px] w-full max-w-[1640px] items-center gap-12 px-6 py-14 lg:grid-cols-[0.88fr_1.12fr] lg:px-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-black leading-[1.04] tracking-[-0.065em] text-slate-950 md:text-6xl xl:text-[72px]">
              Recupere leads.
              <br />
              Organize sua operação.
              <br />
              <span className="text-blue-700">Venda com mais inteligência.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
              O Flow Sales CRM centraliza leads, agenda, 3CX, WhatsApp, conferência, equipe e relatórios em um só lugar. Mais controle, mais produtividade e mais clareza para vender melhor.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/login" className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-blue-700 px-8 text-base font-black text-white shadow-xl shadow-blue-700/25 transition hover:bg-blue-800">
                Entrar no sistema
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[520px] lg:block">
            <div className="absolute right-0 top-0 w-[860px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-blue-950/14">
              <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="h-2 w-28 rounded-full bg-slate-100" />
                  <span className="h-2 w-9 rounded-full bg-slate-100" />
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.55rem] border border-slate-100 bg-slate-50">
                <img src="/home-dashboard.png" alt="Dashboard operacional do Flow Sales CRM" className="h-auto w-full object-cover" />
              </div>
            </div>

            <div className="absolute left-0 top-[285px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <LineChart className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-500">Operação acompanhada</p>
                  <p className="text-2xl font-black text-slate-950">em tempo real</p>
                  <p className="text-xs font-black text-emerald-500">leads, agenda, 3CX e WhatsApp</p>
                </div>
              </div>
            </div>

            <div className="absolute right-[-22px] top-[82px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Users className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-black text-slate-700">Equipe ativa</p>
              <p className="text-4xl font-black text-slate-950">28</p>
              <p className="text-xs font-bold text-slate-400">Usuários</p>
            </div>

            <div className="absolute bottom-8 right-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/10">
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
                <div key={item.titulo} className={`flex items-center gap-4 px-7 py-6 ${index > 0 ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`}>
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

      <section id="solucoes" className="bg-white px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-[1420px]">
          <h2 className="text-center text-3xl font-black tracking-[-0.04em] text-slate-950">Tudo que sua operação precisa</h2>
          <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-blue-700" />

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modulos.map((modulo) => {
              const Icon = modulo.icon;
              return (
                <div key={modulo.titulo} className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/8">
                  <IconBox>
                    <Icon className="h-7 w-7" />
                  </IconBox>
                  <div>
                    <h3 className="text-base font-black text-slate-950">{modulo.titulo}</h3>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{modulo.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="recursos" className="bg-white px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-[1420px]">
          <h2 className="text-center text-3xl font-black tracking-[-0.04em] text-slate-950">Feito para equipes comerciais que precisam de controle real</h2>
          <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-blue-700" />

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {perfis.map((perfil) => {
              const Icon = perfil.icon;
              return (
                <div key={perfil.titulo} className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{perfil.titulo}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{perfil.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="resultados" className="bg-white px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-[1420px]">
          <h2 className="text-center text-3xl font-black tracking-[-0.04em] text-slate-950">Resultados que você sente na prática</h2>
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
                <div key={resultado.titulo} className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ${tom}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">{resultado.titulo}</h3>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{resultado.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="perguntas" className="bg-slate-50 px-6 py-14 lg:px-10">
        <div className="mx-auto grid max-w-[1420px] gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">Perguntas frequentes</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">Dúvidas comuns antes de usar o Flow.</h2>
            <p className="mt-4 text-base font-semibold leading-7 text-slate-600">Respostas diretas sobre como o sistema ajuda a controlar leads, atendimento, WhatsApp, 3CX e a rotina comercial.</p>

            <Link href="/perguntas-frequentes" className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800">
              Ver todas as perguntas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4">
            {perguntas.map((item) => (
              <details key={item.pergunta} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-slate-950">
                  {item.pergunta}
                  <ChevronDown className="h-5 w-5 shrink-0 text-blue-700 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{item.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-[1420px] overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 p-8 shadow-xl shadow-blue-700/20">
          <div className="flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white">Pronto para transformar sua operação comercial?</h2>
              <p className="mt-2 text-base font-semibold text-blue-50">Acesse o sistema para acompanhar sua operação com mais controle.</p>
            </div>

            <Link href="/login" className="inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-white px-8 py-4 text-sm font-black text-blue-700 shadow-lg transition hover:bg-blue-50">
              Entrar no sistema
              <ArrowRight className="h-5 w-5" />
            </Link>
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
            <a href="#perguntas" className="hover:text-blue-700">Perguntas</a>
            <Link href="/login" className="hover:text-blue-700">Entrar</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
