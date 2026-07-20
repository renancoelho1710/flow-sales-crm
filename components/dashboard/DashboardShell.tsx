"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// import { NotificacoesPopup } from "@/components/dashboard/NotificacoesPopup";
import {
  BadgeDollarSign,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  PhoneCall,
  Search,
  Settings,
  UserCog,
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
    global?: ConfigItem[];
    perfil?: ConfigItem[];
    usuario?: ConfigItem[];
  };
};

type SubItem = {
  label: string;
  tab: string;
  href: string;
  perfis?: string[];
  children?: SubItem[];
};

type MenuSection = "rotina" | "gestao" | "sistema";

type MenuItem = {
  secao: MenuSection;
  label: string;
  icon: React.ElementType;
  tab: string;
  href: string;
  perfis?: string[];
  subitems: SubItem[];
};

const perfisGestao = ["adm", "admin", "suporte", "gerente", "supervisor"];
const perfisAdministracao = [
  "adm",
  "admin",
  "suporte",
  "gerente",
  "supervisor",
];

const menuSectionLabels: Record<MenuSection, string> = {
  rotina: "Trabalho",
  gestao: "Gestão",
  sistema: "Sistema",
};

const menuItems: MenuItem[] = [
  {
    secao: "rotina",
    label: "Hoje",
    icon: LayoutDashboard,
    tab: "dashboard-geral",
    href: "/dashboard",
    subitems: [],
  },
  {
    secao: "rotina",
    label: "Atendimento",
    icon: Headset,
    tab: "leads-ativos",
    href: "/dashboard/leads",
    subitems: [
      { label: "Fila de atendimento", tab: "leads-ativos", href: "/dashboard/leads" },
      {
        label: "Prioridades do dia",
        tab: "leads-tarefas",
        href: "/dashboard/leads/tarefas",
      },
      {
        label: "Funil de atendimento",
        tab: "kanban-funil",
        href: "/dashboard/kanban",
      },
      {
        label: "Conversas WhatsApp",
        tab: "whatsapp-3cx",
        href: "/dashboard/3cx/whatsapp",
      },
      {
        label: "Indicar cliente",
        tab: "novo-lead",
        href: "/dashboard/leads/novo",
      },
      {
        label: "Aprovar solicitações",
        tab: "solicitacoes-leads",
        href: "/dashboard/leads/solicitacoes",
        perfis: perfisGestao,
      },
      {
        label: "Sincronizar C2S",
        tab: "importar-base",
        href: "/dashboard/c2s",
        perfis: perfisGestao,
      },
      {
        label: "Arquivados",
        tab: "leads-arquivados",
        href: "/dashboard/leads?filtro=arquivados",
        perfis: perfisGestao,
      },
    ],
  },
  {
    secao: "rotina",
    label: "Agenda",
    icon: CalendarDays,
    tab: "agenda-hoje",
    href: "/dashboard/agenda",
    subitems: [
      { label: "Hoje", tab: "agenda-hoje", href: "/dashboard/agenda" },
      {
        label: "Semana",
        tab: "agenda-semana",
        href: "/dashboard/agenda?periodo=semana",
      },
      {
        label: "Mês",
        tab: "agenda-mes",
        href: "/dashboard/agenda?periodo=mes",
      },
    ],
  },
  {
    secao: "gestao",
    label: "Comunicação",
    icon: PhoneCall,
    tab: "controle-3cx",
    href: "/dashboard/3cx",
    perfis: perfisGestao,
    subitems: [
      { label: "Equipe agora", tab: "controle-3cx", href: "/dashboard/3cx" },
      {
        label: "Ligações",
        tab: "ligacoes-3cx",
        href: "/dashboard/3cx?aba=ligacoes",
      },
      {
        label: "Histórico",
        tab: "historico-3cx",
        href: "/dashboard/3cx/historico",
      },
      {
        label: "Classificações",
        tab: "classificacoes-3cx",
        href: "/dashboard/3cx/classificacoes",
      },
    ],
  },
  {
    secao: "gestao",
    label: "Resultados",
    icon: BadgeDollarSign,
    tab: "vendas",
    href: "/dashboard/vendas",
    subitems: [
      {
        label: "Acompanhar vendas",
        tab: "vendas",
        href: "/dashboard/vendas",
      },
      {
        label: "Status de vendas",
        tab: "vendas-status",
        href: "/dashboard/vendas/status",
      },
      {
        label: "Vendas pendentes",
        tab: "vendas-pendentes",
        href: "/dashboard/vendas/pendentes",
      },
      {
        label: "Relatórios",
        tab: "relatorios",
        href: "/dashboard/relatorios",
        perfis: perfisGestao,
      },
    ],
  },
  {
    secao: "gestao",
    label: "Equipe",
    icon: UserCog,
    tab: "usuarios",
    href: "/dashboard/usuarios",
    perfis: perfisGestao,
    subitems: [
      { label: "Pessoas", tab: "usuarios", href: "/dashboard/usuarios" },
      {
        label: "Status da equipe",
        tab: "usuarios-status",
        href: "/dashboard/usuarios?aba=status",
      },
      {
        label: "Distribuição de leads",
        tab: "distribuicao",
        href: "/dashboard/distribuicao",
      },
      {
        label: "Perfis e acessos",
        tab: "usuarios-perfis",
        href: "/dashboard/usuarios/permissoes",
      },
    ],
  },
  {
    secao: "sistema",
    label: "Administração",
    icon: Settings,
    tab: "configuracoes",
    href: "/dashboard/configuracoes",
    perfis: perfisAdministracao,
    subitems: [
      {
        label: "Sistema",
        tab: "configuracoes-sistema",
        href: "/dashboard/configuracoes",
        children: [
          {
            label: "Visão geral",
            tab: "configuracoes",
            href: "/dashboard/configuracoes",
          },
          {
            label: "Saúde do sistema",
            href: "/dashboard/sistema/saude",
            tab: "sistema-saude",
          },
          {
            label: "Aparência",
            tab: "configuracoes-tema",
            href: "/dashboard/configuracoes/tema",
          },
          {
            label: "Notificações",
            tab: "configuracoes-notificacoes",
            href: "/dashboard/configuracoes/notificacoes",
          },
          {
            label: "Auditoria",
            tab: "configuracoes-auditoria",
            href: "/dashboard/sistema/auditoria",
          },
        ],
      },
      {
        label: "Operação",
        tab: "configuracoes-operacao",
        href: "/dashboard/configuracoes/crm-leads",
        children: [
          {
            label: "CRM e leads",
            tab: "configuracoes-leads",
            href: "/dashboard/configuracoes/crm-leads",
          },
          {
            label: "Agenda",
            tab: "configuracoes-agenda",
            href: "/dashboard/configuracoes/agenda",
          },
          {
            label: "Funil",
            tab: "configuracoes-kanban",
            href: "/dashboard/configuracoes/kanban",
          },
          {
            label: "Status e pausas",
            tab: "configuracoes-operacao-pausas",
            href: "/dashboard/configuracoes/operacao-pausas",
            perfis: ["adm", "admin", "suporte"],
          },
        ],
      },
      {
        label: "Integrações",
        tab: "configuracoes-integracoes-grupo",
        href: "/dashboard/configuracoes/integracoes",
        children: [
          {
            label: "C2S, 3CX e WhatsApp",
            tab: "configuracoes-integracoes",
            href: "/dashboard/configuracoes/integracoes",
          },
          {
            label: "API",
            tab: "configuracoes-api",
            href: "/dashboard/configuracoes/api",
          },
        ],
      },
    ],
  },
];

function normalizarPerfil(perfil?: string | null) {
  return String(perfil || "")
    .trim()
    .toLowerCase();
}

function podeVer(perfil: string, perfis?: string[]) {
  if (!perfis || perfis.length === 0) return true;
  return perfis.includes(normalizarPerfil(perfil));
}

function hrefAtivo(pathname: string, href?: string | null) {
  const hrefSeguro = String(href || "").trim();

  if (!hrefSeguro) {
    return false;
  }

  const [baseHref] = hrefSeguro.split("?");

  if (!baseHref || baseHref === "/dashboard") {
    return pathname === baseHref;
  }

  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

function hrefSubitemAtivo(
  pathname: string,
  search: string,
  href?: string | null,
) {
  const hrefSeguro = String(href || "").trim();

  if (!hrefSeguro) {
    return false;
  }

  const [baseHref, queryString] = hrefSeguro.split("?");

  if (!baseHref) {
    return false;
  }

  if (pathname !== baseHref) {
    return false;
  }

  if (!queryString) {
    return true;
  }

  return search.includes(queryString);
}


type MenuPaginaAtual = {
  menuLabel: string;
  submenuLabel: string;
};

function localizarMenuDaPaginaAtual({
  itens,
  pathname,
  search,
  activeTab,
}: {
  itens: MenuItem[];
  pathname: string;
  search: string;
  activeTab?: string;
}): MenuPaginaAtual | null {
  for (const item of itens) {
    const itemDiretoAtivo =
      item.subitems.length === 0 &&
      (hrefAtivo(pathname, item.href) || activeTab === item.tab);

    if (itemDiretoAtivo) {
      return {
        menuLabel: item.label,
        submenuLabel: "",
      };
    }

    for (const subitem of item.subitems) {
      const filhos: SubItem[] = subitem.children ?? [];

      if (filhos.length > 0) {
        const filhoAtivo = filhos.some((child) => {
          return (
            hrefSubitemAtivo(pathname, search, child.href) ||
            activeTab === child.tab
          );
        });

        if (filhoAtivo) {
          return {
            menuLabel: item.label,
            submenuLabel: subitem.tab,
          };
        }

        continue;
      }

      const subitemAtivo =
        hrefSubitemAtivo(pathname, search, subitem.href) ||
        activeTab === subitem.tab;

      if (subitemAtivo) {
        return {
          menuLabel: item.label,
          submenuLabel: "",
        };
      }
    }

    if (activeTab === item.tab) {
      return {
        menuLabel: item.label,
        submenuLabel: "",
      };
    }
  }

  return null;
}

function buscarValor(
  configs: ConfigItem[] | undefined,
  chave: string,
  fallback: Record<string, any>,
) {
  return configs?.find((item) => item.chave === chave)?.valor || fallback;
}

function resolverTema(temaUsuario: string, temaGlobal: string) {
  const preferenciaUsuario = temaUsuario || "sistema";
  const preferenciaGlobal = temaGlobal || "claro";
  const temaBase =
    preferenciaUsuario === "sistema" ? preferenciaGlobal : preferenciaUsuario;
  const acompanhaSistema = [
    "sistema",
    "acompanhar_sistema",
    "acompanhar sistema",
  ].includes(String(temaBase).toLowerCase());

  if (acompanhaSistema && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "escuro"
      : "claro";
  }

  return temaBase === "escuro" ? "escuro" : "claro";
}

function aplicarTemaNoDocumento({
  tema,
  densidade,
  corPrincipal,
  fonte,
}: {
  tema: string;
  densidade: string;
  corPrincipal: string;
  fonte: string;
}) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.remove("flow-theme-claro", "flow-theme-escuro");
  root.classList.add(
    tema === "escuro" ? "flow-theme-escuro" : "flow-theme-claro",
  );

  root.classList.remove(
    "flow-density-compacta",
    "flow-density-confortavel",
    "flow-density-ampla",
  );
  root.classList.add(`flow-density-${densidade || "confortavel"}`);

  root.classList.remove(
    "flow-font-padrao",
    "flow-font-grande",
    "flow-font-compacta",
  );
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
  if (
    ["ocupado", "em_ligacao", "pausa_feedback", "pausa_almoco"].includes(valor)
  )
    return "bg-amber-500";
  if (["bloqueado", "offline"].includes(valor)) return "bg-red-500";

  return "bg-slate-300";
}

export function DashboardShell({
  usuario,
  activeTab,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const menuContentRef = useRef<HTMLDivElement | null>(null);
  const menuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [menuAberto, setMenuAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState<
    "notificacoes" | "avatar" | null
  >(null);
  const [totalNotificacoes, setTotalNotificacoes] = useState(0);
  const [statusOperacional, setStatusOperacional] = useState(
    usuario.status_operacional || "offline",
  );
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  const perfil = normalizarPerfil(usuario.perfil);
  const menuVisualAberto = menuAberto || menuMobileAberto;

  const itensVisiveis = useMemo<MenuItem[]>(() => {
    return menuItems
      .filter((item) => podeVer(perfil, item.perfis))
      .map((item) => ({
        ...item,
        subitems: item.subitems.filter((subitem) => {
          if (subitem.children?.length) {
            return subitem.children.some((child) =>
              podeVer(perfil, child.perfis),
            );
          }

          return podeVer(perfil, subitem.perfis);
        }),
      }));
  }, [perfil]);

  const menuDaPaginaAtual = useMemo<MenuPaginaAtual | null>(() => {
    return localizarMenuDaPaginaAtual({
      itens: itensVisiveis,
      pathname,
      search,
      activeTab,
    });
  }, [activeTab, itensVisiveis, pathname, search]);

  function cancelarFechamentoMenu() {
    if (!menuCloseTimerRef.current) return;
    clearTimeout(menuCloseTimerRef.current);
    menuCloseTimerRef.current = null;
  }

  function restaurarMenuDaPaginaAtual() {
    setOpenMenus(menuDaPaginaAtual ? [menuDaPaginaAtual.menuLabel] : []);
    setOpenSubmenus(
      menuDaPaginaAtual?.submenuLabel
        ? [menuDaPaginaAtual.submenuLabel]
        : [],
    );
  }

  function abrirMenuComFluidez() {
    cancelarFechamentoMenu();
    if (menuMobileAberto) return;

    restaurarMenuDaPaginaAtual();
    setMenuAberto(true);
  }

  function abrirMenuMobile() {
    restaurarMenuDaPaginaAtual();
    setMenuMobileAberto(true);
  }

  function alternarMenuDesktop() {
    if (menuAberto) {
      setMenuAberto(false);
      return;
    }

    restaurarMenuDaPaginaAtual();
    setMenuAberto(true);
  }

  function agendarFechamentoMenu() {
    if (menuMobileAberto) return;
    cancelarFechamentoMenu();
    menuCloseTimerRef.current = setTimeout(() => {
      setMenuAberto(false);
      menuCloseTimerRef.current = null;
    }, 180);
  }

  function fecharMenuMobile() {
    setMenuMobileAberto(false);
    setOpenSubmenus([]);
  }

  function toggleSubmenu(label: string) {
    setOpenSubmenus((atuais) => (atuais.includes(label) ? [] : [label]));
  }

  function toggleMenu(label: string) {
    if (!menuMobileAberto) {
      setMenuAberto(true);
    }

    setOpenMenus((atuais) => (atuais.includes(label) ? [] : [label]));
    setOpenSubmenus([]);
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
      const resposta = await fetch("/api/configuracoes", {
        method: "GET",
        cache: "no-store",
      });
      const dados = (await resposta
        .json()
        .catch(() => null)) as ConfiguracoesApi | null;
      if (!resposta.ok || !dados?.ok) return;

      const configuracoesGlobais = [
        ...(dados.configuracoes?.sistema || []),
        ...(dados.configuracoes?.global || []),
      ];

      const aparenciaGlobal = buscarValor(
        configuracoesGlobais,
        "aparencia_global",
        {
          tema_padrao: "claro",
          cor_principal: "blue",
          densidade: "confortavel",
          menu_padrao: "aberto",
          fonte: "padrao",
        },
      );

      const preferenciasUsuario = buscarValor(
        dados.configuracoes?.usuario,
        "preferencias_usuario",
        {
          tema: "sistema",
          densidade: "confortavel",
          som_ativo: true,
          volume: 100,
          menu_aberto: true,
        },
      );

      const temaFinal = resolverTema(
        String(preferenciasUsuario.tema || "sistema"),
        String(aparenciaGlobal.tema_padrao || "claro"),
      );
      const densidadeFinal = String(
        preferenciasUsuario.densidade ||
          aparenciaGlobal.densidade ||
          "confortavel",
      );
      const fonteFinal = String(aparenciaGlobal.fonte || "padrao");
      const corPrincipal = String(aparenciaGlobal.cor_principal || "blue");

      aplicarTemaNoDocumento({
        tema: temaFinal,
        densidade: densidadeFinal,
        corPrincipal,
        fonte: fonteFinal,
      });
      // O menu lateral permanece recolhido por padrão e expande ao receber o mouse.
      setMenuAberto(false);
    } catch {
      aplicarTemaNoDocumento({
        tema: "claro",
        densidade: "confortavel",
        corPrincipal: "blue",
        fonte: "padrao",
      });
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSearch(window.location.search.replace(/^\?/, ""));
    }
  }, [pathname]);

  useEffect(() => {
    if (!menuAberto && !menuMobileAberto) {
      setOpenMenus([]);
      setOpenSubmenus([]);
    }
  }, [menuAberto, menuMobileAberto]);

  useEffect(() => {
    return () => cancelarFechamentoMenu();
  }, []);

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
    if (!menuAberto && !menuMobileAberto) return;

    setOpenMenus(menuDaPaginaAtual ? [menuDaPaginaAtual.menuLabel] : []);
    setOpenSubmenus(
      menuDaPaginaAtual?.submenuLabel
        ? [menuDaPaginaAtual.submenuLabel]
        : [],
    );
  }, [menuDaPaginaAtual, menuAberto, menuMobileAberto]);

  async function carregarMeuStatus() {
    try {
      const resposta = await fetch("/api/usuarios/me/status", {
        method: "GET",
        cache: "no-store",
      });
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok || !json?.ok) return;
      setStatusOperacional(json.usuario?.status_operacional || "offline");
    } catch {
      // Mantém o status atual na tela.
    }
  }

  async function alterarMeuStatus(
    status: "disponivel" | "offline" | "ocupado",
  ) {
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
    <div className="flow-shell min-h-screen text-slate-950" data-flow-shell="gold-master">
      {menuMobileAberto ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={fecharMenuMobile}
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={abrirMenuComFluidez}
        onMouseLeave={agendarFechamentoMenu}
        className={`flow-ios-sidebar fixed inset-y-0 left-0 z-40 flex-col transition-[width,transform] duration-300 ${
          menuMobileAberto ? "flex translate-x-0" : "hidden -translate-x-full"
        } w-[304px] lg:flex lg:translate-x-0 ${menuAberto ? "lg:w-[286px]" : "lg:w-[82px]"}`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div
            className={`flow-nav-brand flex h-[76px] shrink-0 items-center px-4 ${
              menuVisualAberto ? "justify-between" : "justify-center"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (menuMobileAberto) {
                  fecharMenuMobile();
                }
                router.push("/dashboard");
              }}
              className={`flow-nav-brand-button flex min-w-0 items-center rounded-2xl transition ${
                menuVisualAberto ? "gap-3 px-2 py-2" : "p-2"
              }`}
              title="Ir para o Dashboard"
              aria-label="Ir para o Dashboard"
            >
              <Image
                src={menuVisualAberto ? "/logo-slogan.png" : "/logo.png"}
                alt="Flow Sales CRM"
                width={menuVisualAberto ? 158 : 36}
                height={menuVisualAberto ? 48 : 36}
                priority
                style={
                  menuVisualAberto
                    ? { width: "158px", height: "auto" }
                    : { width: "36px", height: "36px" }
                }
                className="app-shell-logo object-contain"
              />
            </button>

            {menuMobileAberto ? (
              <button
                type="button"
                onClick={fecharMenuMobile}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 lg:hidden"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <nav
            ref={menuContentRef}
            onMouseMove={handleMenuAutoScroll}
            className="min-h-0 flex-1 overflow-y-auto px-2.5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="space-y-4">
              {(["rotina", "gestao", "sistema"] as MenuSection[]).map(
                (secao) => {
                  const itensSecao = itensVisiveis.filter(
                    (item) => item.secao === secao,
                  );

                  if (itensSecao.length === 0) return null;

                  return (
                    <div key={secao} className="flow-nav-section">
                      {menuVisualAberto ? (
                        <div className="flow-nav-section-label">
                          <span className="flow-nav-section-dot" />
                          <span>{menuSectionLabels[secao]}</span>
                          <span className="flow-nav-section-line" />
                        </div>
                      ) : (
                        <div className="flow-nav-section-divider" />
                      )}

                      {itensSecao.map((item) => {
                        const Icon = item.icon;
                        const itemAtivoDireto =
                          item.subitems.length === 0 &&
                          hrefAtivo(pathname, item.href);
                        const isActive =
                          item.subitems.some((sub) => {
                            if (sub.children?.length) {
                              return sub.children.some(
                                (child) =>
                                  hrefSubitemAtivo(
                                    pathname,
                                    search,
                                    child.href,
                                  ) ||
                                  Boolean(activeTab && activeTab === child.tab),
                              );
                            }

                            return (
                              hrefSubitemAtivo(pathname, search, sub.href) ||
                              Boolean(activeTab && activeTab === sub.tab)
                            );
                          }) ||
                          activeTab === item.tab ||
                          itemAtivoDireto;
                        const isOpen = openMenus.includes(item.label);
                        const temSubitens = item.subitems.length > 0;

                        return (
                          <div
                            key={item.label}
                            className={`flow-nav-group ${
                              temSubitens && isOpen ? "is-open" : ""
                            } ${isActive ? "is-active" : ""}`}
                          >
                            <button
                              type="button"
                              aria-expanded={temSubitens ? isOpen : undefined}
                              onClick={() => {
                                if (!temSubitens) {
                                  router.push(item.href);
                                  fecharMenuMobile();
                                  return;
                                }
                                toggleMenu(item.label);
                              }}
                              className={`flow-nav-item group ${
                                isActive ? "is-active" : ""
                              } ${isOpen ? "is-open" : ""} ${
                                menuVisualAberto
                                  ? "is-expanded"
                                  : "is-collapsed"
                              }`}
                              title={item.label}
                            >
                              <span className="flow-nav-item-icon">
                                <Icon className="h-[18px] w-[18px]" />
                              </span>

                              {menuVisualAberto ? (
                                <span className="flow-nav-item-label">
                                  {item.label}
                                </span>
                              ) : null}

                              {menuVisualAberto && temSubitens ? (
                                <span className="flow-nav-item-chevron">
                                  {isOpen ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                </span>
                              ) : null}
                            </button>

                            {menuVisualAberto && temSubitens && isOpen ? (
                              <div className="flow-nav-children">
                                {item.subitems.map((subitem) => {
                                  if (subitem.children?.length) {
                                    const filhosVisiveis =
                                      subitem.children.filter((child) =>
                                        podeVer(perfil, child.perfis),
                                      );

                                    if (filhosVisiveis.length === 0)
                                      return null;

                                    const grupoAtivo = filhosVisiveis.some(
                                      (child) =>
                                        hrefSubitemAtivo(
                                          pathname,
                                          search,
                                          child.href,
                                        ) ||
                                        Boolean(
                                          activeTab && activeTab === child.tab,
                                        ),
                                    );
                                    const grupoAberto = openSubmenus.includes(
                                      subitem.tab,
                                    );

                                    return (
                                      <div
                                        key={subitem.tab}
                                        className={`flow-nav-subgroup ${
                                          grupoAberto ? "is-open" : ""
                                        } ${grupoAtivo ? "is-active" : ""}`}
                                      >
                                        <button
                                          type="button"
                                          aria-expanded={grupoAberto}
                                          onClick={() =>
                                            toggleSubmenu(subitem.tab)
                                          }
                                          className="flow-nav-subgroup-button"
                                        >
                                          <span className="flow-nav-child-marker" />
                                          <span className="min-w-0 flex-1 truncate">
                                            {subitem.label}
                                          </span>
                                          <span className="flow-nav-subgroup-chevron">
                                            {grupoAberto ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                          </span>
                                        </button>

                                        {grupoAberto ? (
                                          <div className="flow-nav-grandchildren">
                                            {filhosVisiveis.map((child) => {
                                              const childAtivo =
                                                hrefSubitemAtivo(
                                                  pathname,
                                                  search,
                                                  child.href,
                                                ) ||
                                                Boolean(
                                                  activeTab &&
                                                  activeTab === child.tab,
                                                );

                                              return (
                                                <Link
                                                  key={`${child.tab}-${child.href}`}
                                                  href={child.href}
                                                  onClick={fecharMenuMobile}
                                                  className={`flow-nav-grandchild ${
                                                    childAtivo
                                                      ? "is-active"
                                                      : ""
                                                  }`}
                                                >
                                                  <span className="flow-nav-grandchild-dot" />
                                                  <span className="min-w-0 flex-1 truncate">
                                                    {child.label}
                                                  </span>
                                                </Link>
                                              );
                                            })}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  const childAtivo =
                                    hrefSubitemAtivo(
                                      pathname,
                                      search,
                                      subitem.href,
                                    ) ||
                                    Boolean(
                                      activeTab && activeTab === subitem.tab,
                                    );

                                  return (
                                    <Link
                                      key={`${subitem.tab}-${subitem.href}`}
                                      href={subitem.href}
                                      onClick={fecharMenuMobile}
                                      className={`flow-nav-child ${
                                        childAtivo ? "is-active" : ""
                                      }`}
                                    >
                                      <span className="flow-nav-child-marker" />
                                      <span className="min-w-0 flex-1 truncate">
                                        {subitem.label}
                                      </span>
                                      <ChevronRight className="flow-nav-child-chevron h-3 w-3" />
                                    </Link>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                },
              )}
            </div>
          </nav>

          <div className="flow-nav-footer shrink-0 p-3">
            <button
              type="button"
              onClick={sair}
              className={`flow-nav-exit flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${
                menuVisualAberto ? "justify-start" : "justify-center"
              }`}
              title="Sair"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl">
                <LogOut className="h-[18px] w-[18px]" />
              </span>
              {menuVisualAberto ? <span>Sair</span> : null}
            </button>
          </div>
        </div>
      </aside>

      <div
        onClick={() => setDropdownAberto(null)}
        className={`flow-shell-content min-h-screen transition-[padding] duration-300 ${
          menuAberto ? "lg:pl-[286px]" : "lg:pl-[82px]"
        }`}
      >
        <header className="flow-ios-topbar sticky top-0 z-20 border-b border-white/80 bg-white/78 backdrop-blur-2xl">
          <div className="flex h-[70px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                abrirMenuMobile();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden min-w-0 flex-1 items-center lg:flex">
              <label className="relative w-full max-w-[580px]">
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
                  placeholder="Buscar cliente, telefone ou veículo..."
                  className="h-11 w-full rounded-2xl border border-slate-200/80 bg-slate-100/70 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:bg-slate-100 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100/70"
                />
              </label>
            </div>

            <button
              id="flow-notification-bell"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDropdownAberto((atual) =>
                  atual === "notificacoes" ? null : "notificacoes",
                );
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
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
                setDropdownAberto((atual) =>
                  atual === "avatar" ? null : "avatar",
                );
              }}
              className="flex items-center gap-3 rounded-2xl px-1.5 py-1 transition hover:bg-slate-100/80"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-bold text-white shadow-sm">
                {usuario.nome.slice(0, 1).toUpperCase()}
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${statusDotClass(statusOperacional)}`}
                  title={statusLabelTopo(statusOperacional)}
                />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-bold text-slate-900">
                  {usuario.nome}
                </p>
                <p className="text-xs text-slate-500">
                  {usuario.perfil} • {statusLabelTopo(statusOperacional)}
                </p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
          </div>
        </header>

        {dropdownAberto ? (
          <div
            className="fixed right-4 top-[76px] z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:right-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950">
                {dropdownAberto === "notificacoes"
                  ? "Notificações"
                  : "Minha conta"}
              </h3>
              <button
                type="button"
                onClick={() => setDropdownAberto(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {dropdownAberto === "notificacoes" ? (
              <div className="grid gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  <strong className="block text-slate-950">
                    {totalNotificacoes}
                  </strong>
                  <span>notificação(ões) operacional(is) pendente(s).</span>
                </div>
                <Link
                  href="/dashboard/agenda"
                  onClick={() => setDropdownAberto(null)}
                  className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Abrir agenda operacional
                </Link>
                <Link
                  href="/dashboard/leads/tarefas"
                  onClick={() => setDropdownAberto(null)}
                  className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                >
                  Abrir minhas tarefas
                </Link>
              </div>
            ) : null}

            {dropdownAberto === "avatar" ? (
              <div className="grid gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <strong className="block text-slate-950">
                    {usuario.nome}
                  </strong>
                  <span>{usuario.perfil}</span>
                  <div className="mt-2 flex items-center gap-2 text-xs font-black text-slate-700">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${statusDotClass(statusOperacional)}`}
                    />
                    {statusLabelTopo(statusOperacional)}
                  </div>
                </div>

                <div className="grid gap-2 rounded-xl border border-slate-100 p-2">
                  <p className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                    Meu status
                  </p>
                  <button
                    type="button"
                    disabled={
                      salvandoStatus || statusOperacional === "disponivel"
                    }
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
                    Ocupado e offline bloqueiam novos leads. Pausa almoço é
                    automática. Pausa feedback é aplicada pela supervisão.
                  </p>
                </div>

                <Link
                  href="/dashboard/configuracoes"
                  onClick={() => setDropdownAberto(null)}
                  className="rounded-xl border border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                >
                  Minhas configurações
                </Link>
                <button
                  type="button"
                  onClick={sair}
                  className="rounded-xl border border-red-100 px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <main className="flow-workspace" onClick={(event) => event.stopPropagation()}>{children}</main>
        {/* NotificacoesPopup desativado temporariamente para teste */}
      </div>
    </div>
  );
}
