"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Filter,
  MapPin,
  MessageCircle,
  PhoneCall,
  RefreshCcw,
  Search,
  ShieldAlert,
  Smartphone,
  UserRound,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { GerarConectorWhatsApp } from "./GerarConectorWhatsApp";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
};

type Resumo = {
  conectores_total: number;
  conectores_online: number;
  conectores_offline: number;
  conectores_bloqueados: number;
  conversas_total: number;
  clientes_na_base: number;
  conversas_fora_da_base: number;
  com_ligacao_3cx: number;
  sem_ligacao_3cx: number;
  cliente_respondeu: number;
  whatsapp_sem_3cx: number;
  c2s_nao_atualizado: number;
  alertas_total: number;
  alertas_abertos: number;
  alertas_criticos: number;
  alertas_altos: number;
};

type Conector = {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string | null;
  nome_dispositivo: string;
  numero_whatsapp: string | null;
  numero_whatsapp_normalizado: string | null;
  status: string;
  status_localizacao: string;
  ip_publico: string | null;
  latitude: number | null;
  longitude: number | null;
  precisao_metros: number | null;
  ultima_sincronizacao_em: string | null;
  ultimo_heartbeat_em: string | null;
  bloqueado: boolean;
  bloqueado_motivo: string | null;
  ativo: boolean;
  online: boolean;
};

type Conversa = {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string | null;
  telefone_normalizado: string;
  nome_contato: string | null;
  cliente_esta_na_base: boolean;
  teve_ligacao_3cx: boolean;
  falou_no_telefone: boolean;
  teve_whatsapp: boolean;
  cliente_respondeu: boolean;
  whatsapp_sem_3cx: boolean;
  conversa_fora_da_base: boolean;
  c2s_nao_atualizado: boolean;
  ultima_mensagem_em: string | null;
  ultima_mensagem_preview: string | null;
  ultima_direcao: string | null;
  status_auditoria: string;
  revisado: boolean;
};

type MensagemConversa = {
  id: string;
  direcao: "enviada" | "recebida" | "sistema";
  tipo: string;
  mensagem_preview: string | null;
  enviada_em: string | null;
  criado_em: string;
};

type DetalheConversa = {
  conversa: Conversa & {
    usuario_perfil?: string | null;
  };
  mensagens: MensagemConversa[];
};

type Alerta = {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string | null;
  tipo: string;
  severidade: string;
  titulo: string;
  descricao: string | null;
  telefone_normalizado: string | null;
  status: string;
  criado_em: string;
};

type AtendenteResumo = {
  usuario_id: string;
  nome: string;
  email: string;
  perfil: string;
  conectores: number;
  conectores_online: number;
  conversas: number;
  clientes_na_base: number;
  fora_da_base: number;
  cliente_respondeu: number;
  whatsapp_sem_3cx: number;
  alertas_abertos: number;
};

type AuditoriaResponse = {
  ok: boolean;
  erro?: string;
  resumo: Resumo;
  por_atendente: AtendenteResumo[];
  conectores: Conector[];
  conversas: Conversa[];
  alertas: Alerta[];
};

type Props = {
  usuario: Usuario;
};

const filtrosAuditoria = [
  { label: "Todos", value: "todos" },
  { label: "Pendente", value: "pendente" },
  { label: "OK", value: "ok" },
  { label: "WhatsApp sem 3CX", value: "whatsapp_sem_3cx" },
  { label: "Fora da base", value: "fora_da_base" },
  { label: "Cliente respondeu", value: "cliente_respondeu" },
  { label: "C2S não atualizado", value: "c2s_nao_atualizado" },
];

function formatarData(data?: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function formatarTelefone(numero?: string | null) {
  const limpo = String(numero || "").replace(/\D/g, "");

  if (limpo.length === 11) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  }

  if (limpo.length === 10) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  }

  return numero || "—";
}

function baixarCsv(nomeArquivo: string, linhas: Record<string, unknown>[]) {
  if (linhas.length === 0) return;

  const colunas = Object.keys(linhas[0]);

  const csv = [
    colunas.join(";"),
    ...linhas.map((linha) =>
      colunas
        .map((coluna) => {
          const valor = String(linha[coluna] ?? "").replace(/"/g, '""');
          return `"${valor}"`;
        })
        .join(";")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  link.click();

  URL.revokeObjectURL(url);
}

function classeBadgeStatus(status: string) {
  const mapa: Record<string, string> = {
    online: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    offline: "bg-slate-100 text-slate-600 ring-slate-200",
    bloqueado: "bg-red-50 text-red-700 ring-red-200",
    erro: "bg-orange-50 text-orange-700 ring-orange-200",
    pendente: "bg-blue-50 text-blue-700 ring-blue-200",
  };

  return mapa[status] || "bg-slate-100 text-slate-600 ring-slate-200";
}

function classeAuditoria(status: string) {
  const mapa: Record<string, string> = {
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    pendente: "bg-slate-100 text-slate-700 ring-slate-200",
    whatsapp_sem_3cx: "bg-orange-50 text-orange-700 ring-orange-200",
    fora_da_base: "bg-red-50 text-red-700 ring-red-200",
    cliente_respondeu: "bg-blue-50 text-blue-700 ring-blue-200",
    c2s_nao_atualizado: "bg-violet-50 text-violet-700 ring-violet-200",
    revisado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return mapa[status] || "bg-slate-100 text-slate-600 ring-slate-200";
}

export function WhatsAppMonitorClient({ usuario }: Props) {
  const [dados, setDados] = useState<AuditoriaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [atendenteId, setAtendenteId] = useState("todos");
  const [statusAuditoria, setStatusAuditoria] = useState("todos");
  const [filtro3cx, setFiltro3cx] = useState("todos");
  const [filtroBase, setFiltroBase] = useState("todos");
  const [filtroResposta, setFiltroResposta] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [aba, setAba] = useState<"conversas" | "conectores" | "alertas" | "atendentes">(
    "conversas"
  );

  const [conversaAberta, setConversaAberta] = useState<DetalheConversa | null>(null);
  const [carregandoConversa, setCarregandoConversa] = useState(false);
  const [erroConversa, setErroConversa] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);

    const params = new URLSearchParams();

    if (atendenteId !== "todos") params.set("atendente_id", atendenteId);
    if (statusAuditoria !== "todos") params.set("status_auditoria", statusAuditoria);
    if (filtro3cx !== "todos") params.set("filtro_3cx", filtro3cx);
    if (filtroBase !== "todos") params.set("filtro_base", filtroBase);
    if (filtroResposta !== "todos") params.set("filtro_resposta", filtroResposta);
    if (dataInicio) params.set("data_inicio", dataInicio);
    if (dataFim) params.set("data_fim", dataFim);

    const resposta = await fetch(`/api/whatsapp/auditoria?${params.toString()}`, {
      cache: "no-store",
    });

    const json = await resposta.json();

    if (!resposta.ok || !json.ok) {
      setErro(json.erro || "Erro ao carregar auditoria WhatsApp.");
      setDados(null);
      setCarregando(false);
      return;
    }

    setDados(json);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const conversasFiltradas = useMemo(() => {
    const lista = dados?.conversas || [];
    const termo = busca.trim().toLowerCase();

    if (!termo) return lista;

    return lista.filter((item) => {
      return [
        item.nome_contato,
        item.telefone_normalizado,
        item.usuario_nome,
        item.ultima_mensagem_preview,
        item.status_auditoria,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [dados, busca]);

  const resumo = dados?.resumo;

  async function abrirConversa(conversaId: string) {
    setCarregandoConversa(true);
    setErroConversa(null);
    setConversaAberta(null);

    try {
      const resposta = await fetch(`/api/whatsapp/auditoria/conversa?conversa_id=${conversaId}`, {
        cache: "no-store",
      });

      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        setErroConversa(json.erro || "Erro ao carregar conversa.");
        setCarregandoConversa(false);
        return;
      }

      setConversaAberta({
        conversa: json.conversa,
        mensagens: json.mensagens || [],
      });
    } catch {
      setErroConversa("Erro ao carregar conversa.");
    }

    setCarregandoConversa(false);
  }

  function exportarConversas() {
    baixarCsv(
      "monitor-whatsapp-conversas.csv",
      conversasFiltradas.map((item) => ({
        cliente: item.nome_contato || "",
        telefone: item.telefone_normalizado,
        atendente: item.usuario_nome,
        esta_na_base: item.cliente_esta_na_base ? "Sim" : "Não",
        teve_3cx: item.teve_ligacao_3cx ? "Sim" : "Não",
        respondeu: item.cliente_respondeu ? "Sim" : "Não",
        whatsapp_sem_3cx: item.whatsapp_sem_3cx ? "Sim" : "Não",
        fora_da_base: item.conversa_fora_da_base ? "Sim" : "Não",
        c2s_nao_atualizado: item.c2s_nao_atualizado ? "Sim" : "Não",
        status_auditoria: item.status_auditoria,
        ultima_mensagem: item.ultima_mensagem_preview || "",
        ultima_interacao: item.ultima_mensagem_em || "",
      }))
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6">
      <section className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Monitor WhatsApp
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Auditoria entre C2S, 3CX e WhatsApp real dos atendentes comerciais.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={carregar}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCcw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </button>

          <button
            type="button"
            onClick={exportarConversas}
            disabled={!dados || conversasFiltradas.length === 0}
            className="flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Baixar relatório
          </button>
        </div>
      </section>

      {erro ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {erro}
        </div>
      ) : null}

      <GerarConectorWhatsApp perfilUsuarioLogado={usuario.perfil} />

      <section className="grid gap-3 xl:grid-cols-8">
        {[
          {
            label: "Conectores",
            value: resumo?.conectores_total ?? 0,
            detail: `${resumo?.conectores_online ?? 0} online`,
            icon: Smartphone,
            tab: "conectores",
          },
          {
            label: "Bloqueados",
            value: resumo?.conectores_bloqueados ?? 0,
            detail: "localização/acesso",
            icon: ShieldAlert,
            tab: "conectores",
          },
          {
            label: "Conversas",
            value: resumo?.conversas_total ?? 0,
            detail: "sincronizadas",
            icon: MessageCircle,
            tab: "conversas",
          },
          {
            label: "Na base C2S",
            value: resumo?.clientes_na_base ?? 0,
            detail: "telefone encontrado",
            icon: CheckCircle2,
            tab: "conversas",
          },
          {
            label: "Fora da base",
            value: resumo?.conversas_fora_da_base ?? 0,
            detail: "WhatsApp sem C2S",
            icon: XCircle,
            tab: "conversas",
          },
          {
            label: "WhatsApp sem 3CX",
            value: resumo?.whatsapp_sem_3cx ?? 0,
            detail: "resposta sem ligação",
            icon: PhoneCall,
            tab: "conversas",
          },
          {
            label: "Cliente respondeu",
            value: resumo?.cliente_respondeu ?? 0,
            detail: "precisa tratar",
            icon: Bell,
            tab: "conversas",
          },
          {
            label: "Alertas abertos",
            value: resumo?.alertas_abertos ?? 0,
            detail: `${resumo?.alertas_altos ?? 0} altos`,
            icon: AlertTriangle,
            tab: "alertas",
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.label}
              type="button"
              onClick={() => setAba(card.tab as any)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">{card.label}</p>
              <strong className="mt-1 block text-2xl font-bold text-slate-950">
                {card.value}
              </strong>
              <p className="mt-1 text-xs font-semibold text-slate-500">{card.detail}</p>
            </button>
          );
        })}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr_auto]">
          <label className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar cliente, telefone, atendente, mensagem..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <select
            value={atendenteId}
            onChange={(event) => setAtendenteId(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="todos">Todos atendentes</option>
            {(dados?.por_atendente || []).map((item) => (
              <option key={item.usuario_id} value={item.usuario_id}>
                {item.nome}
              </option>
            ))}
          </select>

          <select
            value={statusAuditoria}
            onChange={(event) => setStatusAuditoria(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            {filtrosAuditoria.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={filtro3cx}
            onChange={(event) => setFiltro3cx(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="todos">3CX todos</option>
            <option value="com_3cx">Com 3CX</option>
            <option value="sem_3cx">Sem 3CX</option>
          </select>

          <select
            value={filtroBase}
            onChange={(event) => setFiltroBase(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="todos">Base todos</option>
            <option value="na_base">Na base</option>
            <option value="fora_da_base">Fora da base</option>
          </select>

          <select
            value={filtroResposta}
            onChange={(event) => setFiltroResposta(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="todos">Resposta todos</option>
            <option value="respondeu">Respondeu</option>
            <option value="nao_respondeu">Não respondeu</option>
          </select>

          <button
            type="button"
            onClick={carregar}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Filter className="h-4 w-4" />
            Aplicar
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <input
            type="date"
            value={dataInicio}
            onChange={(event) => setDataInicio(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(event) => setDataFim(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setAtendenteId("todos");
              setStatusAuditoria("todos");
              setFiltro3cx("todos");
              setFiltroBase("todos");
              setFiltroResposta("todos");
              setDataInicio("");
              setDataFim("");
              setBusca("");
              setTimeout(carregar, 0);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
          {[
            ["conversas", "Conversas"],
            ["conectores", "Conectores"],
            ["alertas", "Alertas"],
            ["atendentes", "Atendentes"],
          ].map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setAba(valor as any)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                aba === valor
                  ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
              <ChevronDown className="ml-2 inline h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">
            Carregando auditoria WhatsApp...
          </div>
        ) : null}

        {!carregando && aba === "conversas" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Atendente</th>
                  <th className="px-4 py-3">Base</th>
                  <th className="px-4 py-3">3CX</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Última mensagem</th>
                  <th className="px-4 py-3">Status auditoria</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conversasFiltradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {item.nome_contato || "Cliente sem nome"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatarData(item.ultima_mensagem_em)}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {formatarTelefone(item.telefone_normalizado)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{item.usuario_nome}</p>
                      <p className="text-xs text-slate-500">{item.usuario_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                          item.cliente_esta_na_base
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-red-50 text-red-700 ring-red-200"
                        }`}
                      >
                        {item.cliente_esta_na_base ? "Na base" : "Fora da base"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                          item.teve_ligacao_3cx
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-orange-50 text-orange-700 ring-orange-200"
                        }`}
                      >
                        {item.teve_ligacao_3cx ? "Com 3CX" : "Sem 3CX"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-700">
                        {item.cliente_respondeu ? "Cliente respondeu" : "Sem resposta"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Direção: {item.ultima_direcao || "—"}
                      </p>
                    </td>
                    <td className="max-w-[320px] px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {item.ultima_mensagem_preview || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${classeAuditoria(
                          item.status_auditoria
                        )}`}
                      >
                        {item.status_auditoria}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => abrirConversa(item.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        Ver conversa
                      </button>
                    </td>
                  </tr>
                ))}

                {conversasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                      Nenhuma conversa encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {!carregando && aba === "conectores" ? (
          <div className="grid gap-3 p-4 xl:grid-cols-3">
            {(dados?.conectores || []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{item.nome_dispositivo}</p>
                    <p className="text-xs text-slate-500">{item.usuario_nome}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${classeBadgeStatus(item.status)}`}>
                    {item.online ? "online" : item.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    {item.online ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-slate-400" />}
                    Último sinal: {formatarData(item.ultimo_heartbeat_em)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-700" />
                    Número: {formatarTelefone(item.numero_whatsapp_normalizado)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    Localização: {item.status_localizacao}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    Sync: {formatarData(item.ultima_sincronizacao_em)}
                  </p>
                </div>

                {item.bloqueado ? (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
                    {item.bloqueado_motivo || "Conector bloqueado"}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {!carregando && aba === "alertas" ? (
          <div className="divide-y divide-slate-100">
            {(dados?.alertas || []).map((item) => (
              <div key={item.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-slate-900">{item.titulo}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.descricao}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {item.usuario_nome} • {formatarTelefone(item.telefone_normalizado)} • {formatarData(item.criado_em)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-200">
                    {item.severidade}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}

            {(dados?.alertas || []).length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-slate-500">
                Nenhum alerta encontrado.
              </div>
            ) : null}
          </div>
        ) : null}

        {!carregando && aba === "atendentes" ? (
          <div className="grid gap-3 p-4 xl:grid-cols-3">
            {(dados?.por_atendente || []).map((item) => (
              <div key={item.usuario_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {item.nome.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{item.nome}</p>
                    <p className="text-xs text-slate-500">{item.email}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-500">Conectores</p>
                    <p className="text-xl font-bold text-slate-950">{item.conectores}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-500">Online</p>
                    <p className="text-xl font-bold text-emerald-600">{item.conectores_online}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-500">Conversas</p>
                    <p className="text-xl font-bold text-slate-950">{item.conversas}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-500">Alertas</p>
                    <p className="text-xl font-bold text-red-600">{item.alertas_abertos}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {carregandoConversa ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-700 shadow-2xl">
            Carregando conversa...
          </div>
        </div>
      ) : null}

      {erroConversa ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm" onClick={() => setErroConversa(null)}>
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-700">Erro ao abrir conversa</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">{erroConversa}</p>
            <button type="button" onClick={() => setErroConversa(null)} className="mt-4 h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white">
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {conversaAberta ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm" onClick={() => setConversaAberta(null)}>
          <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Conversa WhatsApp
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-950">
                    {conversaAberta.conversa.nome_contato || "Cliente sem nome"}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {formatarTelefone(conversaAberta.conversa.telefone_normalizado)} • {conversaAberta.conversa.usuario_nome}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConversaAberta(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Base C2S</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {conversaAberta.conversa.cliente_esta_na_base ? "Na base" : "Fora da base"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">3CX</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {conversaAberta.conversa.teve_ligacao_3cx ? "Com ligação" : "Sem ligação"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Resposta</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {conversaAberta.conversa.cliente_respondeu ? "Cliente respondeu" : "Sem resposta"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {conversaAberta.conversa.status_auditoria}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
              {conversaAberta.mensagens.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">
                  Nenhuma mensagem individual encontrada para esta conversa.
                </div>
              ) : null}

              <div className="space-y-3">
                {conversaAberta.mensagens.map((mensagem) => {
                  const enviada = mensagem.direcao === "enviada";

                  return (
                    <div
                      key={mensagem.id}
                      className={`flex ${enviada ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${enviada ? "bg-blue-700 text-white" : "bg-white text-slate-800 border border-slate-200"}`}
                      >
                        <p className="text-sm font-semibold">
                          {mensagem.mensagem_preview || "[sem prévia]"}
                        </p>
                        <p className={`mt-2 text-[11px] font-bold ${enviada ? "text-blue-100" : "text-slate-400"}`}>
                          {mensagem.direcao} • {mensagem.tipo} • {formatarData(mensagem.enviada_em || mensagem.criado_em)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
