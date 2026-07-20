"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Filter,
  MapPin,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  Store,
  UserRound,
  X,
} from "lucide-react";

export type AgendaItem = {
  id: string;
  leadId: string;
  titulo: string;
  cliente: string;
  telefone: string;
  whatsapp: string;
  tipo: string;
  inicio: string;
  fim: string | null;
  status: string;
  observacao: string;
  veiculo: string;
  vendedorC2S: string;
  lojaCarteira: string;
  lojaVisita: string;
  atendenteResgate: string;
  c2sSyncStatus: string;
  origem: string;
  etapa: string;
  temperatura: string;
};

type UsuarioShell = {
  id?: string;
  nome: string;
  email?: string | null;
  perfil: string;
  ativo?: boolean;
};

export type AgendaVisao = "dia" | "semana" | "mes" | "ano";
type AgendaTone = "blue" | "red" | "green" | "orange" | "purple" | "slate";

type ListaModal = {
  titulo: string;
  descricao: string;
  itens: AgendaItem[];
  tom: AgendaTone;
} | null;

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const diasSemanaCurtos = ["D", "S", "T", "Q", "Q", "S", "S"];
const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const statusFinalizados = new Set(["cancelado", "concluido", "realizado", "nao compareceu"]);

function chave(valor?: string | null) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizar(valor?: string | null) {
  const texto = chave(valor);
  if (!texto) return "Não informado";
  return texto.replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function inicioDoDia(data: Date) {
  const nova = new Date(data);
  nova.setHours(0, 0, 0, 0);
  return nova;
}

function fimDoDia(data: Date) {
  const nova = new Date(data);
  nova.setHours(23, 59, 59, 999);
  return nova;
}

function inicioDaSemana(data: Date) {
  const nova = inicioDoDia(data);
  nova.setDate(nova.getDate() - nova.getDay());
  return nova;
}

function fimDaSemana(data: Date) {
  const nova = inicioDaSemana(data);
  nova.setDate(nova.getDate() + 6);
  nova.setHours(23, 59, 59, 999);
  return nova;
}

function inicioDoMes(data: Date) {
  const nova = new Date(data.getFullYear(), data.getMonth(), 1);
  nova.setHours(0, 0, 0, 0);
  return nova;
}

function fimDoMes(data: Date) {
  const nova = new Date(data.getFullYear(), data.getMonth() + 1, 0);
  nova.setHours(23, 59, 59, 999);
  return nova;
}

function mesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatarData(valor: string | Date) {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

function formatarDataCurta(valor: string | Date) {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(data);
}

function formatarDiaCompleto(valor: string | Date) {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  const texto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarMesAno(data: Date) {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarHora(valor: string | null) {
  if (!valor) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function dentroPeriodo(item: AgendaItem, inicio: Date, fim: Date) {
  const data = new Date(item.inicio);
  return data >= inicio && data <= fim;
}

function gerarDiasDoMes(data: Date) {
  const primeiro = inicioDoMes(data);
  const ultimo = fimDoMes(data);
  const inicioGrade = new Date(primeiro);
  inicioGrade.setDate(inicioGrade.getDate() - inicioGrade.getDay());
  const fimGrade = new Date(ultimo);
  fimGrade.setDate(fimGrade.getDate() + (6 - fimGrade.getDay()));

  const dias: Date[] = [];
  const cursor = new Date(inicioGrade);
  while (cursor <= fimGrade) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function navegar(data: Date, visao: AgendaVisao, direcao: -1 | 1) {
  const nova = new Date(data);
  if (visao === "dia") nova.setDate(nova.getDate() + direcao);
  if (visao === "semana") nova.setDate(nova.getDate() + direcao * 7);
  if (visao === "mes") nova.setMonth(nova.getMonth() + direcao);
  if (visao === "ano") nova.setFullYear(nova.getFullYear() + direcao);
  return nova;
}

function periodoTitulo(data: Date, visao: AgendaVisao) {
  if (visao === "dia") return formatarDiaCompleto(data);
  if (visao === "semana") {
    return `${formatarDataCurta(inicioDaSemana(data))} — ${formatarData(fimDaSemana(data))}`;
  }
  if (visao === "mes") return formatarMesAno(data);
  return String(data.getFullYear());
}

function getPeriodo(data: Date, visao: AgendaVisao) {
  if (visao === "dia") return { inicio: inicioDoDia(data), fim: fimDoDia(data) };
  if (visao === "semana") return { inicio: inicioDaSemana(data), fim: fimDaSemana(data) };
  if (visao === "mes") return { inicio: inicioDoMes(data), fim: fimDoMes(data) };
  return {
    inicio: new Date(data.getFullYear(), 0, 1),
    fim: new Date(data.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

function getWhatsapp(item: AgendaItem) {
  if (!item.whatsapp) return "";
  return item.whatsapp.startsWith("55") ? item.whatsapp : `55${item.whatsapp}`;
}

function responsavelDoItem(item: AgendaItem) {
  return item.vendedorC2S || item.atendenteResgate || "Responsável não definido";
}

function lojaDoItem(item: AgendaItem) {
  return item.lojaVisita || item.lojaCarteira || "Loja não definida";
}

function statusTom(status: string): AgendaTone {
  const valor = chave(status);
  if (["concluido", "realizado"].includes(valor)) return "green";
  if (valor === "confirmado") return "blue";
  if (["cancelado", "nao compareceu"].includes(valor)) return "red";
  if (valor === "remarcado") return "orange";
  return "purple";
}

function tipoTom(tipo: string): AgendaTone {
  const valor = chave(tipo);
  if (valor.includes("visita") || valor.includes("test")) return "green";
  if (valor.includes("retorno")) return "purple";
  if (valor.includes("lig") || valor.includes("contato")) return "blue";
  if (valor.includes("entrega")) return "orange";
  return "slate";
}

function estaFinalizado(item: AgendaItem) {
  return statusFinalizados.has(chave(item.status));
}

function ItemPill({ children, tom }: { children: ReactNode; tom: AgendaTone }) {
  return <span className={`fs-agenda-pill is-${tom}`}>{children}</span>;
}

function MiniCalendario({
  dataBase,
  itens,
  agora,
  onSelect,
  onNavigate,
}: {
  dataBase: Date;
  itens: AgendaItem[];
  agora: Date;
  onSelect: (data: Date) => void;
  onNavigate: (direcao: -1 | 1) => void;
}) {
  const dias = gerarDiasDoMes(dataBase);

  return (
    <section className="fs-agenda-mini">
      <header>
        <strong>{formatarMesAno(dataBase)}</strong>
        <div>
          <button type="button" aria-label="Mês anterior" onClick={() => onNavigate(-1)}>
            <ChevronLeft size={15} />
          </button>
          <button type="button" aria-label="Próximo mês" onClick={() => onNavigate(1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      </header>
      <div className="fs-agenda-mini__weekdays">
        {diasSemanaCurtos.map((dia, index) => (
          <span key={`${dia}-${index}`}>{dia}</span>
        ))}
      </div>
      <div className="fs-agenda-mini__grid">
        {dias.map((dia) => {
          const quantidade = itens.filter((item) => mesmoDia(new Date(item.inicio), dia)).length;
          const foraMes = dia.getMonth() !== dataBase.getMonth();
          const selecionado = mesmoDia(dia, dataBase);
          const hoje = mesmoDia(dia, agora);
          return (
            <button
              key={dia.toISOString()}
              type="button"
              className={`${foraMes ? "is-muted" : ""} ${selecionado ? "is-selected" : ""} ${hoje ? "is-today" : ""}`}
              onClick={() => onSelect(dia)}
              aria-label={`${formatarData(dia)}${quantidade ? `, ${quantidade} compromissos` : ""}`}
            >
              <span>{dia.getDate()}</span>
              {quantidade ? <i aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SidebarSummaryButton({
  label,
  description,
  value,
  tone,
  icon,
  onClick,
}: {
  label: string;
  description: string;
  value: number;
  tone: AgendaTone;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`fs-agenda-summary-row is-${tone}`} onClick={onClick}>
      <span className="fs-agenda-summary-row__icon">{icon}</span>
      <span className="fs-agenda-summary-row__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <b>{value}</b>
      <ChevronRight size={14} />
    </button>
  );
}

function MonthEventChip({ item, onOpen }: { item: AgendaItem; onOpen: (item: AgendaItem) => void }) {
  return (
    <button
      type="button"
      className={`fs-agenda-month-event is-${statusTom(item.status)}`}
      onClick={() => onOpen(item)}
      title={`${formatarHora(item.inicio)} · ${item.cliente} · ${item.titulo}`}
    >
      <span>
        <time>{formatarHora(item.inicio)}</time>
        <strong>{item.cliente}</strong>
      </span>
      <small>{item.veiculo || item.titulo}</small>
    </button>
  );
}

function AgendaEventRow({
  item,
  compacto = false,
  onOpen,
}: {
  item: AgendaItem;
  compacto?: boolean;
  onOpen: (item: AgendaItem) => void;
}) {
  const whatsapp = getWhatsapp(item);

  return (
    <article
      className={`fs-agenda-event-row is-${statusTom(item.status)} ${compacto ? "is-compact" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(item);
      }}
    >
      <div className="fs-agenda-event-row__time">
        <strong>{formatarHora(item.inicio)}</strong>
        {item.fim ? <span>{formatarHora(item.fim)}</span> : null}
      </div>
      <div className="fs-agenda-event-row__content">
        <div className="fs-agenda-event-row__top">
          <strong>{item.cliente}</strong>
          <div>
            <ItemPill tom={statusTom(item.status)}>{normalizar(item.status)}</ItemPill>
            {!compacto ? <ItemPill tom={tipoTom(item.tipo)}>{normalizar(item.tipo)}</ItemPill> : null}
          </div>
        </div>
        <span>{item.titulo}</span>
        {!compacto ? (
          <div className="fs-agenda-event-row__meta">
            <small><MapPin size={12} /> {lojaDoItem(item)}</small>
            <small><UserRound size={12} /> {responsavelDoItem(item)}</small>
            {item.veiculo ? <small><CircleDot size={12} /> {item.veiculo}</small> : null}
          </div>
        ) : null}
      </div>
      {!compacto ? (
        <div className="fs-agenda-event-row__actions" onClick={(event) => event.stopPropagation()}>
          {item.telefone ? (
            <a href={`tel:${item.telefone}`} aria-label={`Ligar para ${item.cliente}`}>
              <Phone size={15} />
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir WhatsApp de ${item.cliente}`}
            >
              <MessageCircle size={15} />
            </a>
          ) : null}
          <button type="button" onClick={() => onOpen(item)} aria-label="Ver detalhes">
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </article>
  );
}

function EmptyAgenda({ mensagem }: { mensagem: string }) {
  return (
    <div className="fs-agenda-empty">
      <span><CalendarCheck2 size={23} /></span>
      <strong>Agenda livre</strong>
      <p>{mensagem}</p>
    </div>
  );
}

function AgendaDetailDrawer({ item, onClose }: { item: AgendaItem | null; onClose: () => void }) {
  if (!item) return null;
  const whatsapp = getWhatsapp(item);

  return (
    <div className="fs-agenda-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="fs-agenda-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de ${item.cliente}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="fs-agenda-drawer__header">
          <div>
            <span className="fs-agenda-eyebrow">Compromisso comercial</span>
            <h2>{item.cliente}</h2>
            <p>{formatarDiaCompleto(item.inicio)} às {formatarHora(item.inicio)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="fs-agenda-drawer__status">
          <ItemPill tom={statusTom(item.status)}>{normalizar(item.status)}</ItemPill>
          <ItemPill tom={tipoTom(item.tipo)}>{normalizar(item.tipo)}</ItemPill>
          <ItemPill tom={chave(item.c2sSyncStatus) === "pendente" ? "orange" : "green"}>
            C2S {normalizar(item.c2sSyncStatus)}
          </ItemPill>
        </div>

        <section className="fs-agenda-drawer__hero">
          <span><Clock3 size={16} /></span>
          <div>
            <small>Horário reservado</small>
            <strong>
              {formatarHora(item.inicio)}{item.fim ? ` — ${formatarHora(item.fim)}` : ""}
            </strong>
          </div>
          <CheckCircle2 size={19} />
        </section>

        <section className="fs-agenda-drawer__section">
          <h3>Informações</h3>
          <div className="fs-agenda-info-list">
            <div><Phone size={15} /><span><small>Telefone</small><strong>{item.telefone || "Não informado"}</strong></span></div>
            <div><Store size={15} /><span><small>Loja da visita</small><strong>{lojaDoItem(item)}</strong></span></div>
            <div><UserRound size={15} /><span><small>Responsável</small><strong>{responsavelDoItem(item)}</strong></span></div>
            <div><CircleDot size={15} /><span><small>Veículo</small><strong>{item.veiculo || "Não informado"}</strong></span></div>
          </div>
        </section>

        <section className="fs-agenda-drawer__section">
          <h3>Contexto</h3>
          <div className="fs-agenda-note">
            <strong>{item.titulo}</strong>
            <p>{item.observacao || "Nenhuma observação registrada."}</p>
          </div>
        </section>

        <footer className="fs-agenda-drawer__actions">
          <div>
            {item.telefone ? <a href={`tel:${item.telefone}`}><Phone size={16} /> Ligar</a> : null}
            {whatsapp ? (
              <a className="is-whatsapp" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                <MessageCircle size={16} /> WhatsApp
              </a>
            ) : null}
          </div>
          <Link href={`/dashboard/leads/${item.leadId}`}>
            Abrir atendimento <ArrowUpRight size={16} />
          </Link>
        </footer>
      </aside>
    </div>
  );
}

function AgendaListModal({
  lista,
  onClose,
  onOpenItem,
}: {
  lista: ListaModal;
  onClose: () => void;
  onOpenItem: (item: AgendaItem) => void;
}) {
  if (!lista) return null;

  return (
    <div className="fs-agenda-overlay is-centered" role="presentation" onMouseDown={onClose}>
      <section
        className="fs-agenda-list-modal"
        role="dialog"
        aria-modal="true"
        aria-label={lista.titulo}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className={`fs-agenda-eyebrow is-${lista.tom}`}>Visão rápida</span>
            <h2>{lista.titulo}</h2>
            <p>{lista.descricao}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </header>
        <div className="fs-agenda-list-modal__body">
          {lista.itens.length ? (
            lista.itens.map((item) => (
              <AgendaEventRow key={item.id} item={item} onOpen={onOpenItem} />
            ))
          ) : (
            <EmptyAgenda mensagem="Nenhum compromisso encontrado nesta seleção." />
          )}
        </div>
      </section>
    </div>
  );
}

function PrintAgenda({
  usuario,
  titulo,
  itens,
}: {
  usuario: UsuarioShell;
  titulo: string;
  itens: AgendaItem[];
}) {
  return (
    <section id="agenda-print-area" className="fs-agenda-print">
      <header>
        <div>
          <span>Flow Sales CRM</span>
          <h1>Agenda operacional</h1>
          <p>{titulo}</p>
        </div>
        <div>
          <strong>{usuario.nome}</strong>
          <small>{formatarData(new Date())}</small>
        </div>
      </header>
      <div>
        {itens.length ? (
          itens.map((item) => (
            <article key={item.id}>
              <time>{formatarHora(item.inicio)}</time>
              <div>
                <h2>{item.cliente}</h2>
                <p>{item.titulo}</p>
                <small>
                  {item.telefone || "Sem telefone"} • {item.veiculo || "Sem veículo"} • {lojaDoItem(item)}
                </small>
              </div>
              <span>{normalizar(item.status)}</span>
            </article>
          ))
        ) : (
          <p>Nenhum agendamento encontrado.</p>
        )}
      </div>
    </section>
  );
}

export function AgendaCalendarioClient({
  usuario,
  itens,
  visaoInicial = "mes",
}: {
  usuario: UsuarioShell;
  itens: AgendaItem[];
  visaoInicial?: AgendaVisao;
}) {
  const [visao, setVisao] = useState<AgendaVisao>(visaoInicial);
  const [dataBase, setDataBase] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [lojaFiltro, setLojaFiltro] = useState("");
  const [responsavelFiltro, setResponsavelFiltro] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [itemAberto, setItemAberto] = useState<AgendaItem | null>(null);
  const [listaModal, setListaModal] = useState<ListaModal>(null);
  const [agora, setAgora] = useState(() => new Date());

  const periodo = useMemo(() => getPeriodo(dataBase, visao), [dataBase, visao]);

  useEffect(() => {
    const relogio = window.setInterval(() => setAgora(new Date()), 60_000);
    return () => window.clearInterval(relogio);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 980) setSidebarAberta(false);
  }, []);

  useEffect(() => {
    function fecharComEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setItemAberto(null);
        setListaModal(null);
      }
    }
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = itemAberto || listaModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [itemAberto, listaModal]);

  const itensOrdenados = useMemo(
    () => [...itens].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
    [itens],
  );

  const lojas = useMemo(
    () => Array.from(new Set(itensOrdenados.map(lojaDoItem).filter((valor) => valor !== "Loja não definida"))).sort(),
    [itensOrdenados],
  );

  const responsaveis = useMemo(
    () => Array.from(new Set(itensOrdenados.map(responsavelDoItem).filter((valor) => valor !== "Responsável não definido"))).sort(),
    [itensOrdenados],
  );

  const statusDisponiveis = useMemo(
    () => Array.from(new Set(itensOrdenados.map((item) => normalizar(item.status)))).sort(),
    [itensOrdenados],
  );

  const itensComFiltros = useMemo(() => {
    const termo = chave(busca);
    return itensOrdenados.filter((item) => {
      if (statusFiltro && normalizar(item.status) !== statusFiltro) return false;
      if (lojaFiltro && lojaDoItem(item) !== lojaFiltro) return false;
      if (responsavelFiltro && responsavelDoItem(item) !== responsavelFiltro) return false;
      if (!termo) return true;
      return chave([
        item.cliente,
        item.telefone,
        item.titulo,
        item.veiculo,
        item.vendedorC2S,
        item.lojaVisita,
        item.lojaCarteira,
        item.atendenteResgate,
        item.status,
        item.tipo,
      ].join(" ")).includes(termo);
    });
  }, [busca, itensOrdenados, lojaFiltro, responsavelFiltro, statusFiltro]);

  const itensFiltrados = useMemo(
    () => itensComFiltros.filter((item) => dentroPeriodo(item, periodo.inicio, periodo.fim)),
    [itensComFiltros, periodo.fim, periodo.inicio],
  );

  const atrasados = useMemo(
    () => itensComFiltros.filter((item) => new Date(item.inicio).getTime() < agora.getTime() && !estaFinalizado(item)),
    [agora, itensComFiltros],
  );

  const hojeItens = useMemo(
    () => itensComFiltros.filter((item) => mesmoDia(new Date(item.inicio), agora)),
    [agora, itensComFiltros],
  );

  const confirmados = useMemo(
    () => itensFiltrados.filter((item) => chave(item.status) === "confirmado"),
    [itensFiltrados],
  );

  const pendentesC2S = useMemo(
    () => itensFiltrados.filter((item) => chave(item.c2sSyncStatus || "pendente") === "pendente"),
    [itensFiltrados],
  );

  const proximos = useMemo(
    () => itensComFiltros.filter((item) => new Date(item.inicio).getTime() >= agora.getTime() && !estaFinalizado(item)),
    [agora, itensComFiltros],
  );

  const diasMes = useMemo(() => gerarDiasDoMes(dataBase), [dataBase]);
  const filtrosAtivos = [statusFiltro, lojaFiltro, responsavelFiltro].filter(Boolean).length;
  const perfilGestao = ["adm", "admin", "supervisor", "gerente", "suporte"].includes(chave(usuario.perfil));

  function mudarVisao(novaVisao: AgendaVisao) {
    setVisao(novaVisao);
    const query = novaVisao === "mes" ? "" : `?periodo=${novaVisao}`;
    window.history.replaceState({}, "", `/dashboard/agenda${query}`);
  }

  function abrirLista(
    titulo: string,
    descricao: string,
    itensLista: AgendaItem[],
    tom: AgendaTone,
  ) {
    setListaModal({ titulo, descricao, itens: itensLista, tom });
  }

  function abrirDia(data: Date) {
    setDataBase(new Date(data));
    mudarVisao("dia");
  }

  function limparFiltros() {
    setStatusFiltro("");
    setLojaFiltro("");
    setResponsavelFiltro("");
  }

  return (
    <main className="flow-premium-page fs-agenda-page">
      <PrintAgenda usuario={usuario} titulo={periodoTitulo(dataBase, visao)} itens={itensFiltrados} />

      <div className="fs-agenda-app">
        <header className="fs-agenda-appbar">
          <div className="fs-agenda-brand">
            <button
              type="button"
              className="fs-agenda-icon-button fs-agenda-sidebar-toggle"
              onClick={() => setSidebarAberta((atual) => !atual)}
              aria-label={sidebarAberta ? "Recolher painel lateral" : "Abrir painel lateral"}
            >
              {sidebarAberta ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <span className="fs-agenda-brand__icon"><CalendarDays size={20} /></span>
            <div>
              <h1>Agenda</h1>
              <p>Visitas, retornos e compromissos</p>
            </div>
          </div>

          <div className="fs-agenda-appbar__actions">
            <button type="button" className="fs-agenda-icon-button" onClick={() => window.print()} aria-label="Imprimir agenda" title="Imprimir">
              <Printer size={17} />
            </button>
            {perfilGestao ? (
              <Link className="fs-agenda-icon-button" href="/dashboard/configuracoes/agenda" aria-label="Configurações da agenda" title="Configurações">
                <Settings2 size={17} />
              </Link>
            ) : null}
            <Link className="fs-agenda-create-button" href="/dashboard/leads">
              <CalendarPlus2 size={17} />
              <span>Novo agendamento</span>
            </Link>
          </div>
        </header>

        <div className={`fs-agenda-workspace ${sidebarAberta ? "" : "is-sidebar-hidden"}`}>
          <aside className="fs-agenda-sidebar">
            <MiniCalendario
              dataBase={dataBase}
              itens={itensComFiltros}
              agora={agora}
              onSelect={(data) => {
                setDataBase(data);
                mudarVisao("dia");
              }}
              onNavigate={(direcao) => setDataBase((atual) => navegar(atual, "mes", direcao))}
            />

            <section className="fs-agenda-sidebar-section">
              <header>
                <span>Resumo operacional</span>
                <small>Atualizado agora</small>
              </header>
              <div className="fs-agenda-summary-list">
                <SidebarSummaryButton
                  label="Atrasados"
                  description="Precisam de ação"
                  value={atrasados.length}
                  tone="red"
                  icon={<AlertTriangle size={15} />}
                  onClick={() => abrirLista("Compromissos atrasados", "Itens vencidos que ainda exigem uma ação da equipe.", atrasados, "red")}
                />
                <SidebarSummaryButton
                  label="Hoje"
                  description="Agenda do dia"
                  value={hojeItens.length}
                  tone="blue"
                  icon={<Clock3 size={15} />}
                  onClick={() => abrirLista("Agenda de hoje", "Visitas, retornos e compromissos previstos para hoje.", hojeItens, "blue")}
                />
                <SidebarSummaryButton
                  label="Confirmados"
                  description="No período"
                  value={confirmados.length}
                  tone="green"
                  icon={<Check size={15} />}
                  onClick={() => abrirLista("Compromissos confirmados", "Clientes com presença confirmada no período atual.", confirmados, "green")}
                />
                <SidebarSummaryButton
                  label="C2S pendente"
                  description="Aguardam registro"
                  value={pendentesC2S.length}
                  tone="purple"
                  icon={<CircleDot size={15} />}
                  onClick={() => abrirLista("Pendências de sincronização", "Compromissos que ainda aguardam registro no C2S.", pendentesC2S, "purple")}
                />
              </div>
            </section>

            <section className="fs-agenda-sidebar-section fs-agenda-next-list">
              <header>
                <span>Próximos</span>
                <button
                  type="button"
                  onClick={() => abrirLista("Próximos compromissos", "A sequência futura da agenda comercial.", proximos, "slate")}
                >
                  Ver todos
                </button>
              </header>
              <div>
                {proximos.length ? proximos.slice(0, 4).map((item) => (
                  <button key={item.id} type="button" onClick={() => setItemAberto(item)}>
                    <time>{formatarHora(item.inicio)}</time>
                    <span>
                      <strong>{item.cliente}</strong>
                      <small>{formatarDataCurta(item.inicio)} · {lojaDoItem(item)}</small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                )) : <p>Nenhum compromisso futuro.</p>}
              </div>
            </section>
          </aside>

          <section className="fs-agenda-main">
            <div className="fs-agenda-calendar-toolbar">
              <div className="fs-agenda-navigation">
                <button type="button" className="is-today" onClick={() => setDataBase(new Date())}>Hoje</button>
                <div>
                  <button type="button" aria-label="Período anterior" onClick={() => setDataBase((atual) => navegar(atual, visao, -1))}>
                    <ChevronLeft size={17} />
                  </button>
                  <button type="button" aria-label="Próximo período" onClick={() => setDataBase((atual) => navegar(atual, visao, 1))}>
                    <ChevronRight size={17} />
                  </button>
                </div>
                <strong>{periodoTitulo(dataBase, visao)}</strong>
              </div>

              <div className="fs-agenda-segmented" aria-label="Visualização da agenda">
                {(["dia", "semana", "mes", "ano"] as AgendaVisao[]).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    className={visao === opcao ? "is-active" : ""}
                    onClick={() => mudarVisao(opcao)}
                  >
                    {opcao === "mes" ? "Mês" : normalizar(opcao)}
                  </button>
                ))}
              </div>

              <div className="fs-agenda-search-tools">
                <label>
                  <Search size={16} />
                  <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar na agenda" />
                  {busca ? <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca"><X size={14} /></button> : null}
                </label>
                <button
                  type="button"
                  className={filtrosAbertos || filtrosAtivos ? "is-active" : ""}
                  onClick={() => setFiltrosAbertos((atual) => !atual)}
                >
                  <Filter size={16} />
                  <span>Filtros</span>
                  {filtrosAtivos ? <b>{filtrosAtivos}</b> : null}
                </button>
              </div>
            </div>

            {filtrosAbertos ? (
              <div className="fs-agenda-filterbar">
                <label>
                  <span>Status</span>
                  <div><select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}><option value="">Todos os status</option>{statusDisponiveis.map((status) => <option key={status} value={status}>{status}</option>)}</select><ChevronDown size={14} /></div>
                </label>
                <label>
                  <span>Loja</span>
                  <div><select value={lojaFiltro} onChange={(event) => setLojaFiltro(event.target.value)}><option value="">Todas as lojas</option>{lojas.map((loja) => <option key={loja} value={loja}>{loja}</option>)}</select><ChevronDown size={14} /></div>
                </label>
                <label>
                  <span>Responsável</span>
                  <div><select value={responsavelFiltro} onChange={(event) => setResponsavelFiltro(event.target.value)}><option value="">Todos os responsáveis</option>{responsaveis.map((responsavel) => <option key={responsavel} value={responsavel}>{responsavel}</option>)}</select><ChevronDown size={14} /></div>
                </label>
                <button type="button" onClick={limparFiltros} disabled={!filtrosAtivos}><RotateCcw size={15} /> Limpar</button>
              </div>
            ) : null}

            <div className="fs-agenda-calendar-area">
              {visao === "dia" ? (
                <section className="fs-agenda-day-view">
                  <header className="fs-agenda-view-heading">
                    <div>
                      <span>{mesmoDia(dataBase, agora) ? "Hoje" : diasSemana[dataBase.getDay()]}</span>
                      <h2>{formatarDiaCompleto(dataBase)}</h2>
                    </div>
                    <strong>{itensFiltrados.length} compromisso{itensFiltrados.length === 1 ? "" : "s"}</strong>
                  </header>
                  <div className="fs-agenda-day-list">
                    {itensFiltrados.length ? itensFiltrados.map((item) => (
                      <AgendaEventRow key={item.id} item={item} onOpen={setItemAberto} />
                    )) : <EmptyAgenda mensagem="Nenhum compromisso encontrado para este dia." />}
                  </div>
                </section>
              ) : null}

              {visao === "semana" ? (
                <section className="fs-agenda-week-view">
                  <div className="fs-agenda-week-grid">
                    {Array.from({ length: 7 }).map((_, index) => {
                      const dia = inicioDaSemana(dataBase);
                      dia.setDate(dia.getDate() + index);
                      const doDia = itensFiltrados.filter((item) => mesmoDia(new Date(item.inicio), dia));
                      const atual = mesmoDia(dia, agora);
                      return (
                        <article key={dia.toISOString()} className={atual ? "is-today" : ""}>
                          <button type="button" className="fs-agenda-week-day" onClick={() => abrirDia(dia)}>
                            <span>{diasSemana[dia.getDay()]}</span>
                            <strong>{dia.getDate()}</strong>
                            <small>{doDia.length || "Livre"}</small>
                          </button>
                          <div className="fs-agenda-week-events">
                            {doDia.length ? doDia.map((item) => (
                              <button key={item.id} type="button" className={`is-${statusTom(item.status)}`} onClick={() => setItemAberto(item)}>
                                <time>{formatarHora(item.inicio)}</time>
                                <strong>{item.cliente}</strong>
                                <small>{item.veiculo || item.titulo}</small>
                              </button>
                            )) : <span className="fs-agenda-week-free"><CheckCircle2 size={15} /> Horário livre</span>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {visao === "mes" ? (
                <section className="fs-agenda-month-view">
                  <div className="fs-agenda-month-weekdays">
                    {diasSemana.map((dia) => <span key={dia}>{dia}</span>)}
                  </div>
                  <div className="fs-agenda-month-grid">
                    {diasMes.map((dia) => {
                      const doDia = itensFiltrados.filter((item) => mesmoDia(new Date(item.inicio), dia));
                      const foraMes = dia.getMonth() !== dataBase.getMonth();
                      const atual = mesmoDia(dia, agora);
                      const selecionado = mesmoDia(dia, dataBase);
                      return (
                        <article key={dia.toISOString()} className={`${foraMes ? "is-muted" : ""} ${atual ? "is-today" : ""} ${selecionado ? "is-selected" : ""}`}>
                          <button type="button" className="fs-agenda-month-day" onClick={() => abrirDia(dia)}>
                            <span>{diasSemana[dia.getDay()]}</span>
                            <strong>{dia.getDate()}</strong>
                            {doDia.length ? <small>{doDia.length}</small> : null}
                          </button>
                          <div className="fs-agenda-month-events">
                            {doDia.slice(0, 4).map((item) => <MonthEventChip key={item.id} item={item} onOpen={setItemAberto} />)}
                            {doDia.length > 4 ? (
                              <button type="button" className="fs-agenda-more-events" onClick={() => abrirLista(`${formatarDiaCompleto(dia)}`, `${doDia.length} compromissos neste dia.`, doDia, "slate")}>
                                +{doDia.length - 4} compromisso{doDia.length - 4 === 1 ? "" : "s"}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {visao === "ano" ? (
                <section className="fs-agenda-year-view">
                  <div className="fs-agenda-year-grid">
                    {meses.map((mes, index) => {
                      const mesData = new Date(dataBase.getFullYear(), index, 1);
                      const dias = gerarDiasDoMes(mesData);
                      const doMes = itensFiltrados.filter((item) => new Date(item.inicio).getMonth() === index);
                      return (
                        <article key={mes}>
                          <button type="button" className="fs-agenda-year-title" onClick={() => { setDataBase(mesData); mudarVisao("mes"); }}>
                            <strong>{mes}</strong>
                            <span>{doMes.length}</span>
                          </button>
                          <div className="fs-agenda-year-weekdays">{diasSemanaCurtos.map((dia, diaIndex) => <span key={`${mes}-${dia}-${diaIndex}`}>{dia}</span>)}</div>
                          <div className="fs-agenda-year-days">
                            {dias.map((dia) => {
                              const foraMes = dia.getMonth() !== index;
                              const doDia = doMes.filter((item) => mesmoDia(new Date(item.inicio), dia));
                              return (
                                <button
                                  key={dia.toISOString()}
                                  type="button"
                                  className={`${foraMes ? "is-muted" : ""} ${mesmoDia(dia, agora) ? "is-today" : ""} ${doDia.length ? "has-events" : ""}`}
                                  onClick={() => abrirDia(dia)}
                                  title={`${formatarData(dia)} · ${doDia.length} compromisso(s)`}
                                >
                                  {dia.getDate()}
                                </button>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <AgendaListModal
        lista={listaModal}
        onClose={() => setListaModal(null)}
        onOpenItem={(item) => {
          setListaModal(null);
          setItemAberto(item);
        }}
      />
      <AgendaDetailDrawer item={itemAberto} onClose={() => setItemAberto(null)} />
    </main>
  );
}
