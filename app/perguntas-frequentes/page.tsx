import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  ChevronDown,
  LockKeyhole,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Users,
} from "lucide-react";

const perguntas = [
  {
    categoria: "Operação",
    icon: Users,
    itens: [
      { pergunta: "O que é o Flow Sales CRM?", resposta: "É um sistema operacional para acompanhar recuperação de leads, agenda, kanban, responsáveis, histórico de contato, validações e relatórios da equipe comercial." },
      { pergunta: "Ele serve para substituir o C2S?", resposta: "Não. O Flow Sales CRM complementa o C2S. Ele ajuda a equipe a trabalhar os leads com mais controle e permite cruzar informações do C2S com 3CX, WhatsApp e acompanhamento interno." },
      { pergunta: "Quem usa o sistema no dia a dia?", resposta: "Administrador, suporte, supervisor/gerente e colaboradores. Cada perfil pode ter permissões diferentes conforme a função dentro da operação." },
    ],
  },
  {
    categoria: "WhatsApp e 3CX",
    icon: MessageCircle,
    itens: [
      { pergunta: "Para que serve o Monitor WhatsApp?", resposta: "Ele mostra conversas sincronizadas, clientes que responderam, WhatsApp sem ligação 3CX, contatos fora da base e possíveis atendimentos que não foram atualizados no C2S." },
      { pergunta: "O sistema sabe se teve ligação pelo 3CX?", resposta: "A estrutura foi preparada para cruzar telefone do lead, registros do 3CX e conversas do WhatsApp. Assim fica mais fácil identificar se o atendimento seguiu o fluxo correto." },
      { pergunta: "O conector WhatsApp precisa ficar aberto?", resposta: "Sim. O conector precisa estar rodando na máquina do atendente para manter heartbeat e sincronização. Se o usuário fechar a janela, o ideal é o app continuar na bandeja do Windows." },
    ],
  },
  {
    categoria: "Agenda, kanban e leads",
    icon: CalendarDays,
    itens: [
      { pergunta: "O sistema ajuda a evitar lead esquecido?", resposta: "Sim. A ideia é centralizar responsáveis, status, follow-ups, agenda e alertas para deixar claro o que precisa ser tratado." },
      { pergunta: "O kanban substitui a planilha?", resposta: "Ele organiza o fluxo visualmente e reduz dependência de controle manual. A planilha pode continuar sendo usada para importações ou conferências quando necessário." },
      { pergunta: "Consigo acompanhar visitas e agendamentos?", resposta: "Sim. O módulo de agenda foi pensado para acompanhar compromissos, visitas, retornos e atividades comerciais por responsável." },
    ],
  },
  {
    categoria: "Segurança e permissões",
    icon: ShieldCheck,
    itens: [
      { pergunta: "Cada colaborador vê somente o que deve ver?", resposta: "A estrutura de permissões permite separar acessos por perfil, evitando que colaboradores tenham visão de áreas administrativas quando isso não for permitido." },
      { pergunta: "Dá para controlar quem recebe leads?", resposta: "Sim. A gestão de usuários pode indicar se o colaborador está ativo, se recebe leads, qual unidade padrão e seu status operacional." },
      { pergunta: "Dá para bloquear acesso fora da empresa?", resposta: "A estrutura do conector e localização foi pensada para permitir regras de acesso por local liberado, com bloqueio ou alerta conforme configuração da gestão." },
    ],
  },
  {
    categoria: "Conferência de veículos",
    icon: CarFront,
    itens: [
      { pergunta: "O Flow também ajuda na conferência de veículos?", resposta: "Sim. Existe estrutura para acompanhar divergências, validações e informações importantes da conferência de veículos, com visão operacional e relatórios." },
      { pergunta: "Isso conversa com o CRM de leads?", resposta: "A proposta é manter os módulos dentro do mesmo ambiente, permitindo que a gestão acompanhe operação comercial, veículos, atendimento e relatórios sem trocar de sistema." },
    ],
  },
  {
    categoria: "Relatórios",
    icon: PhoneCall,
    itens: [
      { pergunta: "Que tipo de relatório o sistema pode mostrar?", resposta: "Relatórios por unidade, responsável, ligações, WhatsApp, status dos leads, conversão, pendências, validações e oportunidades que precisam de atenção." },
      { pergunta: "Supervisor e gerente conseguem ter uma visão maior?", resposta: "Sim. A visão de gestão foi pensada para ser mais completa, com filtros por operador, unidade, período e status da operação." },
    ],
  },
];

export default function PerguntasFrequentesPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_45%,#f8fafc_100%)] text-slate-950">
      <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] w-full max-w-[1420px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-slogan.png" alt="Flow Sales CRM" className="h-11 w-auto object-contain" />
          </Link>
          <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-6 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800">Entrar</Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1420px] px-6 py-12 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"><ArrowLeft className="h-4 w-4" />Voltar para a home</Link>
        <div className="mt-8 max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-700">Perguntas frequentes</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-[-0.06em] text-slate-950 md:text-6xl">Respostas claras sobre o Flow Sales CRM.</h1>
          <p className="mt-5 text-lg font-semibold leading-8 text-slate-600">Tire dúvidas sobre operação comercial, leads, WhatsApp, 3CX, permissões, agenda, conferência de veículos e relatórios.</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {perguntas.map((grupo) => {
            const Icon = grupo.icon;
            return (
              <section key={grupo.categoria} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><Icon className="h-6 w-6" /></div>
                  <h2 className="text-xl font-black tracking-tight text-slate-950">{grupo.categoria}</h2>
                </div>
                <div className="grid gap-3">
                  {grupo.itens.map((item) => <details key={item.pergunta} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-slate-950">{item.pergunta}<ChevronDown className="h-5 w-5 shrink-0 text-blue-700 transition group-open:rotate-180" /></summary><p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{item.resposta}</p></details>)}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-10 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 p-8 text-white shadow-xl shadow-blue-700/20">
          <div className="flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
            <div><h2 className="text-3xl font-black tracking-tight">Precisa acessar o sistema?</h2><p className="mt-2 text-base font-semibold text-blue-50">Entre com seu usuário autorizado para acompanhar a operação.</p></div>
            <Link href="/login" className="inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-white px-8 py-4 text-sm font-black text-blue-700 shadow-lg transition hover:bg-blue-50">Entrar no sistema <LockKeyhole className="h-5 w-5" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
