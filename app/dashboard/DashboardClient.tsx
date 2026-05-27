"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AlarmClock,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Download,
  ExternalLink,
  Filter,
  Home,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  PhoneCall,
  Search,
  Settings,
  ShieldCheck,
  Store,
  TrendingDown,
  TrendingUp,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type Usuario = {
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
};

type DashboardClientProps = {
  usuario: Usuario;
};

type SubItem = {
  label: string;
  tab: string;
};

type MenuItem = {
  label: string;
  icon: React.ElementType;
  tab: string;
  subitems: SubItem[];
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    tab: "dashboard-geral",
    subitems: [
      { label: "Visão geral", tab: "dashboard-geral" },
      { label: "Operacional", tab: "dashboard-operacional" },
      { label: "Estratégico", tab: "dashboard-estrategico" },
    ],
  },
  {
    label: "CRM de leads",
    icon: Users,
    tab: "leads-ativos",
    subitems: [
      { label: "Leads ativos", tab: "leads-ativos" },
      { label: "Novo lead", tab: "novo-lead" },
      { label: "Importar base", tab: "importar-base" },
      { label: "Arquivados", tab: "leads-arquivados" },
    ],
  },
  {
    label: "Kanban",
    icon: WalletCards,
    tab: "kanban-funil",
    subitems: [
      { label: "Funil completo", tab: "kanban-funil" },
      { label: "Minhas oportunidades", tab: "kanban-minhas" },
      { label: "Vendas pendentes", tab: "kanban-vendas-pendentes" },
    ],
  },
  {
    label: "Agenda",
    icon: CalendarDays,
    tab: "agenda-hoje",
    subitems: [
      { label: "Hoje", tab: "agenda-hoje" },
      { label: "Semana", tab: "agenda-semana" },
      { label: "Mês", tab: "agenda-mes" },
    ],
  },
  {
    label: "Controle 3CX",
    icon: PhoneCall,
    tab: "controle-3cx",
    subitems: [
      { label: "Monitor", tab: "controle-3cx" },
      { label: "Ligações", tab: "ligacoes-3cx" },
      { label: "Classificações", tab: "classificacoes-3cx" },
      { label: "Monitor WhatsApp", tab: "whatsapp-3cx" },
    ],
  },
  {
    label: "Campanhas",
    icon: Store,
    tab: "campanhas-ativas",
    subitems: [
      { label: "Campanhas ativas", tab: "campanhas-ativas" },
      { label: "Criar campanha", tab: "criar-campanha" },
      { label: "Mensagens", tab: "mensagens-campanha" },
    ],
  },
  {
    label: "Simulador",
    icon: BarChart3,
    tab: "simulador",
    subitems: [
      { label: "Nova simulação", tab: "simulador" },
      { label: "Simulações salvas", tab: "simulacoes-salvas" },
    ],
  },
  {
    label: "Conferência",
    icon: ShieldCheck,
    tab: "conferencia-veiculos",
    subitems: [
      { label: "Veículos", tab: "conferencia-veiculos" },
      { label: "Divergências", tab: "conferencia-divergencias" },
      { label: "Aceitos", tab: "conferencia-aceitos" },
    ],
  },
  {
    label: "Relatórios",
    icon: LineChart,
    tab: "relatorios",
    subitems: [
      { label: "Geral", tab: "relatorios" },
      { label: "Equipe", tab: "relatorios-equipe" },
      { label: "Unidades", tab: "relatorios-unidades" },
    ],
  },
  {
    label: "Usuários",
    icon: UserCog,
    tab: "usuarios",
    subitems: [
      { label: "Todos os usuários", tab: "usuarios" },
      { label: "Perfis e acessos", tab: "usuarios-perfis" },
      { label: "Status da equipe", tab: "usuarios-status" },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    tab: "configuracoes",
    subitems: [
      { label: "Sistema", tab: "configuracoes" },
      { label: "Tema", tab: "configuracoes-tema" },
      { label: "Integrações", tab: "configuracoes-integracoes" },
    ],
  },
];

const metrics = [
  {
    title: "Leads ativos",
    value: "1.248",
    detail: "12,5% vs. semana anterior",
    icon: Users,
    tone: "blue",
    tab: "leads-ativos",
    positive: true,
  },
  {
    title: "Agendamentos hoje",
    value: "28",
    detail: "8,3% vs. ontem",
    icon: CalendarDays,
    tone: "blue",
    tab: "agenda-hoje",
    positive: true,
  },
  {
    title: "Visitas na loja",
    value: "19",
    detail: "11,8% vs. ontem",
    icon: Store,
    tone: "purple",
    tab: "agenda-hoje",
    positive: true,
  },
  {
    title: "Vendas pendentes",
    value: "63",
    detail: "4,5% vs. semana anterior",
    icon: WalletCards,
    tone: "orange",
    tab: "kanban-vendas-pendentes",
    positive: false,
  },
  {
    title: "Conversão do mês",
    value: "18,6%",
    detail: "2,7 p.p. vs. mês anterior",
    icon: BarChart3,
    tone: "green",
    tab: "relatorios",
    positive: true,
  },
  {
    title: "Leads sem contato",
    value: "312",
    detail: "9,6% vs. semana anterior",
    icon: AlarmClock,
    tone: "red",
    tab: "controle-3cx",
    positive: true,
  },
];

const linePoints = [
  { x: 25, y: 125 },
  { x: 110, y: 104 },
  { x: 195, y: 128 },
  { x: 280, y: 82 },
  { x: 365, y: 100 },
  { x: 450, y: 66 },
  { x: 535, y: 118 },
  { x: 620, y: 90 },
];

const appointments = [
  { time: "09:00", name: "Carlos Henrique Silva", car: "Jeep Compass Limited 2.0", badge: "Visita", tab: "agenda-hoje" },
  { time: "10:30", name: "Juliana Martins", car: "Toyota Corolla XEi 2.0", badge: "Test Drive", tab: "agenda-hoje" },
  { time: "11:00", name: "Rafael Costa", car: "Honda HR-V EXL 1.5", badge: "Visita", tab: "agenda-hoje" },
  { time: "14:00", name: "Fernanda Oliveira", car: "VW T-Cross Highline 1.4", badge: "Proposta", tab: "kanban-vendas-pendentes" },
  { time: "15:30", name: "Bruno Almeida", car: "Chevrolet Tracker Premier", badge: "Test Drive", tab: "agenda-hoje" },
];

const kanban = [
  {
    title: "Morno",
    count: 124,
    footer: "+ 122 leads",
    cards: [
      { name: "Leonardo Souza", car: "Jeep Renegade", info: "Entrada: 22/05", tag: "Morno" },
      { name: "Patricia Lima", car: "VW Nivus Comfortline", info: "Entrada: 22/05", tag: "Morno" },
    ],
  },
  {
    title: "Em contato",
    count: 86,
    footer: "+ 84 leads",
    cards: [
      { name: "Thiago Ferreira", car: "Honda Civic EX", info: "Último contato: hoje", tag: "Ligação" },
      { name: "Camila Mendes", car: "Toyota Yaris XL", info: "Último contato: ontem", tag: "WhatsApp" },
    ],
  },
  {
    title: "Agendado",
    count: 42,
    footer: "+ 40 leads",
    cards: [
      { name: "Ricardo Andrade", car: "Jeep Compass", info: "Agendado: 22/05 10:00", tag: "Agenda" },
      { name: "Beatriz Rocha", car: "Chevrolet Onix Plus", info: "Agendado: 22/05 14:00", tag: "Agenda" },
    ],
  },
  {
    title: "Visitou loja",
    count: 19,
    footer: "+ 17 leads",
    cards: [
      { name: "Gabriel Moreira", car: "VW Taos Highline", info: "Visitou: 21/05", tag: "Loja" },
      { name: "Mariana Santos", car: "Honda HR-V EX", info: "Visitou: 21/05", tag: "Loja" },
    ],
  },
];

const urgentActions = [
  { label: "Retornar leads sem contato > 3 dias", value: 142, tab: "controle-3cx", color: "bg-red-100 text-red-700" },
  { label: "Validar propostas pendentes", value: 27, tab: "kanban-vendas-pendentes", color: "bg-orange-100 text-orange-700" },
  { label: "Follow-up em atraso", value: 18, tab: "leads-ativos", color: "bg-red-100 text-red-700" },
  { label: "Agendamentos de hoje", value: 28, tab: "agenda-hoje", color: "bg-blue-100 text-blue-700" },
  { label: "Conferência pendente", value: 15, tab: "conferencia-veiculos", color: "bg-violet-100 text-violet-700" },
];

const funnel = [
  { label: "Morno", value: "1.248", percent: "100%", width: "100%", color: "bg-blue-100 text-blue-800", tab: "leads-ativos" },
  { label: "Em contato", value: "842", percent: "67,6%", width: "70%", color: "bg-slate-100 text-slate-800", tab: "controle-3cx" },
  { label: "Agendado", value: "312", percent: "25,0%", width: "48%", color: "bg-violet-100 text-violet-800", tab: "agenda-hoje" },
  { label: "Visitou loja", value: "169", percent: "13,6%", width: "34%", color: "bg-emerald-100 text-emerald-800", tab: "agenda-hoje" },
  { label: "Venda pendente", value: "63", percent: "5,0%", width: "28%", color: "bg-orange-100 text-orange-800", tab: "kanban-vendas-pendentes" },
  { label: "Venda validada", value: "34", percent: "2,7%", width: "22%", color: "bg-green-100 text-green-800", tab: "relatorios" },
];


const tabRoutes: Record<string, string> = {
  "dashboard-geral": "/dashboard",
  "dashboard-operacional": "/dashboard",
  "dashboard-estrategico": "/dashboard",
  "leads-ativos": "/dashboard/leads",
  "novo-lead": "/dashboard/leads?acao=novo",
  "importar-base": "/dashboard/c2s",
  "leads-arquivados": "/dashboard/leads?filtro=arquivados",
  "kanban-funil": "/dashboard/kanban",
  "kanban-minhas": "/dashboard/kanban?visao=minhas",
  "kanban-vendas-pendentes": "/dashboard/kanban?filtro=vendas-pendentes",
  "agenda-hoje": "/dashboard/agenda",
  "agenda-semana": "/dashboard/agenda?periodo=semana",
  "agenda-mes": "/dashboard/agenda?periodo=mes",
  "controle-3cx": "/dashboard/3cx",
  "ligacoes-3cx": "/dashboard/3cx?aba=ligacoes",
  "classificacoes-3cx": "/dashboard/3cx?aba=classificacoes",
  "whatsapp-3cx": "/dashboard/3cx/whatsapp",
  "campanhas-ativas": "/dashboard/campanhas",
  "criar-campanha": "/dashboard/campanhas?acao=nova",
  "mensagens-campanha": "/dashboard/campanhas?aba=mensagens",
  simulador: "/dashboard/simulador",
  "simulacoes-salvas": "/dashboard/simulador?aba=salvas",
  "conferencia-veiculos": "/dashboard/conferencia",
  "conferencia-divergencias": "/dashboard/conferencia?filtro=divergencias",
  "conferencia-aceitos": "/dashboard/conferencia?filtro=aceitos",
  relatorios: "/dashboard/relatorios",
  "relatorios-equipe": "/dashboard/relatorios?aba=equipe",
  "relatorios-unidades": "/dashboard/relatorios?aba=unidades",
  usuarios: "/dashboard/usuarios",
  "usuarios-perfis": "/dashboard/usuarios?aba=perfis",
  "usuarios-status": "/dashboard/usuarios?aba=status",
  configuracoes: "/dashboard/configuracoes",
  "configuracoes-tema": "/dashboard/configuracoes?aba=tema",
  "configuracoes-integracoes": "/dashboard/configuracoes?aba=integracoes",
  "acoes-urgentes": "/dashboard/leads?filtro=urgentes",
};

type Painel = { titulo: string; descricao: string; rota?: string; itens?: string[] };

function getTabLabel(tab: string) {
  for (const item of menuItems) {
    const achado = item.subitems.find((subitem) => subitem.tab === tab);
    if (achado) return achado.label;
    if (item.tab === tab) return item.label;
  }

  return tab;
}

function montarPainel(titulo: string, descricao: string, rota?: string, itens?: string[]): Painel {
  return { titulo, descricao, rota, itens };
}

function exportarCsv(nomeArquivo: string, linhas: Array<Array<string | number>>) {
  const csv = linhas
    .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

function getToneClasses(tone: string) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-violet-50 text-violet-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return tones[tone] ?? tones.blue;
}

export function DashboardClient({ usuario }: DashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [menuAberto, setMenuAberto] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard-geral");
  const [openMenus, setOpenMenus] = useState<string[]>(["Dashboard"]);
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [painel, setPainel] = useState<Painel | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState<"lojas" | "notificacoes" | "avatar" | "periodo" | "filtros" | "usuarios" | null>(null);
  const [graficoHover, setGraficoHover] = useState<Painel | null>(null);
  const [barraHover, setBarraHover] = useState<Painel | null>(null);
  const menuContentRef = useRef<HTMLDivElement | null>(null);

  function fecharMenu() {
    setMenuAberto(false);
    setOpenMenus([]);
  }

  function handleMenuAutoScroll(event: React.MouseEvent<HTMLDivElement>) {
    const menu = menuContentRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const distanceFromTop = event.clientY - rect.top;
    const distanceFromBottom = rect.bottom - event.clientY;
    const edgeSize = 88;

    if (distanceFromBottom < edgeSize) {
      menu.scrollTop += 16;
      return;
    }

    if (distanceFromTop < edgeSize) {
      menu.scrollTop -= 16;
    }
  }

  function toggleMenu(label: string) {
    setOpenMenus((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  }

  function abrirPainel(tab: string, titulo?: string, descricao?: string, itens?: string[]) {
    const rota = tabRoutes[tab];
    const nome = titulo || getTabLabel(tab);

    setActiveTab(tab);
    setPainel(
      montarPainel(
        nome,
        descricao || `Área preparada para ${nome}. Quando o módulo estiver completo, este ponto já estará conectado ao fluxo correto.`,
        rota,
        itens
      )
    );
  }


  function navegarMenu(tab: string) {
    const rotas: Record<string, string> = {
      "dashboard-geral": "/dashboard",
      "dashboard-operacional": "/dashboard",
      "dashboard-estrategico": "/dashboard",
      "leads-ativos": "/dashboard/leads",
      "novo-lead": "/dashboard/leads",
      "importar-base": "/dashboard/c2s",
      "leads-arquivados": "/dashboard/leads",
      "kanban-funil": "/dashboard/kanban",
      "kanban-minhas": "/dashboard/kanban",
      "kanban-vendas-pendentes": "/dashboard/kanban",
      "agenda-hoje": "/dashboard/agenda",
      "agenda-semana": "/dashboard/agenda",
      "agenda-mes": "/dashboard/agenda",
      "controle-3cx": "/dashboard/3cx",
      "ligacoes-3cx": "/dashboard/3cx",
      "classificacoes-3cx": "/dashboard/3cx",
      "whatsapp-3cx": "/dashboard/3cx/whatsapp",
      "campanhas-ativas": "/dashboard/campanhas",
      "criar-campanha": "/dashboard/campanhas",
      "mensagens-campanha": "/dashboard/campanhas",
      "simulador": "/dashboard/simulador",
      "simulacoes-salvas": "/dashboard/simulador",
      "conferencia-veiculos": "/dashboard/conferencia",
      "conferencia-divergencias": "/dashboard/conferencia",
      "conferencia-aceitos": "/dashboard/conferencia",
      "relatorios": "/dashboard/relatorios",
      "relatorios-equipe": "/dashboard/relatorios",
      "relatorios-unidades": "/dashboard/relatorios",
      "usuarios": "/dashboard/usuarios",
      "usuarios-perfis": "/dashboard/usuarios",
      "usuarios-status": "/dashboard/usuarios",
      "configuracoes": "/dashboard/configuracoes",
      "configuracoes-tema": "/dashboard/configuracoes",
      "configuracoes-integracoes": "/dashboard/configuracoes",
    };

    const rota = rotas[tab] || "/dashboard";
    router.push(rota);
  }

  function goTo(tab: string) {
    const rota = tabRoutes[tab];
    setActiveTab(tab);

    if (rota && rota !== "/dashboard") {
      router.push(rota);
      return;
    }

    setPainel(montarPainel(getTabLabel(tab), "Você está na visão principal da dashboard operacional.", rota));
  }

  function executarBusca() {
    const termo = buscaGlobal.trim();

    if (!termo) {
      setPainel(montarPainel("Busca global", "Digite um termo para buscar leads, clientes, veículos ou agendamentos."));
      return;
    }

    setPainel(
      montarPainel(
        "Busca global",
        `Busca preparada para consultar leads, clientes, veículos e agendamentos por: ${termo}.`,
        "/dashboard/leads",
        ["Aplicar termo na tela de Leads", "Consultar agenda por cliente/veículo", "Cruzar histórico com 3CX"]
      )
    );
  }

  function abrirDropdown(nome: "lojas" | "notificacoes" | "avatar" | "periodo" | "filtros" | "usuarios") {
    setDropdownAberto((atual) => (atual === nome ? null : nome));
  }

  function baixarRelatorio() {
    exportarCsv("flow-sales-dashboard.csv", [
      ["Indicador", "Valor", "Variação"],
      ...metrics.map((metric) => [metric.title, metric.value, metric.detail]),
      ["Total de visitas na loja", "19", "11,8%"],
      ["Vendas validadas", "34", "13,3%"],
      ["Faturamento", "3.325.900", "16,8%"],
    ]);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={() => setMenuAberto(true)}
        onMouseLeave={fecharMenu}
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white shadow-sm transition-all duration-300 lg:block ${
          menuAberto ? "w-[250px]" : "w-[76px]"
        }`}
      >
        <div className="flex h-full flex-col">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className={`flex h-[76px] items-center border-b border-slate-100 px-4 ${
              menuAberto ? "justify-start" : "justify-center"
            }`}
          >
            <Image
              src={menuAberto ? "/logo-slogan.png" : "/logo.png"}
              alt="Flow Sales CRM"
              width={menuAberto ? 170 : 36}
              height={52}
              priority
              className={menuAberto ? "h-auto w-[170px] object-contain" : "h-9 w-9 object-contain"}
            />
          </button>

          <nav ref={menuContentRef} onMouseMove={handleMenuAutoScroll} className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.subitems.some((sub) => sub.tab === activeTab);
                const isOpen = openMenus.includes(item.label);

                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAberto(true);
                        toggleMenu(item.label);
                      }}
                      className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      } ${menuAberto ? "justify-start" : "justify-center"}`}
                      title={item.label}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {menuAberto ? <span className="flex-1 text-left">{item.label}</span> : null}
                      {menuAberto ? (
                        isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : null}
                    </button>

                    {menuAberto && isOpen ? (
                      <div className="ml-6 mt-1 space-y-1 border-l border-slate-200 pl-3">
                        {item.subitems.map((subitem) => (
                          <button
                            key={subitem.tab}
                            type="button"
                            onClick={() => navegarMenu(subitem.tab)}
                            className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                              activeTab === subitem.tab
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            {subitem.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={sair}
              className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 ${
                menuAberto ? "justify-start" : "justify-center"
              }`}
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
              {menuAberto ? <span>Sair</span> : null}
            </button>
          </div>
        </div>
      </aside>

      <div
        onClick={fecharMenu}
        className={`min-h-screen transition-all duration-300 ${menuAberto ? "lg:pl-[250px]" : "lg:pl-[76px]"}`}
      >
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-[76px] items-center gap-4 px-4 sm:px-6">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuAberto(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
              <label className="relative w-full max-w-[520px]">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={buscaGlobal}
                  onChange={(event) => setBuscaGlobal(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      executarBusca();
                    }
                  }}
                  placeholder="Buscar por leads, clientes, veículos, agendamentos..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                abrirDropdown("usuarios");
              }}
              className="hidden h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:flex"
            >
              <UserCog className="h-4 w-4" />
              Usuários
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                abrirDropdown("notificacoes");
              }}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                12
              </span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                abrirDropdown("avatar");
              }}
              className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-slate-100"
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {usuario.nome.slice(0, 1).toUpperCase()}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" title="Disponível" />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-bold text-slate-900">{usuario.nome}</p>
                <p className="text-xs text-slate-500">{usuario.perfil}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
          </div>
        </header>

        {dropdownAberto ? (
          <div className="fixed right-6 top-[72px] z-50 w-[340px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950">{dropdownAberto === "lojas" ? "Selecionar loja" : dropdownAberto === "notificacoes" ? "Notificações" : dropdownAberto === "periodo" ? "Período" : dropdownAberto === "filtros" ? "Filtros" : dropdownAberto === "usuarios" ? "Usuários" : "Minha conta"}</h3>
              <button type="button" onClick={() => setDropdownAberto(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>

            {dropdownAberto === "lojas" ? (
              <div className="grid gap-2">
                {["Todas as lojas", "Loja 1", "Loja 2", "Loja 3", "Loja 4", "Premium"].map((loja) => (
                  <button key={loja} type="button" onClick={() => { setDropdownAberto(null); setPainel(montarPainel("Filtro de loja", `Dashboard filtrada por: ${loja}.`, "/dashboard/relatorios?filtro=loja")); }} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">{loja}</button>
                ))}
              </div>
            ) : null}

            {dropdownAberto === "notificacoes" ? (
              <div className="grid gap-2">
                {urgentActions.slice(0, 4).map((item) => (
                  <button key={item.label} type="button" onClick={() => { setDropdownAberto(null); abrirPainel(item.tab, item.label, "Notificação operacional com ação vinculada.", [`Total pendente: ${item.value}`, "Clique em abrir módulo para tratar."]); }} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50">
                    <span>{item.label}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.color}`}>{item.value}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {dropdownAberto === "periodo" ? (
              <div className="grid gap-2">
                {["Hoje", "Esta semana", "Este mês", "Últimos 30 dias", "Personalizado"].map((periodo) => (
                  <button key={periodo} type="button" onClick={() => { setDropdownAberto(null); setPainel(montarPainel("Período aplicado", `Filtro de período selecionado: ${periodo}.`, "/dashboard/relatorios")); }} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">{periodo}</button>
                ))}
              </div>
            ) : null}

            {dropdownAberto === "filtros" ? (
              <div className="grid gap-2">
                {["Leads sem contato", "Vendas pendentes", "Agendamentos de hoje", "Conferência pendente", "Alta conversão"].map((filtro) => (
                  <button key={filtro} type="button" onClick={() => { setDropdownAberto(null); setPainel(montarPainel("Filtro aplicado", `Filtro preparado: ${filtro}.`, "/dashboard/leads")); }} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">{filtro}</button>
                ))}
              </div>
            ) : null}

            {dropdownAberto === "usuarios" ? (
              <div className="grid gap-2">
                {["Todos os usuários", "Perfis e acessos", "Status da equipe"].map((item) => (
                  <button key={item} type="button" onClick={() => { setDropdownAberto(null); router.push(item === "Todos os usuários" ? "/dashboard/usuarios" : `/dashboard/usuarios?aba=${encodeURIComponent(item.toLowerCase())}`); }} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">{item}</button>
                ))}
              </div>
            ) : null}

            {dropdownAberto === "avatar" ? (
              <div className="grid gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <strong className="block text-slate-950">{usuario.nome}</strong>
                  <span>{usuario.perfil}</span>
                </div>
                <button type="button" onClick={() => { setDropdownAberto(null); router.push("/dashboard/usuarios?aba=perfil"); }} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">Meu perfil</button>
                <button type="button" onClick={sair} className="rounded-xl border border-red-100 px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50">Sair</button>
              </div>
            ) : null}
          </div>
        ) : null}

        <main className="px-4 py-5 sm:px-6" onClick={() => { fecharMenu(); setDropdownAberto(null); }}>
          <section className="mb-4 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Dashboard operacional
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Visão estratégica e operacional da recuperação de vendas
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  abrirDropdown("periodo");
                }}
                className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <CalendarDays className="h-4 w-4 text-slate-500" />
                Período 16/05/2024 - 22/05/2024
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  abrirDropdown("filtros");
                }}
                className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Filtros
                <Filter className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-6">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const TrendIcon = metric.positive ? TrendingUp : TrendingDown;

              return (
                <button
                  key={metric.title}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    abrirPainel(metric.tab, metric.title, `Indicador ${metric.title}: ${metric.value}. ${metric.detail}.`, ["Clique em abrir módulo para ver detalhes e registros."]);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getToneClasses(metric.tone)}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] font-bold text-slate-400">
                      i
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-500">{metric.title}</p>
                  <strong className="mt-1 block text-2xl font-bold text-slate-950">{metric.value}</strong>
                  <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${metric.positive ? "text-emerald-600" : "text-red-600"}`}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    {metric.detail}
                  </p>
                </button>
              );
            })}
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr_0.92fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-950">Leads e agendamentos ao longo do tempo</h2>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-2"><span className="h-2 w-4 rounded-full bg-blue-700" /> Leads criados</span>
                    <span className="flex items-center gap-2"><span className="h-2 w-4 rounded-full bg-cyan-500" /> Agendamentos</span>
                    <span className="flex items-center gap-2"><span className="h-2 w-4 rounded-full bg-indigo-400" /> Visitas na loja</span>
                  </div>
                </div>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 text-xs font-semibold">
                  {['Diário', 'Semanal', 'Mensal'].map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        goTo('relatorios');
                      }}
                      className={`px-4 py-2 ${index === 0 ? "bg-blue-50 text-blue-700" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  abrirPainel("relatorios", "Gráfico de evolução", "Comparativo entre leads criados, agendamentos e visitas na loja no período selecionado.", ["Linha azul: leads criados", "Linha ciano: agendamentos", "Linha lilás: visitas na loja"]);
                }}
                onMouseLeave={() => setGraficoHover(null)}
                className="relative h-[250px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-white to-slate-50 text-left"
              >
                <svg viewBox="0 0 660 190" className="h-full w-full">
                  {[30, 70, 110, 150].map((y) => (
                    <line key={y} x1="20" y1={y} x2="640" y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />
                  ))}
                  <polyline
                    points={linePoints.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="25,155 110,145 195,151 280,139 365,150 450,118 535,154 620,142"
                    fill="none"
                    stroke="#22c7d8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="25,88 110,60 195,72 280,96 365,68 450,46 535,95 620,75"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <g className="opacity-0 transition-opacity hover:opacity-100">
                    <circle cx="450" cy="66" r="6" fill="#2563eb" />
                    <rect x="460" y="48" width="136" height="82" rx="10" fill="white" stroke="#e2e8f0" />
                    <text x="476" y="70" fontSize="12" fontWeight="700" fill="#0f172a">20/05/2024</text>
                    <text x="476" y="91" fontSize="11" fill="#334155">Leads criados 162</text>
                    <text x="476" y="109" fontSize="11" fill="#334155">Agendamentos 41</text>
                    <text x="476" y="127" fontSize="11" fill="#334155">Visitas na loja 27</text>
                  </g>
                  {linePoints.map((point, index) => (
                    <circle
                      key={`lead-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r="12"
                      fill="transparent"
                      onMouseEnter={() => setGraficoHover(montarPainel("Leads criados", `${150 + index * 8} leads criados no dia ${16 + index}/05.`, "/dashboard/relatorios"))}
                    />
                  ))}
                  {[25, 110, 195, 280, 365, 450, 535, 620].map((x, index) => (
                    <circle
                      key={`agendamento-${index}`}
                      cx={x}
                      cy={[155, 145, 151, 139, 150, 118, 154, 142][index]}
                      r="12"
                      fill="transparent"
                      onMouseEnter={() => setGraficoHover(montarPainel("Agendamentos", `${22 + index * 3} agendamentos no dia ${16 + index}/05.`, "/dashboard/agenda"))}
                    />
                  ))}
                  {[25, 110, 195, 280, 365, 450, 535, 620].map((x, index) => (
                    <circle
                      key={`visita-${index}`}
                      cx={x}
                      cy={[88, 60, 72, 96, 68, 46, 95, 75][index]}
                      r="12"
                      fill="transparent"
                      onMouseEnter={() => setGraficoHover(montarPainel("Visitas na loja", `${12 + index * 2} visitas no dia ${16 + index}/05.`, "/dashboard/agenda"))}
                    />
                  ))}
                </svg>
                {graficoHover ? (
                  <div className="absolute right-6 top-6 max-w-[230px] rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 shadow-xl">
                    <strong className="mb-1 block text-slate-950">{graficoHover.titulo}</strong>
                    {graficoHover.descricao}
                  </div>
                ) : null}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-bold text-slate-950">Funil de recuperação</h2>
              <div className="mt-4 space-y-2.5">
                {funnel.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      abrirPainel(item.tab, item.label, `${item.label}: ${item.value} leads (${item.percent}) no funil de recuperação.`, ["Abrir módulo para filtrar essa etapa."]);
                    }}
                    className="relative h-10 w-full overflow-hidden rounded-xl bg-slate-50 text-left transition hover:ring-2 hover:ring-blue-100"
                  >
                    <div className={`absolute inset-y-0 left-0 rounded-xl ${item.color}`} style={{ width: item.width }} />
                    <div className="relative flex h-full items-center justify-between px-3 text-xs font-bold">
                      <span>{item.label}</span>
                      <span className="text-slate-600">{item.value} ({item.percent})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <AlarmClock className="h-5 w-5 text-red-500" />
                <h2 className="font-bold text-slate-950">Ações urgentes</h2>
              </div>
              <div className="space-y-2.5">
                {urgentActions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      abrirPainel(item.tab, item.label, `Ação urgente com ${item.value} registros pendentes.`, ["Abrir módulo", "Priorizar atendimento", "Filtrar responsáveis"]);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-white"
                  >
                    {item.label}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.color}`}>{item.value}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo("acoes-urgentes");
                }}
                className="mt-4 flex w-full items-center justify-between text-sm font-bold text-blue-700"
              >
                Ver todos <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.45fr_0.72fr_0.92fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-slate-950"><CalendarDays className="h-5 w-5 text-blue-700" /> Agenda de hoje</h2>
                <button type="button" onClick={(event) => { event.stopPropagation(); goTo("agenda-hoje"); }} className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Ver agenda</button>
              </div>
              <div className="space-y-3">
                {appointments.map((item) => (
                  <button key={`${item.time}-${item.name}`} type="button" onClick={(event) => { event.stopPropagation(); goTo(item.tab); }} className="grid w-full grid-cols-[54px_1fr_auto] items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50">
                    <span className="text-sm font-bold text-slate-900">{item.time}</span>
                    <span>
                      <span className="block text-sm font-bold text-slate-800">{item.name}</span>
                      <span className="block text-xs text-slate-500">{item.car}</span>
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{item.badge}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={(event) => { event.stopPropagation(); goTo("agenda-hoje"); }} className="mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-blue-700">Ver todos agendamentos <ChevronRight className="h-4 w-4" /></button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-bold text-slate-950"><WalletCards className="h-5 w-5 text-slate-500" /> Prévia do Kanban</h2>
                <button type="button" onClick={(event) => { event.stopPropagation(); goTo("kanban-funil"); }} className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Ver kanban completo</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                {kanban.map((column) => (
                  <button key={column.title} type="button" onClick={(event) => { event.stopPropagation(); goTo("kanban-funil"); }} className="min-h-[245px] rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-white">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{column.title}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-slate-200">{column.count}</span>
                    </div>
                    <div className="space-y-2.5">
                      {column.cards.map((card) => (
                        <div key={card.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <p className="text-sm font-bold text-slate-900">{card.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{card.car}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">{card.info}</p>
                          <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-700">{card.tag}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-xl bg-white py-2 text-center text-xs font-bold text-slate-500 ring-1 ring-slate-100">{column.footer}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-blue-700" /> Conferência</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {[{label: 'Pendentes', value: 15, tab: 'conferencia-veiculos'}, {label: 'Divergências', value: 5, tab: 'conferencia-divergencias'}, {label: 'Aceitos', value: 28, tab: 'conferencia-aceitos'}, {label: 'Finalizados', value: 48, tab: 'conferencia-veiculos'}].map((item) => (
                  <button key={item.label} type="button" onClick={(event) => { event.stopPropagation(); goTo(item.tab); }} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <strong className="mt-2 block text-2xl text-slate-950">{item.value}</strong>
                  </button>
                ))}
              </div>
              <button type="button" onClick={(event) => { event.stopPropagation(); goTo("conferencia-veiculos"); }} className="mt-4 flex w-full items-center justify-between text-sm font-bold text-blue-700">Ir para conferência <ChevronRight className="h-4 w-4" /></button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-slate-950"><Building2 className="h-5 w-5 text-blue-700" /> Desempenho por unidade</h2>
                <button type="button" onClick={(event) => { event.stopPropagation(); goTo("relatorios-unidades"); }} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">Este mês</button>
              </div>
              <button type="button" onClick={(event) => { event.stopPropagation(); goTo("relatorios-unidades"); }} className="h-[230px] w-full text-left">
                <div className="flex h-full items-end gap-5 border-b border-l border-slate-200 px-4 pb-5">
                  {[820, 640, 560, 420].map((value, index) => (
                    <div key={value} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{value}</span>
                      <div className="flex h-[160px] items-end gap-1.5">
                        <div
                          className="w-5 rounded-t-md bg-blue-700"
                          style={{ height: `${value / 8.2}%` }}
                          onMouseEnter={() => setBarraHover(montarPainel(`Loja ${index + 1} - Leads`, `${value} leads no período selecionado.`, "/dashboard/relatorios?aba=unidades"))}
                          onMouseLeave={() => setBarraHover(null)}
                        />
                        <div
                          className="w-5 rounded-t-md bg-cyan-500"
                          style={{ height: `${(156 - index * 24) / 2}%` }}
                          onMouseEnter={() => setBarraHover(montarPainel(`Loja ${index + 1} - Vendas`, `${156 - index * 24} vendas validadas no período.`, "/dashboard/relatorios?aba=unidades"))}
                          onMouseLeave={() => setBarraHover(null)}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Loja {index + 1}</span>
                    </div>
                  ))}
                </div>
              </button>
              {barraHover ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 shadow-sm">
                  <strong className="block text-slate-950">{barraHover.titulo}</strong>
                  {barraHover.descricao}
                </div>
              ) : null}
              <button type="button" onClick={(event) => { event.stopPropagation(); abrirPainel("relatorios-unidades", "Relatório por unidade", "Comparativo de leads e vendas validadas por unidade.", ["Loja 1", "Loja 2", "Loja 3", "Loja 4"]); }} className="mt-4 flex w-full items-center justify-between text-sm font-bold text-blue-700">Ver relatório completo <ChevronRight className="h-4 w-4" /></button>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] xl:items-center">
              {[
                ['Total de leads no período', '1.248', '12,5%'],
                ['Total de visitas na loja', '19', '11,8%'],
                ['Vendas validadas', '34', '13,3%'],
                ['Ticket médio (R$)', '97.850', '5,1%'],
                ['Faturamento (R$)', '3.325.900', '16,8%'],
              ].map(([label, value, change]) => (
                <button key={label} type="button" onClick={(event) => { event.stopPropagation(); goTo("relatorios"); }} className="border-slate-100 text-left xl:border-r xl:pr-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{value} <span className="ml-1 text-sm font-bold text-emerald-600">↑ {change}</span></p>
                </button>
              ))}
              <button type="button" onClick={(event) => { event.stopPropagation(); baixarRelatorio(); }} className="h-12 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"><Download className="mr-2 inline h-4 w-4" />Exportar relatório</button>
            </div>
          </section>
        </main>

        {painel ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-sm" onClick={() => setPainel(null)}>
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">{painel.titulo}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{painel.descricao}</p>
                </div>
                <button type="button" onClick={() => setPainel(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>

              {painel.itens?.length ? (
                <div className="mb-5 grid gap-2">
                  {painel.itens.map((item) => (
                    <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{item}</div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={() => setPainel(null)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Fechar</button>
                {painel.rota ? (
                  <button type="button" onClick={() => { const rota = painel.rota; setPainel(null); if (rota) router.push(rota); }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
                    Abrir módulo <ExternalLink className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
