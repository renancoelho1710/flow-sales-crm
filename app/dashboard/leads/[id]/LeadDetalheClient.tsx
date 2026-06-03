"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Save,
  ShieldCheck,
  Tag,
  UserRound,
  UserCheck,
} from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email?: string;
  perfil: string;
  ativo?: boolean;
};

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  telefone_normalizado: string;
  email: string | null;
  origem: string | null;
  campanha: string | null;
  status: string;
  etapa: string;
  temperatura: string;
  unidade_id: string | null;
  responsavel_id: string | null;
  veiculo_interesse: string | null;
  observacao: string | null;
  data_primeiro_contato: string | null;
  data_ultimo_contato: string | null;
  data_proxima_acao: string | null;
  arquivado: boolean;
  motivo_arquivamento: string | null;
  arquivado_em: string | null;
  venda_pendente_validacao: boolean;
  venda_validada: boolean;
  criado_em: string;
  atualizado_em: string;
  c2s_id: string | null;
  c2s_internal_id: number | null;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  vendedor_email: string | null;
  vendedor_definido_em: string | null;
  vendedor_definido_por: string | null;
  vendedor_troca_bloqueada: boolean | null;
};

type Interacao = {
  id: string;
  lead_id: string;
  usuario_id: string | null;
  tipo: string;
  canal: string;
  resultado: string | null;
  observacao: string | null;
  criado_em: string;
};

type Props = {
  leadInicial: Lead;
  interacoesIniciais: Interacao[];
  usuario: Usuario;
  usuariosAtivos: Usuario[];
};

const formInicial = {
  tipo: "contato",
  canal: "telefone",
  resultado: "nao_atendeu",
  observacao: "",
  etapa: "",
  data_proxima_acao: "",
};

const resultados = [
  { value: "nao_atendeu", label: "Não atendeu" },
  { value: "sem_resposta", label: "Sem resposta" },
  { value: "falou_sem_interesse", label: "Falou, sem interesse agora" },
  { value: "pediu_retorno", label: "Pediu retorno" },
  { value: "pediu_simulacao", label: "Pediu simulação" },
  { value: "quer_ver_veiculo", label: "Quer ver veículo" },
  { value: "agendou_visita", label: "Agendou visita" },
  { value: "visitou_loja", label: "Visitou loja" },
  { value: "venda_pendente", label: "Venda pendente" },
  { value: "observacao", label: "Apenas observação" },
];

const filtrosHistorico = [
  { value: "todos", label: "Todos" },
  { value: "telefone", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visita", label: "Visita" },
  { value: "observacao", label: "Obs." },
];

function normalizarTexto(valor: string | null | undefined) {
  if (!valor) return "Não informado";

  return valor
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatarData(valor: string | null) {
  if (!valor) return "Sem registro";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function formatarDataCurta(valor: string | null) {
  if (!valor) return "Sem registro";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(valor));
}

function diasEmAtividade(valor: string | null) {
  if (!valor) return "Sem registro";

  const criado = new Date(valor).getTime();
  const agora = Date.now();
  const dias = Math.max(0, Math.floor((agora - criado) / 86400000));

  if (dias === 0) return "hoje";
  if (dias === 1) return "1 dia";
  if (dias < 30) return `${dias} dias`;

  const meses = Math.floor(dias / 30);
  if (meses === 1) return "1 mês";
  return `${meses} meses`;
}

function telefoneWhatsapp(lead: Lead) {
  const digits = (lead.telefone_normalizado || lead.telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function corTemperatura(valor: string) {
  const temperatura = valor.toLowerCase();

  if (temperatura.includes("quente")) {
    return "border-red-100 bg-red-50 text-red-700";
  }

  if (temperatura.includes("frio")) {
    return "border-sky-100 bg-sky-50 text-sky-700";
  }

  return "border-amber-100 bg-amber-50 text-amber-700";
}

function corEtapa(valor: string) {
  const etapa = valor.toLowerCase();

  if (etapa.includes("venda") || etapa.includes("ganho")) {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (etapa.includes("agend")) {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  if (etapa.includes("arquiv")) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-violet-100 bg-violet-50 text-violet-700";
}

function formatarDataInput(valor: string | null) {
  if (!valor) return "";
  const data = new Date(valor);
  const offset = data.getTimezoneOffset();
  const local = new Date(data.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function labelResultado(valor: string | null) {
  if (!valor) return "Sem resultado";
  return resultados.find((item) => item.value === valor)?.label || normalizarTexto(valor);
}

function isAtrasado(valor: string | null) {
  if (!valor) return false;
  return new Date(valor).getTime() < Date.now();
}

function situacaoLead(lead: Lead, totalInteracoes: number) {
  if (lead.venda_validada) return "Venda validada. Lead finalizado com sucesso.";
  if (lead.venda_pendente_validacao) return "Venda pendente de validação. Aguardando conferência da supervisão.";
  if (lead.etapa === "agendado") return "Cliente com visita/retorno agendado. Priorizar confirmação.";
  if (lead.temperatura === "quente") return "Lead quente. Cliente demonstrou intenção forte.";
  if (totalInteracoes === 0) return "Lead novo, sem primeiro atendimento registrado.";
  if (lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)) return "Lead com próxima ação em atraso. Precisa de retorno.";
  return "Lead em acompanhamento. Manter cadência de contato.";
}

function sugestaoLead(lead: Lead, totalInteracoes: number) {
  if (lead.venda_pendente_validacao) return "Acompanhar validação da venda com a supervisão.";
  if (lead.etapa === "agendado") return "Confirmar presença do cliente antes do horário combinado.";
  if (lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)) return "Realizar contato agora e registrar o resultado.";
  if (totalInteracoes === 0) return "Fazer a primeira ligação antes de iniciar WhatsApp.";
  if (lead.temperatura === "quente") return "Acelerar atendimento: simulação, veículo disponível ou visita.";
  return "Registrar próximo contato com data e observação clara.";
}

function riscoLead(lead: Lead, totalInteracoes: number) {
  if (lead.data_proxima_acao && isAtrasado(lead.data_proxima_acao)) return "Atraso no retorno";
  if (totalInteracoes >= 3 && lead.temperatura !== "quente") return "Muitas tentativas sem avanço";
  if (totalInteracoes === 0) return "Primeiro contato pendente";
  return "Sem alerta crítico";
}

function podeAlterarVendedor(perfil: string | null | undefined) {
  return ["adm", "admin", "supervisor", "gerente", "suporte"].includes(
    String(perfil || "").toLowerCase()
  );
}


export function LeadDetalheClient({ leadInicial, interacoesIniciais, usuario, usuariosAtivos }: Props) {
  const [lead, setLead] = useState(leadInicial);
  const [interacoes, setInteracoes] = useState(interacoesIniciais);
  const [form, setForm] = useState({
    ...formInicial,
    etapa: leadInicial.etapa || "novo",
    data_proxima_acao: formatarDataInput(leadInicial.data_proxima_acao),
  });
  const [filtroHistorico, setFiltroHistorico] = useState("todos");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [vendedorSelecionado, setVendedorSelecionado] = useState(leadInicial.vendedor_id || "");
  const [motivoVendedor, setMotivoVendedor] = useState("");
  const [salvandoVendedor, setSalvandoVendedor] = useState(false);

  const whatsapp = useMemo(() => telefoneWhatsapp(lead), [lead]);

  const interacoesFiltradas = useMemo(() => {
    if (filtroHistorico === "todos") return interacoes;
    return interacoes.filter((interacao) => interacao.canal === filtroHistorico || interacao.tipo === filtroHistorico);
  }, [filtroHistorico, interacoes]);

  const ultimaInteracao = interacoes[0] || null;
  const totalLigacoes = interacoes.filter((interacao) => interacao.canal === "telefone" || interacao.canal === "3cx").length;
  const totalWhatsApp = interacoes.filter((interacao) => interacao.canal === "whatsapp").length;
  const totalVisitas = interacoes.filter((interacao) => interacao.tipo === "visita" || interacao.resultado === "visitou_loja").length;
  const proximaAcaoAtrasada = isAtrasado(lead.data_proxima_acao);
  const situacaoAtual = situacaoLead(lead, interacoes.length);
  const sugestaoAtual = sugestaoLead(lead, interacoes.length);
  const riscoAtual = riscoLead(lead, interacoes.length);
  const podeGerenciarVendedor = podeAlterarVendedor(usuario.perfil);
  const vendedoresDisponiveis = usuariosAtivos.filter((item) =>
    ["vendedor", "colaborador", "operador", "supervisor", "gerente", "adm", "admin"].includes(
      String(item.perfil || "").toLowerCase()
    )
  );

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setMensagem("");
    setErro("");

    try {
      const resposta = await fetch("/api/leads/interacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: lead.id,
          ...form,
        }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível registrar o atendimento.");
      }

      if (dados.lead) {
        setLead(dados.lead);
      }

      if (dados.interacao) {
        setInteracoes((atual) => [dados.interacao, ...atual]);
      }

      setForm((atual) => ({
        ...formInicial,
        etapa: dados.lead?.etapa || atual.etapa,
        data_proxima_acao: formatarDataInput(dados.lead?.data_proxima_acao || null),
      }));

      setMensagem("Atendimento registrado com sucesso.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar o atendimento.");
    } finally {
      setSalvando(false);
    }
  }


  async function salvarVendedor() {
    if (!vendedorSelecionado) {
      setErro("Selecione um vendedor para vincular ao lead.");
      return;
    }

    setSalvandoVendedor(true);
    setMensagem("");
    setErro("");

    try {
      const resposta = await fetch("/api/leads/vincular-vendedor", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: lead.id,
          vendedor_id: vendedorSelecionado,
          motivo: motivoVendedor,
        }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível vincular o vendedor.");
      }

      if (dados.lead) {
        setLead(dados.lead);
        setVendedorSelecionado(dados.lead.vendedor_id || "");
      }

      setMotivoVendedor("");
      setMensagem("Vendedor vinculado ao lead com sucesso.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível vincular o vendedor.");
    } finally {
      setSalvandoVendedor(false);
    }
  }

  function selecionarResultadoRapido(resultado: string, etapa: string, tipo = "contato", canal = "ligacao") {
    setForm((atual) => ({
      ...atual,
      resultado,
      etapa,
      tipo,
      canal,
    }));
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-5 text-slate-950 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para leads
            </Link>

            <div className="mt-4 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                  Lead/Oportunidade
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">
                  {lead.nome}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${corTemperatura(lead.temperatura)}`}>
                    <Flame className="mr-1 inline h-3.5 w-3.5" />
                    {normalizarTexto(lead.temperatura)}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${corEtapa(lead.etapa)}`}>
                    {normalizarTexto(lead.etapa)}
                  </span>
                  {lead.venda_pendente_validacao ? (
                    <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                      Venda pendente de validação
                    </span>
                  ) : null}
                  {lead.venda_validada ? (
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      Venda validada
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={`tel:${lead.telefone}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
                >
                  <Phone className="h-4 w-4" />
                  Ligar
                </a>

                {whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Em atividade há</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{diasEmAtividade(lead.criado_em)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Etapa atual</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{normalizarTexto(lead.etapa)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Última atualização</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{formatarDataCurta(lead.atualizado_em)}</p>
            </div>

            <div className={`rounded-xl border p-4 ${proximaAcaoAtrasada ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-xs font-black uppercase tracking-wide ${proximaAcaoAtrasada ? "text-red-500" : "text-slate-400"}`}>Próxima ação</p>
              <p className={`mt-2 text-lg font-black ${proximaAcaoAtrasada ? "text-red-700" : "text-slate-900"}`}>
                {lead.data_proxima_acao ? formatarDataCurta(lead.data_proxima_acao) : "Sem registro"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Interações</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{interacoes.length}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Último resultado</p>
              <p className="mt-2 text-sm font-black text-slate-900">{ultimaInteracao ? labelResultado(ultimaInteracao.resultado) : "Sem histórico"}</p>
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Situação atual</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{situacaoAtual}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Próxima melhor ação</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{sugestaoAtual}</p>
          </div>

          <div className={`rounded-2xl border p-4 ${riscoAtual === "Sem alerta crítico" ? "border-slate-200 bg-white" : "border-red-100 bg-red-50"}`}>
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${riscoAtual === "Sem alerta crítico" ? "text-slate-500" : "text-red-700"}`}>Risco</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{riscoAtual}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Resumo de canais</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-lg font-black text-slate-950">{totalLigacoes}</p>
                <p className="text-[10px] font-black uppercase text-slate-400">Ligações</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-lg font-black text-slate-950">{totalWhatsApp}</p>
                <p className="text-[10px] font-black uppercase text-slate-400">WhatsApp</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-lg font-black text-slate-950">{totalVisitas}</p>
                <p className="text-[10px] font-black uppercase text-slate-400">Visitas</p>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
                <UserCheck className="h-5 w-5 text-blue-700" />
                Vendedor vinculado
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                O agendamento deve respeitar o vendedor responsável pelo lead. Trocas ficam registradas no histórico.
              </p>
            </div>

            <span className={`rounded-full border px-3 py-1 text-xs font-black ${
              lead.vendedor_nome
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-orange-100 bg-orange-50 text-orange-700"
            }`}>
              {lead.vendedor_nome ? "Vendedor definido" : "Sem vendedor"}
            </span>
          </div>

          <div className="grid gap-4 p-5 xl:grid-cols-[1fr_1.4fr]">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Vendedor atual</p>
                <p className="mt-1 text-sm font-black text-slate-900">{lead.vendedor_nome || "Sem vendedor vinculado"}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">E-mail</p>
                <p className="mt-1 text-sm font-black text-slate-900">{lead.vendedor_email || "Não informado"}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Definido em</p>
                <p className="mt-1 text-sm font-black text-slate-900">{formatarData(lead.vendedor_definido_em)}</p>
              </div>
            </div>

            {podeGerenciarVendedor ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-black text-slate-950">Vincular ou trocar vendedor</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  Somente supervisão/ADM pode alterar. Ao salvar, agendamentos futuros desse lead também recebem o mesmo vendedor.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-wide text-blue-700">Vendedor</span>
                    <select
                      value={vendedorSelecionado}
                      onChange={(event) => setVendedorSelecionado(event.target.value)}
                      className="h-11 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Selecione um vendedor</option>
                      {vendedoresDisponiveis.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome} {item.perfil ? `• ${normalizarTexto(item.perfil)}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-wide text-blue-700">Motivo</span>
                    <input
                      value={motivoVendedor}
                      onChange={(event) => setMotivoVendedor(event.target.value)}
                      placeholder="Ex: vendedor original do C2S / ajuste da supervisão"
                      className="h-11 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={salvarVendedor}
                    disabled={salvandoVendedor}
                    className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {salvandoVendedor ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Alteração bloqueada</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Seu perfil pode registrar atendimentos, mas a troca de vendedor fica com supervisão/ADM.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-black text-slate-950">Lead/Oportunidade</h2>
              <UserRound className="h-5 w-5 text-slate-400" />
            </div>

            <div className="grid gap-0 divide-y divide-slate-100">
              <div className="px-5 py-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Cliente</p>
                <p className="mt-1 text-sm font-black text-slate-900">{lead.nome}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
                  <a href={`tel:${lead.telefone}`} className="inline-flex items-center gap-1 text-blue-700">
                    <Phone className="h-4 w-4" />
                    {lead.telefone}
                  </a>
                  {lead.email ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {lead.email}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Origem</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{normalizarTexto(lead.origem)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Campanha</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{normalizarTexto(lead.campanha)}</p>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Veículo de interesse</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
                    <CarFront className="h-4 w-4 text-blue-700" />
                    {lead.veiculo_interesse || "Não informado"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">C2S</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {lead.c2s_id || lead.c2s_internal_id ? `${lead.c2s_id || ""} ${lead.c2s_internal_id || ""}` : "Sem vínculo C2S"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Temperatura</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{normalizarTexto(lead.temperatura)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Interações</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{interacoes.length} registro(s)</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Último resultado</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{ultimaInteracao ? labelResultado(ultimaInteracao.resultado) : "Sem histórico"}</p>
                </div>
              </div>

              <div className="px-5 py-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                  <FileText className="h-4 w-4" />
                  Observação principal
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                  {lead.observacao || "Sem observação registrada."}
                </p>
              </div>

              <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Primeiro contato</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatarData(lead.data_primeiro_contato)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Último contato</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatarData(lead.data_ultimo_contato)}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Próxima ação</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
                    <CalendarClock className="h-4 w-4 text-blue-700" />
                    {formatarData(lead.data_proxima_acao)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Venda pendente</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {lead.venda_pendente_validacao ? "Sim" : "Não"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Venda validada</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {lead.venda_validada ? "Sim" : "Não"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-black text-slate-950">Ação rápida do atendente</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Registre o atendimento. A temperatura será calculada automaticamente pelo sistema.
                </p>
              </div>

              <form onSubmit={registrar} className="grid gap-4 p-5">
                <div className="grid gap-2 md:grid-cols-5">
                  <button
                    type="button"
                    onClick={() => selecionarResultadoRapido("nao_atendeu", "contato")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    Não atendeu
                  </button>
                  <button
                    type="button"
                    onClick={() => selecionarResultadoRapido("pediu_retorno", "contato")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    Pediu retorno
                  </button>
                  <button
                    type="button"
                    onClick={() => selecionarResultadoRapido("pediu_simulacao", "contato")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    Simulação
                  </button>
                  <button
                    type="button"
                    onClick={() => selecionarResultadoRapido("agendou_visita", "agendado", "agendamento")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    Agendou
                  </button>
                  <button
                    type="button"
                    onClick={() => selecionarResultadoRapido("venda_pendente", "venda_pendente", "venda")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    Venda pendente
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-slate-800">Canal</span>
                    <select
                      value={form.canal}
                      onChange={(event) => atualizar("canal", event.target.value)}
                      className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="telefone">Ligação</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="presencial">Presencial</option>
                      <option value="sistema">Sistema</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-black text-slate-800">Resultado do contato</span>
                    <select
                      value={form.resultado}
                      onChange={(event) => atualizar("resultado", event.target.value)}
                      className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    >
                      {resultados.map((resultado) => (
                        <option key={resultado.value} value={resultado.value}>
                          {resultado.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-slate-800">Etapa</span>
                    <select
                      value={form.etapa}
                      onChange={(event) => atualizar("etapa", event.target.value)}
                      className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="novo">Novo</option>
                      <option value="contato">Em contato</option>
                      <option value="agendado">Agendado</option>
                      <option value="visita">Visitou loja</option>
                      <option value="venda_pendente">Venda pendente</option>
                      <option value="venda_validada">Venda validada</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-black text-slate-800">Próxima ação</span>
                    <input
                      type="datetime-local"
                      value={form.data_proxima_acao}
                      onChange={(event) => atualizar("data_proxima_acao", event.target.value)}
                      className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-800">Comentário do atendimento</span>
                  <textarea
                    value={form.observacao}
                    onChange={(event) => atualizar("observacao", event.target.value)}
                    required
                    rows={4}
                    maxLength={3000}
                    placeholder="Pressione aqui para inserir seu comentário do atendimento..."
                    className="resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                  <span className="text-right text-xs font-bold text-slate-400">
                    {form.observacao.length}/3000
                  </span>
                </label>

                {erro ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {erro}
                  </div>
                ) : null}

                {mensagem ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    {mensagem}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {salvando ? "Salvando..." : "Registrar atendimento"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-black text-slate-950">Histórico</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {filtrosHistorico.map((filtro) => (
                    <button
                      key={filtro.value}
                      type="button"
                      onClick={() => setFiltroHistorico(filtro.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                        filtroHistorico === filtro.value
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {filtro.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                {interacoesFiltradas.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    Nenhuma interação registrada ainda.
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 pl-5">
                    {interacoesFiltradas.map((interacao) => (
                      <div key={interacao.id} className="relative mb-5 last:mb-0">
                        <span className="absolute -left-[29px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-blue-600" />
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black text-slate-950">
                              {normalizarTexto(interacao.tipo)} • {normalizarTexto(interacao.canal)}
                            </p>
                            <p className="text-xs font-bold text-slate-400">{formatarData(interacao.criado_em)}</p>
                          </div>
                          {interacao.resultado ? (
                            <p className="mt-2 text-sm font-bold text-blue-700">
                              {labelResultado(interacao.resultado)}
                            </p>
                          ) : null}
                          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
                            {interacao.observacao || "Sem observação."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}