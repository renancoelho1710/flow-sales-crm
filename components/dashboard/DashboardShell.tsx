"use client";
import type React from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Car,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  Headphones,
  LayoutDashboard,
  LogOut,
  Megaphone,
  PhoneCall,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type UsuarioShell = {
  nome: string;
  email: string;
  perfil: string;
  avatar_url?: string | null;
  status_operacional?: string | null;
  status_administrativo?: string | null;
};

type MenuChild = {
  id: string;
  label: string;
  href: string;
};

type MenuItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: MenuChild[];
};

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  {
    id: "crm",
    label: "CRM de leads",
    icon: Users,
    children: [
      { id: "leads", label: "Leads ativos", href: "/dashboard/leads" },
      { id: "kanban", label: "Kanban", href: "/dashboard/kanban" },
      { id: "distribuicao", label: "Distribuição", href: "/dashboard/distribuicao" },
      { id: "c2s", label: "Importação C2S", href: "/dashboard/c2s" },
    ],
  },
  {
    id: "3cx",
    label: "Controle 3CX",
    icon: PhoneCall,
    children: [
      { id: "monitor", label: "Ligações 3CX", href: "/dashboard/3cx" },
      { id: "classificacao", label: "Classificação", href: "/dashboard/3cx/classificacoes" },
      { id: "historico", label: "Histórico", href: "/dashboard/3cx/historico" },
      { id: "whatsapp", label: "Monitor WhatsApp", href: "/dashboard/3cx/whatsapp" },
    ],
  },
  {
    id: "agenda",
    label: "Agendamentos",
    icon: CalendarDays,
    children: [
      { id: "agenda-hoje", label: "Agenda de hoje", href: "/dashboard/agendamentos" },
      { id: "calendario", label: "Calendário", href: "/dashboard/agendamentos/calendario" },
    ],
  },
  {
    id: "campanhas",
    label: "Campanhas",
    icon: Megaphone,
    children: [
      { id: "campanhas-lista", label: "Campanhas", href: "/dashboard/campanhas" },
      { id: "mensagens", label: "Mensagens", href: "/dashboard/campanhas/mensagens" },
    ],
  },
  { id: "simulador", label: "Simulador", icon: WalletCards, href: "/dashboard/simulador" },
  {
    id: "conferencia",
    label: "Conferência",
    icon: Car,
    children: [
      { id: "veiculos", label: "Veículos", href: "/dashboard/conferencia" },
      { id: "divergencias", label: "Divergências", href: "/dashboard/conferencia/divergencias" },
    ],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    icon: FileBarChart,
    children: [
      { id: "operacional", label: "Operacional", href: "/dashboard/relatorios" },
      { id: "graficos", label: "Gráficos", href: "/dashboard/relatorios/graficos" },
    ],
  },
  {
    id: "usuarios",
    label: "Usuários",
    icon: ShieldCheck,
    children: [
      { id: "colaboradores", label: "Colaboradores", href: "/dashboard/usuarios" },
      { id: "permissoes", label: "Permissões", href: "/dashboard/usuarios/permissoes" },
    ],
  },
  { id: "configuracoes", label: "Configurações", icon: Settings, href: "/dashboard/configuracoes" },
];

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

  return map[usuario.status_operacional || "offline"] || map.offline;
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("") || "FS";
}


const lojas = ["Todas as lojas", "Loja 1", "Loja 2", "Loja 3", "Loja 4", "Premium"];

const notificacoes = [
  { titulo: "Leads sem contato", detalhe: "142 leads aguardam retorno há mais de 3 dias", href: "/dashboard/leads?filtro=sem-contato" },
  { titulo: "Propostas pendentes", detalhe: "27 propostas precisam de validação", href: "/dashboard/kanban?etapa=venda-pendente" },
  { titulo: "Agendamentos de hoje", detalhe: "28 compromissos previstos para hoje", href: "/dashboard/agenda" },
];

export function DashboardShell({ children, usuario }: { children: React.ReactNode; usuario: UsuarioShell }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [submenusAbertos, setSubmenusAbertos] = useState<Record<string, boolean>>({});
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [lojaSelecionada, setLojaSelecionada] = useState("Todas as lojas");
  const [lojasAbertas, setLojasAbertas] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const status = statusConfig(usuario);

  function fecharMenu() {
    setMenuAberto(false);
    setSubmenusAbertos({});
  }

  function hrefAtivo(href: string) {
  if (href === "/dashboard/3cx") {
    return pathname === "/dashboard/3cx";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemAtivo(item: MenuItem) {
    if (item.href && hrefAtivo(item.href)) return true;
    return Boolean(item.children?.some((child) => hrefAtivo(child.href)));
  }

  function alternarSubmenu(id: string) {
    setMenuAberto(true);
    setSubmenusAbertos((atual) => ({ ...atual, [id]: !atual[id] }));
  }

  function iniciarScrollMenu(direcao: "cima" | "baixo") {
    if (scrollTimerRef.current) window.clearInterval(scrollTimerRef.current);
    scrollTimerRef.current = window.setInterval(() => {
      scrollRef.current?.scrollBy({ top: direcao === "baixo" ? 12 : -12 });
    }, 16);
  }

  function pararScrollMenu() {
    if (scrollTimerRef.current) window.clearInterval(scrollTimerRef.current);
    scrollTimerRef.current = null;
  }

  function pesquisarGlobal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const termo = buscaGlobal.trim();

    if (!termo) {
      router.push("/dashboard/leads");
      return;
    }

    router.push(`/dashboard/leads?busca=${encodeURIComponent(termo)}`);
  }

  function escolherLoja(loja: string) {
    setLojaSelecionada(loja);
    setLojasAbertas(false);
    const parametro = loja === "Todas as lojas" ? "" : `?loja=${encodeURIComponent(loja)}`;
    router.push(`/dashboard/leads${parametro}`);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    function aoClicarFora(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) fecharMenu();
    }

    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  useEffect(() => {
    return () => pararScrollMenu();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <aside
        ref={menuRef}
        onMouseEnter={() => setMenuAberto(true)}
        onMouseLeave={fecharMenu}
        className={`fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white shadow-xl shadow-slate-200/60 transition-all duration-300 ${menuAberto ? "w-[282px]" : "w-[82px]"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[78px] items-center justify-center border-b border-slate-200 px-4">
            {menuAberto ? (
              <Image src="/logo-slogan.png" alt="Flow Sales CRM" width={184} height={58} priority className="h-auto w-[184px] object-contain" />
            ) : (
              <Image src="/logo.png" alt="Flow Sales CRM" width={42} height={42} priority className="h-[42px] w-[42px] object-contain" />
            )}
          </div>

          <div className="relative flex-1 overflow-hidden py-3">
            <div onMouseEnter={() => iniciarScrollMenu("cima")} onMouseLeave={pararScrollMenu} className="absolute left-0 top-0 z-10 h-8 w-full" />
            <div ref={scrollRef} className="h-full overflow-y-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <nav className="space-y-1 pb-8 pt-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const ativo = itemAtivo(item);
                  const temFilhos = Boolean(item.children?.length);
                  const aberto = Boolean(submenusAbertos[item.id]);

                  if (temFilhos) {
                    return (
                      <div key={item.id}>
                        <button
                          type="button"
                          onClick={() => alternarSubmenu(item.id)}
                          className={`flex h-11 w-full items-center rounded-xl px-3 text-sm font-semibold transition ${ativo ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"} ${menuAberto ? "justify-between" : "justify-center"}`}
                          title={!menuAberto ? item.label : undefined}
                        >
                          <span className={`flex items-center ${menuAberto ? "gap-3" : "gap-0"}`}>
                            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                            {menuAberto ? <span>{item.label}</span> : null}
                          </span>
                          {menuAberto ? <ChevronDown className={`h-4 w-4 transition ${aberto ? "rotate-180" : ""}`} /> : null}
                        </button>

                        {menuAberto && aberto ? (
                          <div className="ml-8 mt-1 space-y-1 border-l border-slate-200 pl-3">
                            {item.children?.map((child) => {
                              const childAtivo = hrefAtivo(child.href);
                              return (
                                <Link key={child.id} href={child.href} className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${childAtivo ? "bg-slate-100 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href || "#"}
                      className={`flex h-11 items-center rounded-xl px-3 text-sm font-semibold transition ${ativo ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"} ${menuAberto ? "justify-start gap-3" : "justify-center"}`}
                      title={!menuAberto ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                      {menuAberto ? <span>{item.label}</span> : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div onMouseEnter={() => iniciarScrollMenu("baixo")} onMouseLeave={pararScrollMenu} className="absolute bottom-0 left-0 z-10 h-10 w-full" />
          </div>

          <div className="border-t border-slate-200 p-3">
            <button
              type="button"
              onClick={sair}
              className={`flex h-11 w-full items-center rounded-xl text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700 ${menuAberto ? "justify-start gap-3 px-3" : "justify-center px-0"}`}
              title={!menuAberto ? "Sair" : undefined}
            >
              <LogOut className="h-5 w-5" strokeWidth={1.8} />
              {menuAberto ? <span>Sair</span> : null}
            </button>
          </div>
        </div>
      </aside>

      <section className={`min-h-screen transition-all duration-300 ${menuAberto ? "pl-[282px]" : "pl-[82px]"}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[78px] items-center justify-between gap-4 px-6 py-4">
            <form onSubmit={pesquisarGlobal} className="relative hidden w-full max-w-xl lg:block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={buscaGlobal}
                onChange={(event) => setBuscaGlobal(event.target.value)}
                placeholder="Buscar por leads, clientes, veículos, agendamentos..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </form>

            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => {
                    setLojasAbertas((valor) => !valor);
                    setNotificacoesAbertas(false);
                    setPerfilAberto(false);
                  }}
                  className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ClipboardList className="h-4 w-4" strokeWidth={1.8} />
                  {lojaSelecionada}
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {lojasAbertas ? (
                  <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/80">
                    {lojas.map((loja) => (
                      <button
                        key={loja}
                        type="button"
                        onClick={() => escolherLoja(loja)}
                        className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${lojaSelecionada === loja ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        {loja}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificacoesAbertas((valor) => !valor);
                    setLojasAbertas(false);
                    setPerfilAberto(false);
                  }}
                  className="relative h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  title="Notificações"
                >
                  <Bell className="mx-auto h-5 w-5" strokeWidth={1.8} />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">12</span>
                </button>

                {notificacoesAbertas ? (
                  <div className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-200/80">
                    <div className="mb-2 flex items-center justify-between px-2">
                      <strong className="text-sm text-slate-950">Notificações</strong>
                      <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">12</span>
                    </div>
                    <div className="space-y-2">
                      {notificacoes.map((item) => (
                        <button
                          key={item.titulo}
                          type="button"
                          onClick={() => {
                            setNotificacoesAbertas(false);
                            router.push(item.href);
                          }}
                          className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-left transition hover:border-blue-200 hover:bg-white"
                        >
                          <p className="text-sm font-bold text-slate-900">{item.titulo}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">{item.detalhe}</p>
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => router.push("/dashboard/relatorios")} className="mt-3 w-full rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-800">
                      Ver painel de alertas
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPerfilAberto((valor) => !valor);
                    setLojasAbertas(false);
                    setNotificacoesAbertas(false);
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-transparent bg-white px-2 py-1.5 transition hover:border-slate-200 hover:shadow-sm"
                  title={status.label}
                >
                  <div className="relative h-10 w-10">
                    {usuario.avatar_url ? (
                      <Image src={usuario.avatar_url} alt={usuario.nome} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{iniciais(usuario.nome)}</div>
                    )}
                    <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${status.color}`} />
                  </div>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-bold leading-4 text-slate-950">{usuario.nome}</p>
                    <p className="text-xs text-slate-500">{status.label}</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
                </button>

                {perfilAberto ? (
                  <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/80">
                    <div className="border-b border-slate-100 px-3 py-3">
                      <p className="text-sm font-bold text-slate-950">{usuario.nome}</p>
                      <p className="text-xs text-slate-500">{usuario.email}</p>
                    </div>
                    <button type="button" onClick={() => router.push("/dashboard/usuarios")} className="mt-2 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">Meu perfil / usuários</button>
                    <button type="button" onClick={() => router.push("/dashboard/configuracoes")} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">Configurações</button>
                    <button type="button" onClick={sair} className="mt-2 block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50">Sair</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
