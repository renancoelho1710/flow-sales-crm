"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Search,
  UserCheck,
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

type Visao = "dia" | "semana" | "mes" | "ano";

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const meses = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

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
  const dia = nova.getDay();
  nova.setDate(nova.getDate() - dia);
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

function formatarHora(valor: string | null) {
  if (!valor) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function normalizar(valor?: string | null) {
  if (!valor) return "Não informado";
  return valor
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function statusClasse(status: string) {
  if (status === "confirmado")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelado") return "border-red-200 bg-red-50 text-red-700";
  if (status === "remarcado")
    return "border-orange-200 bg-orange-50 text-orange-700";
  if (["concluido", "realizado"].includes(status))
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "nao_compareceu")
    return "border-red-200 bg-red-50 text-red-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
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

function navegar(data: Date, visao: Visao, direcao: -1 | 1) {
  const nova = new Date(data);
  if (visao === "dia") nova.setDate(nova.getDate() + direcao);
  if (visao === "semana") nova.setDate(nova.getDate() + direcao * 7);
  if (visao === "mes") nova.setMonth(nova.getMonth() + direcao);
  if (visao === "ano") nova.setFullYear(nova.getFullYear() + direcao);
  return nova;
}

function periodoTitulo(data: Date, visao: Visao) {
  if (visao === "dia") return formatarData(data);
  if (visao === "semana")
    return `${formatarDataCurta(inicioDaSemana(data))} até ${formatarData(fimDaSemana(data))}`;
  if (visao === "mes")
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(data);
  return String(data.getFullYear());
}

function getPeriodo(data: Date, visao: Visao) {
  if (visao === "dia")
    return { inicio: inicioDoDia(data), fim: fimDoDia(data) };
  if (visao === "semana")
    return { inicio: inicioDaSemana(data), fim: fimDaSemana(data) };
  if (visao === "mes")
    return { inicio: inicioDoMes(data), fim: fimDoMes(data) };
  return {
    inicio: new Date(data.getFullYear(), 0, 1),
    fim: new Date(data.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

function CardAgendamento({
  item,
  compacto = false,
}: {
  item: AgendaItem;
  compacto?: boolean;
}) {
  const whatsapp = item.whatsapp.startsWith("55")
    ? item.whatsapp
    : item.whatsapp
      ? `55${item.whatsapp}`
      : "";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:break-inside-avoid print:border-slate-300 print:shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-slate-950 px-3 py-1 text-sm font-black text-white">
              {formatarHora(item.inicio)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClasse(item.status)}`}
            >
              {normalizar(item.status)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
              {normalizar(item.tipo)}
            </span>
          </div>
          <Link
            href={`/dashboard/leads/${item.leadId}`}
            className="mt-3 block text-base font-black text-slate-950 hover:text-blue-700 print:text-slate-950"
          >
            {item.cliente}
          </Link>
          <p className="mt-1 text-sm font-bold text-slate-600">{item.titulo}</p>
        </div>

        <div className="flex gap-2 print:hidden">
          {item.telefone ? (
            <a
              href={`tel:${item.telefone}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 hover:bg-blue-100"
            >
              <Phone className="mr-1 h-3.5 w-3.5" /> Ligar
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100"
            >
              <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      {!compacto ? (
        <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              Telefone
            </span>
            {item.telefone || "Não informado"}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              Veículo
            </span>
            {item.veiculo || "Não informado"}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              Vendedor C2S
            </span>
            {item.vendedorC2S || "Não informado"}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              Loja visita
            </span>
            {item.lojaVisita || "Não definida"}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              Atendente
            </span>
            {item.atendenteResgate || "Não informado"}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              Carteira
            </span>
            {item.lojaCarteira || "Não informado"}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              C2S
            </span>
            {normalizar(item.c2sSyncStatus)}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              Origem
            </span>
            {normalizar(item.origem)}
          </div>
        </div>
      ) : null}

      {item.observacao && !compacto ? (
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 text-xs font-semibold leading-5 text-slate-600">
          <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
            Observação
          </span>
          {item.observacao}
        </div>
      ) : null}
    </article>
  );
}

function BlocoOperacional({
  titulo,
  descricao,
  itens,
  destaque = false,
}: {
  titulo: string;
  descricao: string;
  itens: AgendaItem[];
  destaque?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <CalendarDays className="h-5 w-5 text-blue-700" />
            {titulo}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {descricao}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${destaque ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
        >
          {itens.length} item(ns)
        </span>
      </div>
      <div className="grid gap-3 p-4">
        {itens.length ? (
          itens.map((item) => <CardAgendamento key={item.id} item={item} />)
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
            Nenhum agendamento nesta fila.
          </div>
        )}
      </div>
    </section>
  );
}

function PrintAgenda({
  usuario,
  visao,
  dataBase,
  periodoTituloAtual,
  itensFiltrados,
  diasMes,
}: {
  usuario: UsuarioShell;
  visao: Visao;
  dataBase: Date;
  periodoTituloAtual: string;
  itensFiltrados: AgendaItem[];
  diasMes: Date[];
}) {
  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  const printMes = visao === "mes";
  const printSemana = visao === "semana";
  const printAno = visao === "ano";

  return (
    <section id="agenda-print-area" className="hidden print:block">
      <div className="print-page">
        <header className="print-header">
          <div>
            <p className="print-eyebrow">Flow Sales CRM</p>
            <h1>Agenda operacional</h1>
            <p>
              {periodoTituloAtual} • {itensFiltrados.length} agendamento(s)
            </p>
          </div>
          <div className="print-meta">
            <strong>{usuario.nome}</strong>
            <span>{geradoEm}</span>
          </div>
        </header>

        {printMes ? (
          <div className="print-month">
            {diasSemana.map((dia) => (
              <div key={dia} className="print-weekday">
                {dia}
              </div>
            ))}
            {diasMes.map((dia) => {
              const doDia = itensFiltrados.filter((item) =>
                mesmoDia(new Date(item.inicio), dia),
              );
              const foraMes = dia.getMonth() !== dataBase.getMonth();
              return (
                <div
                  key={dia.toISOString()}
                  className={`print-day ${foraMes ? "muted" : ""}`}
                >
                  <div className="print-day-head">
                    <strong>{dia.getDate()}</strong>
                    {doDia.length ? <span>{doDia.length}</span> : null}
                  </div>
                  <div className="print-day-list">
                    {doDia.slice(0, 5).map((item) => (
                      <p key={item.id}>
                        <b>{formatarHora(item.inicio)}</b> {item.cliente}
                      </p>
                    ))}
                    {doDia.length > 5 ? (
                      <p>
                        <b>+{doDia.length - 5}</b> item(ns)
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : printSemana ? (
          <div className="print-week">
            {Array.from({ length: 7 }).map((_, index) => {
              const dia = inicioDaSemana(dataBase);
              dia.setDate(dia.getDate() + index);
              const doDia = itensFiltrados.filter((item) =>
                mesmoDia(new Date(item.inicio), dia),
              );
              return (
                <div key={dia.toISOString()} className="print-week-column">
                  <h2>
                    {diasSemana[dia.getDay()]} • {formatarDataCurta(dia)}
                  </h2>
                  {doDia.length ? (
                    doDia.map((item) => (
                      <div key={item.id} className="print-small-card">
                        <b>{formatarHora(item.inicio)}</b> {item.cliente}
                        <span>{item.veiculo || item.titulo}</span>
                      </div>
                    ))
                  ) : (
                    <p className="print-empty">Livre</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : printAno ? (
          <div className="print-year">
            {meses.map((mes, index) => {
              const doMes = itensFiltrados.filter(
                (item) => new Date(item.inicio).getMonth() === index,
              );
              return (
                <div key={mes} className="print-year-card">
                  <h2>{mes}</h2>
                  <strong>{doMes.length}</strong>
                  <span>agendamento(s)</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="print-list">
            {itensFiltrados.length ? (
              itensFiltrados.map((item) => (
                <article key={item.id} className="print-row">
                  <div className="print-time">{formatarHora(item.inicio)}</div>
                  <div>
                    <h2>{item.cliente}</h2>
                    <p>{item.titulo}</p>
                    <p>
                      {item.telefone || "Telefone não informado"} •{" "}
                      {item.veiculo || "Veículo não informado"}
                    </p>
                    <p>
                      Vendedor C2S: {item.vendedorC2S || "Não informado"} •
                      Loja: {item.lojaVisita || "Não definida"}
                    </p>
                  </div>
                  <div className="print-status">{normalizar(item.status)}</div>
                </article>
              ))
            ) : (
              <div className="print-empty-large">
                Nenhum agendamento encontrado para este período.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function AgendaCalendarioClient({
  usuario,
  itens,
}: {
  usuario: UsuarioShell;
  itens: AgendaItem[];
}) {
  const [visao, setVisao] = useState<Visao>("dia");
  const [dataBase, setDataBase] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const hoje = new Date();
  const periodo = useMemo(() => getPeriodo(dataBase, visao), [dataBase, visao]);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens
      .filter((item) => dentroPeriodo(item, periodo.inicio, periodo.fim))
      .filter((item) => {
        if (!termo) return true;
        return [
          item.cliente,
          item.telefone,
          item.titulo,
          item.veiculo,
          item.vendedorC2S,
          item.lojaVisita,
          item.atendenteResgate,
          item.status,
          item.tipo,
        ]
          .join(" ")
          .toLowerCase()
          .includes(termo);
      })
      .sort(
        (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
      );
  }, [busca, itens, periodo.fim, periodo.inicio]);

  const atrasados = itens.filter(
    (item) =>
      new Date(item.inicio).getTime() < Date.now() &&
      !["cancelado", "concluido", "realizado"].includes(item.status),
  );
  const hojeItens = itens.filter((item) =>
    mesmoDia(new Date(item.inicio), hoje),
  );
  const confirmados = itensFiltrados.filter(
    (item) => item.status === "confirmado",
  );
  const pendentesC2S = itensFiltrados.filter(
    (item) => (item.c2sSyncStatus || "pendente") === "pendente",
  );
  const diasMes = useMemo(() => gerarDiasDoMes(dataBase), [dataBase]);

  function imprimir() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-950 lg:px-8 lg:py-7 print:bg-white print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { background: #ffffff !important; }
          body * { visibility: hidden !important; }
          #agenda-print-area, #agenda-print-area * { visibility: visible !important; }
          #agenda-print-area {
            display: block !important;
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .print-page { width: 100%; }
          .print-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #cbd5e1;
            margin-bottom: 8px;
          }
          .print-eyebrow { margin: 0 0 2px; font-size: 9px; font-weight: 900; letter-spacing: 0.22em; color: #1d4ed8; text-transform: uppercase; }
          .print-header h1 { margin: 0; font-size: 20px; font-weight: 900; line-height: 1.1; }
          .print-header p { margin: 3px 0 0; font-size: 10px; font-weight: 700; color: #475569; }
          .print-meta { text-align: right; font-size: 9px; color: #475569; display: grid; gap: 2px; }
          .print-meta strong { color: #0f172a; font-size: 10px; }
          .print-month { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
          .print-weekday { border: 1px solid #cbd5e1; background: #f8fafc; padding: 4px; text-align: center; font-size: 9px; font-weight: 900; color: #334155; }
          .print-day { min-height: 74px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; overflow: hidden; }
          .print-day.muted { color: #94a3b8; background: #f8fafc; }
          .print-day-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
          .print-day-head strong { font-size: 9px; }
          .print-day-head span { border-radius: 999px; background: #dbeafe; color: #1d4ed8; padding: 1px 5px; font-size: 8px; font-weight: 900; }
          .print-day-list { display: grid; gap: 2px; }
          .print-day-list p { margin: 0; font-size: 7.5px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .print-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
          .print-week-column { border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; min-height: 430px; }
          .print-week-column h2 { margin: 0 0 6px; font-size: 11px; font-weight: 900; }
          .print-small-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; margin-bottom: 4px; font-size: 8px; line-height: 1.25; }
          .print-small-card span { display: block; color: #475569; }
          .print-year { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
          .print-year-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; min-height: 74px; }
          .print-year-card h2 { margin: 0; font-size: 13px; font-weight: 900; }
          .print-year-card strong { display: block; margin-top: 6px; font-size: 22px; }
          .print-year-card span { font-size: 9px; color: #475569; }
          .print-list { display: grid; gap: 6px; }
          .print-row { display: grid; grid-template-columns: 58px 1fr 110px; gap: 10px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; break-inside: avoid; }
          .print-time { font-size: 17px; font-weight: 900; color: #1d4ed8; }
          .print-row h2 { margin: 0 0 2px; font-size: 12px; font-weight: 900; }
          .print-row p { margin: 0 0 2px; font-size: 9px; color: #475569; font-weight: 700; }
          .print-status { align-self: start; justify-self: end; border: 1px solid #cbd5e1; border-radius: 999px; padding: 3px 8px; font-size: 8px; font-weight: 900; }
          .print-empty, .print-empty-large { color: #64748b; font-size: 9px; font-weight: 800; }
          .print-empty-large { border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; text-align: center; }
        }
      `}</style>

      <PrintAgenda
        usuario={usuario}
        visao={visao}
        dataBase={dataBase}
        periodoTituloAtual={periodoTitulo(dataBase, visao)}
        itensFiltrados={itensFiltrados}
        diasMes={diasMes}
      />

      <div className="mx-auto max-w-[1600px] print:hidden">
        <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b border-slate-100 px-6 py-6 print:px-0 print:py-0 print:pb-4">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700 print:text-slate-500">
                  Flow Sales CRM
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                  Agenda operacional
                </h1>
                <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                  Calendário de visitas, retornos, test drives e próximas ações
                  da operação.
                </p>
                <p className="mt-2 hidden text-xs font-bold text-slate-500 print:block">
                  Impressão gerada por {usuario.nome} em{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date())}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row print:hidden">
                <Link
                  href="/dashboard/kanban"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-blue-50"
                >
                  Kanban
                </Link>
                <Link
                  href="/dashboard/leads/tarefas"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800"
                >
                  Minhas tarefas
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-5 print:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase text-slate-400">
                Período
              </p>
              <p className="mt-2 text-2xl font-black">
                {itensFiltrados.length}
              </p>
              <p className="text-xs font-bold text-slate-500">
                Agendamentos filtrados
              </p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
              <p className="text-xs font-black uppercase">Atrasados</p>
              <p className="mt-2 text-2xl font-black">{atrasados.length}</p>
              <p className="text-xs font-bold">Exigem ação</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-700">
              <p className="text-xs font-black uppercase">Hoje</p>
              <p className="mt-2 text-2xl font-black">{hojeItens.length}</p>
              <p className="text-xs font-bold">Agenda do dia</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700">
              <p className="text-xs font-black uppercase">Confirmados</p>
              <p className="mt-2 text-2xl font-black">{confirmados.length}</p>
              <p className="text-xs font-bold">No período</p>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-purple-700">
              <p className="text-xs font-black uppercase">C2S pendente</p>
              <p className="mt-2 text-2xl font-black">{pendentesC2S.length}</p>
              <p className="text-xs font-bold">Sincronização</p>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <div className="grid gap-3 xl:grid-cols-[auto_1fr_auto] xl:items-center">
            <div className="flex flex-wrap gap-2">
              {(["dia", "semana", "mes", "ano"] as Visao[]).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setVisao(opcao)}
                  className={`h-10 rounded-xl px-4 text-sm font-black transition ${visao === opcao ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-blue-50"}`}
                >
                  {opcao === "mes"
                    ? "Mês"
                    : opcao.charAt(0).toUpperCase() + opcao.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDataBase(navegar(dataBase, visao, -1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDataBase(new Date())}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDataBase(navegar(dataBase, visao, 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="ml-2 min-w-[240px] rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-black text-white">
                {periodoTitulo(dataBase, visao)}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1 xl:w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar cliente, veículo, vendedor..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <button
                type="button"
                onClick={imprimir}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </div>
          </div>
        </section>

        <section className="mb-4 hidden items-center justify-between border-b border-slate-200 pb-3 print:flex">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Agenda - {periodoTitulo(dataBase, visao)}
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              {itensFiltrados.length} agendamento(s)
            </p>
          </div>
          <CalendarDays className="h-7 w-7 text-slate-500" />
        </section>

        {visao === "mes" ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <div className="grid grid-cols-7 gap-2 print:gap-1">
              {diasSemana.map((dia) => (
                <div
                  key={dia}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-black text-slate-500 print:bg-white print:text-slate-700"
                >
                  {dia}
                </div>
              ))}
              {diasMes.map((dia) => {
                const doDia = itensFiltrados.filter((item) =>
                  mesmoDia(new Date(item.inicio), dia),
                );
                const foraMes = dia.getMonth() !== dataBase.getMonth();
                return (
                  <div
                    key={dia.toISOString()}
                    className={`min-h-[150px] rounded-2xl border p-2 print:min-h-[105px] ${foraMes ? "border-slate-100 bg-slate-50 text-slate-300" : "border-slate-200 bg-white text-slate-950"}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black">
                        {dia.getDate()}
                      </span>
                      {doDia.length ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                          {doDia.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid gap-1">
                      {doDia.slice(0, 4).map((item) => (
                        <Link
                          key={item.id}
                          href={`/dashboard/leads/${item.leadId}`}
                          className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-800 print:bg-slate-100 print:text-slate-800"
                        >
                          {formatarHora(item.inicio)} {item.cliente}
                        </Link>
                      ))}
                      {doDia.length > 4 ? (
                        <span className="text-[10px] font-black text-slate-400">
                          + {doDia.length - 4} item(ns)
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : visao === "ano" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-2">
            {meses.map((mes, index) => {
              const doMes = itensFiltrados.filter(
                (item) => new Date(item.inicio).getMonth() === index,
              );
              return (
                <div
                  key={mes}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-xl print:p-3 print:shadow-none"
                >
                  <h2 className="text-lg font-black text-slate-950">{mes}</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {doMes.length} agendamento(s)
                  </p>
                  <div className="mt-3 grid gap-2">
                    {doMes.slice(0, 8).map((item) => (
                      <CardAgendamento key={item.id} item={item} compacto />
                    ))}
                    {doMes.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-400">
                        Sem agendamentos.
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </section>
        ) : visao === "semana" ? (
          <section className="grid gap-4 xl:grid-cols-7 print:grid-cols-7 print:gap-2">
            {Array.from({ length: 7 }).map((_, index) => {
              const dia = inicioDaSemana(dataBase);
              dia.setDate(dia.getDate() + index);
              const doDia = itensFiltrados.filter((item) =>
                mesmoDia(new Date(item.inicio), dia),
              );
              return (
                <div
                  key={dia.toISOString()}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-xl print:p-2 print:shadow-none"
                >
                  <h2 className="text-sm font-black text-slate-950">
                    {diasSemana[dia.getDay()]}
                  </h2>
                  <p className="text-xs font-bold text-slate-500">
                    {formatarDataCurta(dia)}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {doDia.map((item) => (
                      <CardAgendamento key={item.id} item={item} compacto />
                    ))}
                    {doDia.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-400">
                        Livre
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
            <div className="border-b border-slate-100 px-5 py-4 print:hidden">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                <Clock3 className="h-5 w-5 text-blue-700" /> Agenda do dia
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Agendamentos em ordem de horário para confirmação, visita e
                retorno.
              </p>
            </div>
            <div className="grid gap-3 p-4 print:p-0">
              {itensFiltrados.length ? (
                itensFiltrados.map((item) => (
                  <CardAgendamento key={item.id} item={item} />
                ))
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500 print:border-slate-300 print:bg-white">
                  Nenhum agendamento encontrado para este período.
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-5 print:hidden">
          <div className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
                Fila operacional
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                Visão de acompanhamento
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Acompanhe atrasados, agenda do dia, próximos contatos e
                pendências sem sair da Agenda.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <a
                href="#agenda-atrasados"
                className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-red-700"
              >
                Atrasados
              </a>
              <a
                href="#agenda-hoje"
                className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700"
              >
                Hoje
              </a>
              <a
                href="#agenda-proximos"
                className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700"
              >
                Próximos 7 dias
              </a>
              <a
                href="#agenda-pendencias"
                className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700"
              >
                Pendências
              </a>
            </div>
          </div>

          <div id="agenda-atrasados">
            <BlocoOperacional
              titulo="Atrasados"
              descricao="Agendamentos vencidos que ainda exigem ação. Resolver antes dos próximos contatos."
              itens={atrasados}
              destaque
            />
          </div>

          <div id="agenda-hoje">
            <BlocoOperacional
              titulo="Agenda de hoje"
              descricao="Operação do dia em ordem de horário. Confirmar presença e registrar resultado."
              itens={hojeItens.sort(
                (a, b) =>
                  new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
              )}
            />
          </div>

          <div id="agenda-proximos">
            <BlocoOperacional
              titulo="Próximos 7 dias"
              descricao="Planejamento da semana para resgate, confirmação e acompanhamento comercial."
              itens={itens
                .filter((item) => {
                  const data = new Date(item.inicio);
                  const limite = new Date();
                  limite.setDate(limite.getDate() + 7);
                  limite.setHours(23, 59, 59, 999);
                  return (
                    data > fimDoDia(new Date()) &&
                    data <= limite &&
                    !["cancelado", "concluido", "realizado"].includes(
                      item.status,
                    )
                  );
                })
                .sort(
                  (a, b) =>
                    new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
                )}
            />
          </div>

          <div id="agenda-pendencias">
            <BlocoOperacional
              titulo="Pendências operacionais"
              descricao="Itens sem vendedor C2S, sem loja da visita ou com sincronização pendente."
              itens={itens
                .filter(
                  (item) =>
                    (!item.vendedorC2S ||
                      !item.lojaVisita ||
                      (item.c2sSyncStatus || "pendente") === "pendente") &&
                    !["cancelado", "concluido", "realizado"].includes(
                      item.status,
                    ),
                )
                .sort(
                  (a, b) =>
                    new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
                )}
            />
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-3 print:hidden">
          <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="mt-3 font-black">Atrasos</h3>
            <p className="mt-1 text-sm font-bold">
              Resolver atrasados antes dos próximos contatos.
            </p>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-blue-700">
            <UserCheck className="h-5 w-5" />
            <h3 className="mt-3 font-black">Confirmação</h3>
            <p className="mt-1 text-sm font-bold">
              Confirmar presença e registrar resultado no lead.
            </p>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-amber-700">
            <MapPin className="h-5 w-5" />
            <h3 className="mt-3 font-black">Loja da visita</h3>
            <p className="mt-1 text-sm font-bold">
              Manter loja/local do veículo claro para a equipe.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
