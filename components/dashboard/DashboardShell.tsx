"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotificacoesPopup } from "@/components/dashboard/NotificacoesPopup";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  PhoneCall,
  Search,
  Settings,
  Store,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type Usuario = {
  id?: string;
  nome: string;
  email?: string | null;
  perfil: string;
  ativo?: boolean;
  avatar_url?: string | null;
  status_operacional?: string | null;
  status_administrativo?: string | null;
};

type DashboardShellProps = {
  usuario: Usuario;
  activeTab?: string;
  children: ReactNode;
};

type ConfigItem = {
  chave: string;
  valor: Record<string, any>;
};

type ConfiguracoesApi = {
  ok: boolean;
  configuracoes?: {
    sistema?: ConfigItem[];
    perfil?: ConfigItem[];
    usuario?: ConfigItem[];
  };
};

type SubItem = {
  label: string;
  tab: string;
  href: string;
  perfis?: string[];
};

type MenuItem = {
  label: string;
  icon: React.ElementType;
  tab: string;
  href: string;
  perfis?: string[];
  subitems: SubItem[];
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    tab: "dashboard-geral",
    href: "/dashboard",
    subitems: [
      { label: "Visão geral", tab: "dashboard-geral", href: "/dashboard" },
      { label: "Operacional", tab: "dashboard-operacional", href: "/dashboard?visao=operacional" },
      { label: "Estratégico", tab: "dashboard-estrategico", href: "/dashboard?visao=estrategico", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
    ],
  },
  {
    label: "CRM de leads",
    icon: Users,
    tab: "leads-ativos",
    href: "/dashboard/leads",
    subitems: [
      { label: "Leads ativos", tab: "leads-ativos", href: "/dashboard/leads" },
      { label: "Minhas tarefas", tab: "leads-tarefas", href: "/dashboard/leads/tarefas" },
      { label: "Novo lead", tab: "novo-lead", href: "/dashboard/leads/novo", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
      { label: "Solicitações", tab: "solicitacoes-leads", href: "/dashboard/leads/solicitacoes", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
      { label: "Importar base", tab: "importar-base", href: "/dashboard/c2s", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
      { label: "Arquivados", tab: "leads-arquivados", href: "/dashboard/leads?filtro=arquivados", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
    ],
  },
  {
    label: "Kanban",
    icon: WalletCards,
    tab: "kanban-funil",
    href: "/dashboard/kanban",
    subitems: [
      { label: "Funil completo", tab: "kanban-funil", href: "/dashboard/kanban" },
      { label: "Minhas oportunidades", tab: "kanban-minhas", href: "/dashboard/kanban?visao=minhas" },
      { label: "Vendas pendentes", tab: "kanban-vendas-pendentes", href: "/dashboard/kanban?filtro=vendas-pendentes" },
      { label: "Configurar funil", tab: "kanban-configuracoes", href: "/dashboard/kanban/configuracoes", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
    ],
  },
  {
    label: "Agenda",
    icon: CalendarDays,
    tab: "agenda-hoje",
    href: "/dashboard/agenda",
    subitems: [
      { label: "Hoje", tab: "agenda-hoje", href: "/dashboard/agenda" },
      { label: "Semana", tab: "agenda-semana", href: "/dashboard/agenda?periodo=semana" },
      { label: "Mês", tab: "agenda-mes", href: "/dashboard/agenda?periodo=mes" },
    ],
  },
  {
    label: "Controle 3CX",
    icon: PhoneCall,
    tab: "controle-3cx",
    href: "/dashboard/3cx",
    subitems: [
      { label: "Monitor", tab: "controle-3cx", href: "/dashboard/3cx" },
      { label: "Ligações", tab: "ligacoes-3cx", href: "/dashboard/3cx?aba=ligacoes" },
      { label: "Histórico", tab: "historico-3cx", href: "/dashboard/3cx/historico" },
      { label: "Classificações", tab: "classificacoes-3cx", href: "/dashboard/3cx/classificacoes" },
      { label: "Monitor WhatsApp", tab: "whatsapp-3cx", href: "/dashboard/3cx/whatsapp" },
    ],
  },
  {
    label: "Campanhas",
    icon: Store,
    tab: "campanhas-ativas",
    href: "/dashboard/campanhas",
    subitems: [
      { label: "Campanhas ativas", tab: "campanhas-ativas", href: "/dashboard/campanhas" },
      { label: "Criar campanha", tab: "criar-campanha", href: "/dashboard/campanhas?acao=nova", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
      { label: "Mensagens", tab: "mensagens-campanha", href: "/dashboard/campanhas?aba=mensagens" },
    ],
  },
  {
    label: "Simulador",
    icon: Car,
    tab: "simulador",
    href: "/dashboard/simulador",
    subitems: [
      { label: "Nova simulação", tab: "simulador", href: "/dashboard/simulador" },
      { label: "Simulações salvas", tab: "simulacoes-salvas", href: "/dashboard/simulador?aba=salvas" },
    ],
  },
  {
    label: "Conferência",
    icon: ClipboardCheck,
    tab: "conferencia-veiculos",
    href: "/dashboard/conferencia",
    subitems: [
      { label: "Veículos", tab: "conferencia-veiculos", href: "/dashboard/conferencia" },
      { label: "Divergências", tab: "conferencia-divergencias", href: "/dashboard/conferencia?filtro=divergencias" },
      { label: "Aceitos", tab: "conferencia-aceitos", href: "/dashboard/conferencia?filtro=aceitos" },
    ],
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    tab: "relatorios",
    href: "/dashboard/relatorios",
    perfis: ["adm", "admin", "suporte", "gerente", "supervisor"],
    subitems: [
      { label: "Geral", tab: "relatorios", href: "/dashboard/relatorios" },
      { label: "Equipe", tab: "relatorios-equipe", href: "/dashboard/relatorios?aba=equipe" },
      { label: "Unidades", tab: "relatorios-unidades", href: "/dashboard/relatorios?aba=unidades" },
    ],
  },
  {
    label: "Usuários",
    icon: UserCog,
    tab: "usuarios",
    href: "/dashboard/usuarios",
    perfis: ["adm", "admin", "suporte", "gerente", "supervisor"],
    subitems: [
      { label: "Todos", tab: "usuarios", href: "/dashboard/usuarios" },
      { label: "Perfis", tab: "usuarios-perfis", href: "/dashboard/usuarios/permissoes" },
      { label: "Status", tab: "usuarios-status", href: "/dashboard/usuarios?aba=status" },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    tab: "configuracoes",
    href: "/dashboard/configuracoes",
    subitems: [
      { label: "Geral", tab: "configuracoes", href: "/dashboard/configuracoes" },
      { label: "Tema", tab: "configuracoes-tema", href: "/dashboard/configuracoes?aba=tema" },
      { label: "Notificações", tab: "configuracoes-notificacoes", href: "/dashboard/configuracoes?aba=notificacoes" },
      { label: "Operação e pausas", tab: "configuracoes-operacao-pausas", href: "/dashboard/configuracoes/operacao-pausas", perfis: ["adm", "admin", "suporte"] },
      { label: "CRM e leads", tab: "configuracoes-leads", href: "/dashboard/configuracoes?aba=leads", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
      { label: "Agenda", tab: "configuracoes-agenda", href: "/dashboard/configuracoes/agenda", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
      { label: "Kanban", tab: "configuracoes-kanban", href: "/dashboard/configuracoes/kanban", perfis: ["adm", "admin", "suporte", "gerente", "supervisor"] },
      { label: "Integrações", tab: "configuracoes-integracoes", href: "/dashboard/configuracoes/integracoes", perfis: ["adm", "admin", "suporte"] },
      { label: "API", tab: "configuracoes-api", href: "/dashboard/configuracoes/api", perfis: ["adm", "admin", "suporte"] },
      { label: "Auditoria", tab: "configuracoes-auditoria", href: "/dashboard/configuracoes/auditoria", perfis: ["adm", "admin", "suporte"] },
    ],
  },
];

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "").trim().toLowerCase();
}

function podeVer(perfil: string, perfis?: string[]) {
  if (!perfis || perfis.length === 0) return true;
  return perfis.includes(normalizarPerfil(perfil));
}

function hrefAtivo(pathname: string, href: string) {
  const base = href.split("?")[0];
  if (base === "/dashboard") return pathname === "/dashboard";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function buscarValor(configs: ConfigItem[] | undefined, chave: string, fallback: Record<string, any>) {
  return configs?.find((item) => item.chave === chave)?.valor || fallback;
}

function resolverTema(temaUsuario: string, temaGlobal: string) {
  const preferenciaUsuario = temaUsuario || "sistema";
  const preferenciaGlobal = temaGlobal || "claro";
  const temaBase = preferenciaUsuario === "sistema" ? preferenciaGlobal : preferenciaUsuario;
  const acompanhaSistema = ["sistema", "acompanhar_sistema", "acompanhar sistema"].includes(String(temaBase).toLowerCase());

  if (acompanhaSistema && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  }

  return temaBase === "escuro" ? "escuro" : "claro";
}

function aplicarTemaNoDocumento({ tema, densidade, corPrincipal, fonte }: { tema: string; densidade: string; corPrincipal: string; fonte: string }) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.remove("flow-theme-claro", "flow-theme-escuro");
  root.classList.add(tema === "escuro" ? "flow-theme-escuro" : "flow-theme-claro");

  root.classList.remove("flow-density-compacta", "flow-density-confortavel", "flow-density-ampla");
  root.classList.add(`flow-density-${densidade || "confortavel"}`);

  root.classList.remove("flow-font-padrao", "flow-font-grande", "flow-font-compacta");
  root.classList.add(`flow-font-${fonte || "padrao"}`);

  root.dataset.flowTheme = tema;
  root.dataset.flowColor = corPrincipal || "blue";
}


function statusLabelTopo(status?: string | null) {
  const mapa: Record<string, string> = {
    disponivel: "Disponível",
    offline: "Offline",
    ocupado: "Ocupado",
    em_atendimento: "Em atendimento",
    em_ligacao: "Em ligação",
    pausa_almoco: "Pausa almoço",
    pausa_feedback: "Pausa feedback",
    bloqueado: "Bloqueado",
  };

  return mapa[String(status || "").toLowerCase()] || "Offline";
}

function statusDotClass(status?: string | null) {
  const valor = String(status || "").toLowerCase();

  if (valor === "disponivel") return "bg-emerald-500";
  if (["em_atendimento"].includes(valor)) return "bg-blue-500";
  if (["ocupado", "em_ligacao", "pausa_feedback", "pausa_almoco"].includes(valor)) return "bg-amber-500";
  if (["bloqueado", "offline"].includes(valor)) return "bg-red-500";

  return "bg-slate-300";
}

export function DashboardShell({ usuario, activeTab = "dashboard-geral", children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const menuContentRef = useRef<HTMLDivElement | null>(null);

  const [menuAberto, setMenuAberto] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState<"notificacoes" | "avatar" | "usuarios" | null>(null);
  const [totalNotificacoes, setTotalNotificacoes] = useState(0);
  const [statusOperacional, setStatusOperacional] = useState(usuario.status_operacional || "offline");
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  const perfil = normalizarPerfil(usuario.perfil);

  const itensVisiveis = useMemo(() => {
    return menuItems
      .filter((item) => podeVer(perfil, item.perfis))
      .map((item) => ({
        ...item,
        subitems: item.subitems.filter((subitem) => podeVer(perfil, subitem.perfis)),
      }));
  }, [perfil]);

  function fecharMenu() {
    setMenuAberto(false);
    setOpenMenus([]);
  }

  function toggleMenu(label: string) {
    setMenuAberto(true);
    setOpenMenus((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );
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

  function executarBusca() {
    const termo = buscaGlobal.trim();
    if (!termo) return;
    router.push(`/dashboard/leads?busca=${encodeURIComponent(termo)}`);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function carregarConfiguracoesVisuais() {
    try {
      const resposta = await fetch("/api/configuracoes", { method: "GET", cache: "no-store" });
      const dados = (await resposta.json().catch(() => null)) as ConfiguracoesApi | null;
      if (!resposta.ok || !dados?.ok) return;

      const aparenciaGlobal = buscarValor(dados.configuracoes?.sistema, "aparencia_global", {
        tema_padrao: "claro",
        cor_principal: "blue",
        densidade: "confortavel",
        menu_padrao: "aberto",
        fonte: "padrao",
      });

      const preferenciasUsuario = buscarValor(dados.configuracoes?.usuario, "preferencias_usuario", {
        tema: "sistema",
        densidade: "confortavel",
        som_ativo: true,
        volume: 100,
        menu_aberto: true,
      });

      const temaFinal = resolverTema(String(preferenciasUsuario.tema || "sistema"), String(aparenciaGlobal.tema_padrao || "claro"));
      const densidadeFinal = String(preferenciasUsuario.densidade || aparenciaGlobal.densidade || "confortavel");
      const fonteFinal = String(aparenciaGlobal.fonte || "padrao");
      const corPrincipal = String(aparenciaGlobal.cor_principal || "blue");

      aplicarTemaNoDocumento({ tema: temaFinal, densidade: densidadeFinal, corPrincipal, fonte: fonteFinal });
      setMenuAberto(Boolean(preferenciasUsuario.menu_aberto ?? aparenciaGlobal.menu_padrao !== "fechado"));
    } catch {
      aplicarTemaNoDocumento({ tema: "claro", densidade: "confortavel", corPrincipal: "blue", fonte: "padrao" });
    }
  }

  useEffect(() => {
    carregarConfiguracoesVisuais();

    function recarregar() {
      carregarConfiguracoesVisuais();
    }

    window.addEventListener("flow-configuracoes-atualizadas", recarregar);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", recarregar);

    return () => {
      window.removeEventListener("flow-configuracoes-atualizadas", recarregar);
      media.removeEventListener?.("change", recarregar);
    };
  }, []);

  useEffect(() => {
    const ativo = itensVisiveis.find((item) => item.subitems.some((sub) => hrefAtivo(pathname, sub.href)) || hrefAtivo(pathname, item.href));
    if (ativo) setOpenMenus((current) => Array.from(new Set([...current, ativo.label])));
  }, [pathname, itensVisiveis]);


  async function carregarMeuStatus() {
    try {
      const resposta = await fetch("/api/usuarios/me/status", { method: "GET", cache: "no-store" });
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok || !json?.ok) return;
      setStatusOperacional(json.usuario?.status_operacional || "offline");
    } catch {
      // Mantém o status atual na tela.
    }
  }

  async function alterarMeuStatus(status: "disponivel" | "offline" | "ocupado") {
    setSalvandoStatus(true);

    try {
      const resposta = await fetch("/api/usuarios/me/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        alert(json?.erro || "Não foi possível alterar seu status.");
        return;
      }

      setStatusOperacional(json.usuario?.status_operacional || status);
      window.dispatchEvent(new Event("flow-status-atualizado"));
    } catch {
      alert("Não foi possível alterar seu status.");
    } finally {
      setSalvandoStatus(false);
    }
  }

  useEffect(() => {
    carregarMeuStatus();

    function recarregarStatus() {
      carregarMeuStatus();
    }

    window.addEventListener("flow-status-atualizado", recarregarStatus);

    return () => {
      window.removeEventListener("flow-status-atualizado", recarregarStatus);
    };
  }, []);

  return (
    <div className="flow-shell min-h-screen bg-slate-50 text-slate-950">
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
  height={menuAberto ? 52 : 36}
  priority
  style={menuAberto ? { width: "170px", height: "auto" } : { width: "36px", height: "36px" }}
  className="object-contain app-shell-logo"
/>
          </button>

          <nav
            ref={menuContentRef}
            onMouseMove={handleMenuAutoScroll}
            className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="space-y-1.5">
              {itensVisiveis.map((item) => {
                const Icon = item.icon;
                const isActive = item.subitems.some((sub) => hrefAtivo(pathname, sub.href)) || activeTab === item.tab || hrefAtivo(pathname, item.href);
                const isOpen = openMenus.includes(item.label);

                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.label)}
                      className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      } ${menuAberto ? "justify-start" : "justify-center"}`}
                      title={item.label}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {menuAberto ? <span className="flex-1 text-left">{item.label}</span> : null}
                      {menuAberto ? isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : null}
                    </button>

                    {menuAberto && isOpen ? (
                      <div className="ml-6 mt-1 space-y-1 border-l border-slate-200 pl-3">
                        {item.subitems.map((subitem) => {
                          const childAtivo = hrefAtivo(pathname, subitem.href) || activeTab === subitem.tab;

                          return (
                            <Link
                              key={`${subitem.tab}-${subitem.href}`}
                              href={subitem.href}
                              className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                                childAtivo
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              {subitem.label}
                            </Link>
                          );
                        })}
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
        onClick={() => {
          fecharMenu();
          setDropdownAberto(null);
        }}
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

            {podeVer(perfil, ["adm", "admin", "suporte", "gerente", "supervisor"]) ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setDropdownAberto((atual) => (atual === "usuarios" ? null : "usuarios"));
                }}
                className="hidden h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:flex"
              >
                <UserCog className="h-4 w-4" />
                Usuários
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            ) : null}

            <button
              id="flow-notification-bell"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDropdownAberto((atual) => (atual === "notificacoes" ? null : "notificacoes"));
              }}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <Bell className="h-5 w-5" />
              {totalNotificacoes > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {totalNotificacoes > 99 ? "99+" : totalNotificacoes}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDropdownAberto((atual) => (atual === "avatar" ? null : "avatar"));
              }}
              className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-slate-100"
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {usuario.nome.slice(0, 1).toUpperCase()}
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${statusDotClass(statusOperacional)}`} title={statusLabelTopo(statusOperacional)} />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-bold text-slate-900">{usuario.nome}</p>
                <p className="text-xs text-slate-500">{usuario.perfil} • {statusLabelTopo(statusOperacional)}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
          </div>
        </header>

        {dropdownAberto ? (
          <div
            className="fixed right-6 top-[72px] z-50 w-[340px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950">
                {dropdownAberto === "notificacoes" ? "Notificações" : dropdownAberto === "usuarios" ? "Usuários" : "Minha conta"}
              </h3>
              <button type="button" onClick={() => setDropdownAberto(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {dropdownAberto === "notificacoes" ? (
              <div className="grid gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  <strong className="block text-slate-950">{totalNotificacoes}</strong>
                  <span>notificação(ões) operacional(is) pendente(s).</span>
                </div>
                <Link href="/dashboard/agenda" onClick={() => setDropdownAberto(null)} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-100">
                  Abrir agenda operacional
                </Link>
                <Link href="/dashboard/leads/tarefas" onClick={() => setDropdownAberto(null)} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  Abrir minhas tarefas
                </Link>
              </div>
            ) : null}

            {dropdownAberto === "usuarios" ? (
              <div className="grid gap-2">
                <Link href="/dashboard/usuarios" onClick={() => setDropdownAberto(null)} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  Todos os usuários
                </Link>
                <Link href="/dashboard/usuarios/permissoes" onClick={() => setDropdownAberto(null)} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  Perfis e acessos
                </Link>
                <Link href="/dashboard/usuarios?aba=status" onClick={() => setDropdownAberto(null)} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  Status da equipe
                </Link>
              </div>
            ) : null}

            {dropdownAberto === "avatar" ? (
              <div className="grid gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <strong className="block text-slate-950">{usuario.nome}</strong>
                  <span>{usuario.perfil}</span>
                  <div className="mt-2 flex items-center gap-2 text-xs font-black text-slate-700">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(statusOperacional)}`} />
                    {statusLabelTopo(statusOperacional)}
                  </div>
                </div>

                <div className="grid gap-2 rounded-xl border border-slate-100 p-2">
                  <p className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-400">Meu status</p>
                  <button
                    type="button"
                    disabled={salvandoStatus || statusOperacional === "disponivel"}
                    onClick={() => alterarMeuStatus("disponivel")}
                    className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Ficar disponível
                  </button>
                  <button
                    type="button"
                    disabled={salvandoStatus || statusOperacional === "ocupado"}
                    onClick={() => alterarMeuStatus("ocupado")}
                    className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-left text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Ficar ocupado
                  </button>
                  <button
                    type="button"
                    disabled={salvandoStatus || statusOperacional === "offline"}
                    onClick={() => alterarMeuStatus("offline")}
                    className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Ficar offline
                  </button>
                  <p className="px-1 text-[11px] font-semibold leading-4 text-slate-500">
                    Ocupado e offline bloqueiam novos leads. Pausa almoço é automática. Pausa feedback é aplicada pela supervisão.
                  </p>
                </div>

                <Link href="/dashboard/configuracoes" onClick={() => setDropdownAberto(null)} className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  Minhas configurações
                </Link>
                <button type="button" onClick={sair} className="rounded-xl border border-red-100 px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50">
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div onClick={(event) => event.stopPropagation()}>{children}</div>
        <NotificacoesPopup onCountChange={setTotalNotificacoes} />
      </div>
    </div>
  );
}
