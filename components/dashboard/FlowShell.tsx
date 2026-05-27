"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PhoneCall,
  Search,
  Settings,
  ShieldCheck,
  Store,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type UsuarioShell = {
  nome: string;
  email: string;
  perfil: string;
  ativo?: boolean;
  avatar_url?: string | null;
  status_operacional?: string | null;
  status_administrativo?: string | null;
};

type SubItem = {
  label: string;
  href: string;
  perfis?: string[];
};

type MenuItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  perfis?: string[];
  subitems: SubItem[];
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: BarChart3,
    href: "/dashboard",
    subitems: [
      { label: "Visão geral", href: "/dashboard" },
      { label: "Operacional", href: "/dashboard?visao=operacional" },
      { label: "Estratégico", href: "/dashboard?visao=estrategico", perfis: ["adm", "suporte", "gerente", "supervisor"] },
    ],
  },
  {
    label: "CRM de leads",
    icon: Users,
    href: "/dashboard/leads",
    subitems: [
      { label: "Leads ativos", href: "/dashboard/leads" },
      { label: "Novo lead", href: "/dashboard/leads?acao=novo", perfis: ["adm", "suporte", "gerente", "supervisor"] },
      { label: "Importar base", href: "/dashboard/c2s", perfis: ["adm", "suporte", "gerente", "supervisor"] },
      { label: "Arquivados", href: "/dashboard/leads?filtro=arquivados", perfis: ["adm", "suporte", "gerente", "supervisor"] },
    ],
  },
  {
    label: "Kanban",
    icon: WalletCards,
    href: "/dashboard/kanban",
    subitems: [
      { label: "Funil completo", href: "/dashboard/kanban" },
      { label: "Minhas oportunidades", href: "/dashboard/kanban?visao=minhas" },
      { label: "Vendas pendentes", href: "/dashboard/kanban?filtro=vendas-pendentes" },
    ],
  },
  {
    label: "Agenda",
    icon: CalendarDays,
    href: "/dashboard/agenda",
    subitems: [
      { label: "Hoje", href: "/dashboard/agenda" },
      { label: "Semana", href: "/dashboard/agenda?periodo=semana" },
      { label: "Mês", href: "/dashboard/agenda?periodo=mes" },
    ],
  },
  {
    label: "Controle 3CX",
    icon: PhoneCall,
    href: "/dashboard/3cx",
    subitems: [
      { label: "Ligações 3CX", href: "/dashboard/3cx" },
      { label: "Histórico", href: "/dashboard/3cx/historico" },
      { label: "Classificações", href: "/dashboard/3cx/classificacoes" },
      { label: "Monitor WhatsApp", href: "/dashboard/3cx/whatsapp" },
    ],
  },
  {
    label: "Campanhas",
    icon: Store,
    href: "/dashboard/campanhas",
    subitems: [
      { label: "Campanhas ativas", href: "/dashboard/campanhas" },
      { label: "Criar campanha", href: "/dashboard/campanhas?acao=nova", perfis: ["adm", "suporte", "gerente", "supervisor"] },
      { label: "Mensagens", href: "/dashboard/campanhas/mensagens" },
    ],
  },
  {
    label: "Simulador",
    icon: BarChart3,
    href: "/dashboard/simulador",
    subitems: [
      { label: "Nova simulação", href: "/dashboard/simulador" },
      { label: "Simulações salvas", href: "/dashboard/simulador?aba=salvas" },
    ],
  },
  {
    label: "Conferência",
    icon: ShieldCheck,
    href: "/dashboard/conferencia",
    subitems: [
      { label: "Veículos", href: "/dashboard/conferencia" },
      { label: "Divergências", href: "/dashboard/conferencia/divergencias" },
      { label: "Aceitos", href: "/dashboard/conferencia?filtro=aceitos" },
    ],
  },
  {
    label: "Relatórios",
    icon: Car,
    href: "/dashboard/relatorios",
    perfis: ["adm", "suporte", "gerente", "supervisor"],
    subitems: [
      { label: "Geral", href: "/dashboard/relatorios" },
      { label: "Equipe", href: "/dashboard/relatorios?aba=equipe" },
      { label: "Unidades", href: "/dashboard/relatorios?aba=unidades" },
    ],
  },
  {
    label: "Usuários",
    icon: UserCog,
    href: "/dashboard/usuarios",
    perfis: ["adm", "suporte", "gerente", "supervisor"],
    subitems: [
      { label: "Todos os usuários", href: "/dashboard/usuarios" },
      { label: "Perfis e acessos", href: "/dashboard/usuarios/permissoes" },
      { label: "Status da equipe", href: "/dashboard/usuarios?aba=status" },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    href: "/dashboard/configuracoes",
    perfis: ["adm", "suporte"],
    subitems: [
      { label: "Sistema", href: "/dashboard/configuracoes" },
      { label: "Tema", href: "/dashboard/configuracoes?aba=tema" },
      { label: "Integrações", href: "/dashboard/configuracoes?aba=integracoes" },
    ],
  },
];

function podeVer(perfil: string, perfis?: string[]) {
  if (!perfis || perfis.length === 0) return true;
  return perfis.includes(perfil);
}

function hrefAtivo(pathname: string, href: string) {
  const base = href.split("?")[0];

  if (base === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (base === "/dashboard/3cx") {
    return pathname === "/dashboard/3cx";
  }

  return pathname === base || pathname.startsWith(`${base}/`);
}

function statusConfig(usuario: UsuarioShell) {
  if (usuario.status_administrativo && usuario.status_administrativo !== "disponivel") {
    const map: Record<string, { label: string; color: string }> = {
      ferias: { label: "Férias", color: "bg-orange-500" },
      atestado: { label: "Atestado", color: "bg-orange-500" },
      feedback: { label: "Feedback", color: "bg-orange-500" },
      ausente_administrativo: { label: "Ausente", color: "bg-slate-300" },
      bloqueado: { label: "Bloqueado", color: "bg-red-600" },
    };

    return map[usuario.status_administrativo] || { label: "Ausente", color: "bg-slate-300" };
  }

  const map: Record<string, { label: string; color: string }> = {
    disponivel: { label: "Disponível", color: "bg-emerald-500" },
    em_ligacao: { label: "Ocupado", color: "bg-red-600" },
    em_atendimento: { label: "Em atendimento", color: "bg-blue-600" },
    ausente: { label: "Ausente", color: "bg-orange-500" },
    offline: { label: "Offline", color: "bg-slate-300" },
  };

  return map[usuario.status_operacional || "disponivel"] || map.disponivel;
}

export function FlowShell({
  children,
  usuario,
}: {
  children: React.ReactNode;
  usuario: UsuarioShell;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const menuContentRef = useRef<HTMLDivElement | null>(null);

  const [menuAberto, setMenuAberto] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState<"notificacoes" | "avatar" | "usuarios" | null>(null);

  const status = statusConfig(usuario);

  const itensVisiveis = menuItems
    .filter((item) => podeVer(usuario.perfil, item.perfis))
    .map((item) => ({
      ...item,
      subitems: item.subitems.filter((subitem) => podeVer(usuario.perfil, subitem.perfis)),
    }));

  function fecharMenu() {
    setMenuAberto(false);
    setOpenMenus([]);
  }

  function toggleMenu(label: string) {
    setMenuAberto(true);
    setOpenMenus((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
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

  function pesquisar() {
    const termo = buscaGlobal.trim();

    if (!termo) {
      router.push("/dashboard/leads");
      return;
    }

    router.push(`/dashboard/leads?busca=${encodeURIComponent(termo)}`);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
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

          <nav
            ref={menuContentRef}
            onMouseMove={handleMenuAutoScroll}
            className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="space-y-1.5">
              {itensVisiveis.map((item) => {
                const Icon = item.icon;
                const isActive = item.subitems.some((sub) => hrefAtivo(pathname, sub.href)) || hrefAtivo(pathname, item.href);
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
                      {menuAberto ? (
                        isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : null}
                    </button>

                    {menuAberto && isOpen ? (
                      <div className="ml-6 mt-1 space-y-1 border-l border-slate-200 pl-3">
                        {item.subitems.map((subitem) => {
                          const childAtivo = hrefAtivo(pathname, subitem.href);

                          return (
                            <Link
                              key={subitem.href}
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

      <div className={`min-h-screen transition-all duration-300 ${menuAberto ? "lg:pl-[250px]" : "lg:pl-[76px]"}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-[76px] items-center gap-4 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
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
                      pesquisar();
                    }
                  }}
                  placeholder="Buscar por leads, clientes, veículos, agendamentos..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            {podeVer(usuario.perfil, ["adm", "suporte", "gerente", "supervisor"]) ? (
              <button
                type="button"
                onClick={() => setDropdownAberto((atual) => atual === "usuarios" ? null : "usuarios")}
                className="hidden h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:flex"
              >
                <UserCog className="h-4 w-4" />
                Usuários
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setDropdownAberto((atual) => atual === "notificacoes" ? null : "notificacoes")}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                12
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDropdownAberto((atual) => atual === "avatar" ? null : "avatar")}
              className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-slate-100"
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {usuario.nome.slice(0, 1).toUpperCase()}
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${status.color}`} title={status.label} />
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
          <div className="fixed right-6 top-[72px] z-50 w-[340px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
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
                <Link href="/dashboard/3cx/whatsapp" className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">
                  Monitor WhatsApp
                </Link>
                <Link href="/dashboard/leads?filtro=sem-contato" className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">
                  Leads sem contato
                </Link>
              </div>
            ) : null}

            {dropdownAberto === "usuarios" ? (
              <div className="grid gap-2">
                <Link href="/dashboard/usuarios" className="rounded-xl border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  Todos os usuários
                </Link>
                <Link href="/dashboard/usuarios/permissoes" className="rounded-xl border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  Perfis e acessos
                </Link>
              </div>
            ) : null}

            {dropdownAberto === "avatar" ? (
              <div className="grid gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <strong className="block text-slate-950">{usuario.nome}</strong>
                  <span>{status.label}</span>
                </div>
                <Link href="/dashboard/usuarios?aba=perfil" className="rounded-xl border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                  Meu perfil
                </Link>
                <button type="button" onClick={sair} className="rounded-xl border border-red-100 px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50">
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <main className="px-4 py-5 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
