"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Clipboard,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Megaphone,
  Pencil,
  PlayCircle,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";

type StatusCampanha = "ativa" | "pausada" | "encerrada" | "arquivada";
type SimuladorTipo = "nenhum" | "copa_azul" | "link_externo";
type FiltroCampanhas = "ativas" | "desativadas" | "arquivadas" | "todas";

type Campanha = {
  id: string;
  nome: string;
  status: StatusCampanha;
  simulador_tipo: SimuladorTipo;
  link_oficial: string | null;
  mostrar_link_oficial: boolean;
  titulo_publico: string | null;
  imagem_url: string | null;
  resumo_operador: string | null;
  regras_principais: string | null;
  script_ligacao: string | null;
  mensagem_whatsapp: string | null;
  objecoes: string | null;
  tem_simulador: boolean;
  simulador_liberado: boolean;
  link_simulador: string | null;
  simulador_observacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
};

type FormCampanha = {
  id: string;
  nome: string;
  status: StatusCampanha;
  simulador_tipo: SimuladorTipo;
  link_oficial: string;
  mostrar_link_oficial: boolean;
  titulo_publico: string;
  imagem_url: string;
  resumo_operador: string;
  regras_principais: string;
  script_ligacao: string;
  mensagem_whatsapp: string;
  objecoes: string;
  tem_simulador: boolean;
  simulador_liberado: boolean;
  link_simulador: string;
  simulador_observacao: string;
  data_inicio: string;
  data_fim: string;
};

type ConfirmacaoAcao =
  | {
      tipo: "status";
      status: StatusCampanha;
      titulo: string;
      descricao: string;
      confirmarTexto: string;
      variante: "amber" | "slate" | "emerald" | "red";
    }
  | {
      tipo: "excluir";
      titulo: string;
      descricao: string;
      confirmarTexto: string;
      variante: "red";
    };

const formVazio: FormCampanha = {
  id: "",
  nome: "",
  status: "ativa",
  simulador_tipo: "nenhum",
  link_oficial: "",
  mostrar_link_oficial: true,
  titulo_publico: "",
  imagem_url: "",
  resumo_operador: "",
  regras_principais: "",
  script_ligacao: "",
  mensagem_whatsapp: "",
  objecoes: "",
  tem_simulador: false,
  simulador_liberado: false,
  link_simulador: "",
  simulador_observacao: "",
  data_inicio: "",
  data_fim: "",
};

function paraForm(c: Campanha): FormCampanha {
  return {
    id: c.id,
    nome: c.nome || "",
    status: c.status || "ativa",
    simulador_tipo:
      c.simulador_tipo || (c.tem_simulador ? "copa_azul" : "nenhum"),
    link_oficial: c.link_oficial || "",
    mostrar_link_oficial: c.mostrar_link_oficial !== false,
    titulo_publico: c.titulo_publico || "",
    imagem_url: c.imagem_url || "",
    resumo_operador: c.resumo_operador || "",
    regras_principais: c.regras_principais || "",
    script_ligacao: c.script_ligacao || "",
    mensagem_whatsapp: c.mensagem_whatsapp || "",
    objecoes: c.objecoes || "",
    tem_simulador: c.tem_simulador === true,
    simulador_liberado: c.simulador_liberado === true,
    link_simulador: c.link_simulador || "",
    simulador_observacao: c.simulador_observacao || "",
    data_inicio: c.data_inicio || "",
    data_fim: c.data_fim || "",
  };
}

function formatarData(data: string | null) {
  if (!data) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${data}T12:00:00`));
}

function statusLabel(status: StatusCampanha) {
  if (status === "ativa") return "Ativa";
  if (status === "pausada") return "Desativada";
  if (status === "arquivada") return "Arquivada";
  return "Encerrada";
}

function statusClass(status: StatusCampanha) {
  if (status === "ativa")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "pausada")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "arquivada")
    return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-red-200 bg-red-50 text-red-700";
}

type PassoOperador = {
  numero: string;
  titulo: string;
  descricao: string;
};

type BeneficioOperador = {
  destaque: string;
  titulo: string;
  descricao: string;
};

type ObjecaoOperador = {
  titulo: string;
  resposta: string;
};

type VisaoOperador = {
  abertura: string;
  passos: PassoOperador[];
  beneficios: BeneficioOperador[];
  perguntas: string[];
  objecoes: ObjecaoOperador[];
};

function textoEmLinhas(texto?: string | null) {
  return String(texto || "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
}

function resumoCurto(texto?: string | null, limite = 180) {
  const limpo = String(texto || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!limpo) return "";

  return limpo.length > limite ? `${limpo.slice(0, limite).trim()}...` : limpo;
}

function montarVisaoOperador(campanha: Campanha | null): VisaoOperador {
  const regras = textoEmLinhas(campanha?.regras_principais);
  const tituloBase =
    `${campanha?.nome || ""} ${campanha?.titulo_publico || ""}`.toLowerCase();

  const objecoesExtraidas: ObjecaoOperador[] = String(campanha?.objecoes || "")
    .split(/\n\s*\n/)
    .map((bloco) =>
      bloco
        .split("\n")
        .map((linha) => linha.trim())
        .filter(Boolean),
    )
    .filter((bloco) => bloco.length > 0)
    .map((bloco) => {
      const titulo = String(bloco[0] || "Objeção").replace(/^"|"$/g, "");
      const respostaLinha =
        bloco.find((linha) => linha.toLowerCase().startsWith("resposta:")) ||
        bloco.slice(1).join(" ");

      return {
        titulo,
        resposta: resumoCurto(respostaLinha.replace(/^resposta:\s*/i, ""), 150),
      };
    })
    .slice(0, 3);

  if (tituloBase.includes("copa azul")) {
    return {
      abertura:
        "Use esta visão rápida durante a ligação. Para regra completa, abra a página oficial.",
      passos: [
        {
          numero: "1",
          titulo: "Escolha o veículo",
          descricao:
            "Entenda qual carro o cliente procura e se tem usado na troca.",
        },
        {
          numero: "2",
          titulo: "Faça a análise",
          descricao: "A condição depende de aprovação de crédito.",
        },
        {
          numero: "3",
          titulo: "Plano Sob Medida",
          descricao: "Operação pelo banco CarBank.",
        },
        {
          numero: "4",
          titulo: "12 parcelas",
          descricao: "As 12 iniciais de R$ 99 são por nossa conta.",
        },
        {
          numero: "5",
          titulo: "Chute Premiado",
          descricao: "Cliente compra e participa da ação.",
        },
      ],
      beneficios: [
        {
          destaque: "12x",
          titulo: "12 parcelas por nossa conta",
          descricao: "Benefício da campanha conforme aprovação.",
        },
        {
          destaque: "FIPE",
          titulo: "Até 100% da FIPE",
          descricao: "Usado avaliado conforme análise técnica.",
        },
        {
          destaque: "48x",
          titulo: "Até 48 parcelas",
          descricao: "Condição aprovada pelo banco parceiro.",
        },
        {
          destaque: "2027",
          titulo: "Começa a pagar em 2027",
          descricao: "Ponto forte para destacar na ligação.",
        },
      ],
      perguntas: [
        "Hoje pesa mais para você: entrada, parcela ou avaliação do usado?",
        "Você tem algum veículo para dar na troca?",
        "Quer que eu te mostre uma opção que encaixe nessa condição?",
      ],
      objecoes:
        objecoesExtraidas.length > 0
          ? objecoesExtraidas
          : [
              {
                titulo: "Vou pensar",
                resposta:
                  "Pergunte o que mais pesa na decisão: entrada, parcela ou avaliação do usado.",
              },
              {
                titulo: "Está caro",
                resposta:
                  "Compare pela condição completa, não só pelo valor do carro.",
              },
              {
                titulo: "Tenho usado na troca",
                resposta:
                  "Explique que dá para avaliar e verificar enquadramento na campanha.",
              },
            ],
    };
  }

  return {
    abertura:
      resumoCurto(campanha?.resumo_operador, 220) ||
      "Campanha pronta para operação. Para regra completa, abra a página oficial.",
    passos: [
      {
        numero: "1",
        titulo: "Entender necessidade",
        descricao: "Descubra veículo, faixa de valor e se tem troca.",
      },
      {
        numero: "2",
        titulo: "Validar campanha",
        descricao: "Veja se o cliente encaixa na condição.",
      },
      {
        numero: "3",
        titulo: "Apresentar benefício",
        descricao: "Explique o ponto principal da campanha.",
      },
      {
        numero: "4",
        titulo: "Avançar",
        descricao: "Leve para simulação, visita ou envio de opções.",
      },
    ],
    beneficios: (regras.length ? regras : ["Condição especial ativa."])
      .slice(0, 4)
      .map((regra, index) => ({
        destaque: `${index + 1}`,
        titulo: regra,
        descricao: "Consulte a página oficial para regras completas.",
      })),
    perguntas: [
      "Qual veículo você procura hoje?",
      "Você quer financiar ou usar veículo na troca?",
      "Quer que eu te mostre uma opção dentro da campanha?",
    ],
    objecoes:
      objecoesExtraidas.length > 0
        ? objecoesExtraidas
        : [
            {
              titulo: "Vou pensar",
              resposta: "Entenda o que está travando a decisão.",
            },
            {
              titulo: "Está caro",
              resposta: "Traga a conversa para condição, parcela e troca.",
            },
          ],
  };
}
function Campo({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  name: keyof FormCampanha;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function Area({
  label,
  name,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  name: keyof FormCampanha;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [selecionadaId, setSelecionadaId] = useState("");
  const [form, setForm] = useState<FormCampanha>(formVazio);
  const [podeGerenciar, setPodeGerenciar] = useState(false);
  const [modoOperador, setModoOperador] = useState(false);
  const [filtroCampanhas, setFiltroCampanhas] =
    useState<FiltroCampanhas>("ativas");
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoAcao | null>(null);
  const [contadorConfirmacao, setContadorConfirmacao] = useState(5);
  const [confirmandoAcao, setConfirmandoAcao] = useState(false);
  const [textoConfirmacaoExclusao, setTextoConfirmacaoExclusao] = useState("");

  const campanhasFiltradas = useMemo(() => {
    if (modoOperador) {
      return campanhas.filter((item) => item.status === "ativa");
    }

    if (filtroCampanhas === "ativas") {
      return campanhas.filter((item) => item.status === "ativa");
    }

    if (filtroCampanhas === "desativadas") {
      return campanhas.filter(
        (item) => item.status === "pausada" || item.status === "encerrada",
      );
    }

    if (filtroCampanhas === "arquivadas") {
      return campanhas.filter((item) => item.status === "arquivada");
    }

    return campanhas;
  }, [campanhas, filtroCampanhas, modoOperador]);

  const campanha = useMemo(() => {
    const base = campanhasFiltradas;

    return (
      base.find((item) => item.id === selecionadaId) ||
      base.find((item) => item.status === "ativa") ||
      base[0] ||
      null
    );
  }, [campanhasFiltradas, selecionadaId]);

  const visaoOperador = useMemo(
    () => montarVisaoOperador(campanha),
    [campanha],
  );

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!confirmacao) return;

    setContadorConfirmacao(5);

    const intervalo = window.setInterval(() => {
      setContadorConfirmacao((atual) => {
        if (atual <= 1) {
          window.clearInterval(intervalo);
          setConfirmacao(null);
          return 0;
        }

        return atual - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [confirmacao]);

  useEffect(() => {
    if (!confirmacao) return;

    setContadorConfirmacao(5);

    const intervalo = window.setInterval(() => {
      setContadorConfirmacao((atual) => {
        if (atual <= 1) {
          window.clearInterval(intervalo);
          setConfirmacao(null);
          return 0;
        }

        return atual - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [confirmacao]);

  async function carregar() {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch("/api/campanhas", { cache: "no-store" });
      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        throw new Error(json.erro || "Erro ao carregar campanhas.");
      }

      const lista: Campanha[] = json.campanhas || [];
      setCampanhas(lista);
      setPodeGerenciar(json.pode_gerenciar === true);

      const alvo =
        lista.find(
          (item) => item.id === selecionadaId && item.status === "ativa",
        ) ||
        lista.find((item) => item.status === "ativa") ||
        lista[0];

      if (alvo) {
        setSelecionadaId(alvo.id);
        setForm(paraForm(alvo));
      } else {
        setSelecionadaId("");
        setForm(formVazio);
      }
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar campanhas.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function selecionar(c: Campanha) {
    setSelecionadaId(c.id);
    setForm(paraForm(c));
    setEditando(false);
    setErro("");
    setMensagem("");
  }

  function novaCampanha() {
    setSelecionadaId("");
    setForm(formVazio);
    setEditando(true);
    setModoOperador(false);
    setErro("");
    setMensagem("");
  }

  function editarCampanha() {
    if (!campanha) return;
    setForm(paraForm(campanha));
    setEditando(true);
    setModoOperador(false);
    setErro("");
    setMensagem("");
  }

  function mudarCampo(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  function alternar(campo: keyof FormCampanha) {
    setForm((atual) => {
      const valor = !atual[campo];

      if (campo === "tem_simulador" && valor === false) {
        return {
          ...atual,
          tem_simulador: false,
          simulador_liberado: false,
          simulador_tipo: "nenhum",
        };
      }

      if (campo === "tem_simulador" && valor === true) {
        return {
          ...atual,
          tem_simulador: true,
          simulador_tipo:
            atual.simulador_tipo === "nenhum"
              ? "copa_azul"
              : atual.simulador_tipo,
        };
      }

      return {
        ...atual,
        [campo]: valor,
      };
    });
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const resposta = await fetch("/api/campanhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        throw new Error(json.erro || "Erro ao salvar campanha.");
      }

      setMensagem("Campanha salva.");
      setEditando(false);

      if (json.campanha?.id) {
        setSelecionadaId(json.campanha.id);
        setForm(paraForm(json.campanha));
      }

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao salvar campanha.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function mudarStatus(status: StatusCampanha) {
    if (!campanha) return;

    if (status === "pausada") {
      setConfirmacao({
        tipo: "status",
        status,
        titulo: "Desativar campanha?",
        descricao: `A campanha "${campanha.nome}" ficará indisponível para uso operacional até ser ativada novamente.`,
        confirmarTexto: "Confirmar desativação",
        variante: "amber",
      });
      return;
    }

    if (status === "arquivada") {
      setConfirmacao({
        tipo: "status",
        status,
        titulo: "Arquivar campanha?",
        descricao: `A campanha "${campanha.nome}" será movida para arquivadas. Você ainda poderá consultar depois como administrador.`,
        confirmarTexto: "Confirmar arquivamento",
        variante: "slate",
      });
      return;
    }

    if (status === "ativa") {
      setConfirmacao({
        tipo: "status",
        status,
        titulo: "Ativar campanha?",
        descricao: `A campanha "${campanha.nome}" voltará a ficar disponível para operação.`,
        confirmarTexto: "Confirmar ativação",
        variante: "emerald",
      });
      return;
    }

    setConfirmacao({
      tipo: "status",
      status,
      titulo: "Alterar status?",
      descricao: `O status da campanha "${campanha.nome}" será alterado.`,
      confirmarTexto: "Confirmar alteração",
      variante: "slate",
    });
  }

  async function executarMudancaStatus(status: StatusCampanha) {
    if (!campanha) return;

    const resposta = await fetch(`/api/campanhas/${campanha.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const json = await resposta.json();

    if (!resposta.ok || !json.ok) {
      throw new Error(json.erro || "Erro ao atualizar status.");
    }

    setMensagem("Status atualizado.");
    await carregar();
  }

  function excluirCampanha() {
    if (!campanha) return;

    setTextoConfirmacaoExclusao("");

    setConfirmacao({
      tipo: "excluir",
      titulo: "Excluir campanha definitivamente?",
      descricao: `A campanha "${campanha.nome}" será excluída. Essa ação não deve ser usada para histórico; para isso, use Arquivar.`,
      confirmarTexto: "Confirmar exclusão",
      variante: "red",
    });
  }

  async function executarExclusaoCampanha() {
    if (!campanha) return;

    const resposta = await fetch(`/api/campanhas/${campanha.id}`, {
      method: "DELETE",
    });

    const json = await resposta.json();

    if (!resposta.ok || !json.ok) {
      throw new Error(json.erro || "Erro ao excluir campanha.");
    }

    setMensagem("Campanha excluída.");
    setSelecionadaId("");
    setForm(formVazio);
    setEditando(false);
    await carregar();
  }

  async function confirmarAcao() {
    if (!confirmacao || confirmandoAcao) return;

    if (
      confirmacao.tipo === "excluir" &&
      textoConfirmacaoExclusao.trim().toUpperCase() !== "EXCLUIR"
    ) {
      setErro(
        "Para excluir definitivamente, digite EXCLUIR no campo de confirmação.",
      );
      return;
    }

    try {
      setConfirmandoAcao(true);
      setErro("");
      setMensagem("");

      if (confirmacao.tipo === "status") {
        await executarMudancaStatus(confirmacao.status);
      } else {
        await executarExclusaoCampanha();
      }

      setConfirmacao(null);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao confirmar ação.",
      );
    } finally {
      setConfirmandoAcao(false);
    }
  }

  async function copiarMensagem() {
    const texto = String(campanha?.mensagem_whatsapp || "").trim();

    if (!texto) {
      setErro("Não existe mensagem cadastrada para copiar.");
      return;
    }

    await navigator.clipboard.writeText(texto);
    setMensagem("Mensagem copiada.");
  }

  async function puxarInformacoes() {
    try {
      setImportando(true);
      setErro("");
      setMensagem("");

      if (!form.link_oficial.trim()) {
        setErro("Cole o link oficial antes de puxar informações.");
        return;
      }

      const resposta = await fetch("/api/campanhas/importar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.link_oficial }),
      });

      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        throw new Error(json.erro || "Erro ao puxar informações.");
      }

      const dados = json.dados || {};

      setForm((atual) => {
        const tipoDetectado =
          dados.simulador_tipo ||
          (dados.tem_simulador ? "link_externo" : "nenhum");

        const temSimuladorDetectado =
          dados.tem_simulador === true || tipoDetectado !== "nenhum";

        return {
          ...atual,

          nome: atual.nome || dados.nome || dados.titulo_publico || "",
          titulo_publico: atual.titulo_publico || dados.titulo_publico || "",
          imagem_url: atual.imagem_url || dados.imagem_url || "",

          resumo_operador: atual.resumo_operador || dados.resumo_operador || "",

          regras_principais:
            atual.regras_principais || dados.regras_principais || "",

          script_ligacao: atual.script_ligacao || dados.script_ligacao || "",

          mensagem_whatsapp:
            atual.mensagem_whatsapp || dados.mensagem_whatsapp || "",

          objecoes: atual.objecoes || dados.objecoes || "",

          tem_simulador: atual.tem_simulador || temSimuladorDetectado,

          simulador_tipo:
            atual.simulador_tipo !== "nenhum"
              ? atual.simulador_tipo
              : tipoDetectado,

          simulador_liberado: atual.simulador_liberado,

          link_simulador:
            dados.link_simulador ||
            atual.link_simulador ||
            (temSimuladorDetectado ? atual.link_oficial : ""),

          simulador_observacao:
            dados.simulador_observacao ||
            atual.simulador_observacao ||
            (temSimuladorDetectado
              ? "Link de origem da campanha usado como referência do simulador."
              : ""),
        };
      });

      setMensagem(
        dados.tem_simulador
          ? "Informações puxadas. Simulador detectado e mantido conforme configuração da campanha."
          : "Informações puxadas.",
      );
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao puxar informações.",
      );
    } finally {
      setImportando(false);
    }
  }
  if (carregando) {
    return (
      <main className="flow-premium-page grid min-h-[70vh] place-items-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
          <p className="mt-3 text-sm font-black text-slate-700">
            Carregando campanhas...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flow-premium-page min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-blue-700">
                <Megaphone className="h-4 w-4" />
                Central de campanhas
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                Campanhas
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
                Campanha ativa, regras, script, mensagem pronta e simulador
                interno controlado pela supervisão.
              </p>
            </div>

            {podeGerenciar && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setModoOperador((v) => !v)}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:border-blue-200 hover:text-blue-700"
                >
                  {modoOperador ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {modoOperador ? "Voltar modo admin" : "Ver modo operador"}
                </button>

                {!modoOperador && (
                  <button
                    type="button"
                    onClick={novaCampanha}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white shadow-lg shadow-blue-700/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    Nova campanha
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {erro && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            {mensagem}
          </div>
        )}

        {modoOperador && podeGerenciar && (
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <p className="flex items-center gap-2 text-sm font-black text-blue-800">
              <Eye className="h-4 w-4" />
              Prévia do modo operador
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-blue-700">
              Neste modo aparecem somente campanhas ativas e informações úteis
              para a operação. Ações administrativas ficam ocultas.
            </p>
          </div>
        )}

        <section
          className={`grid gap-5 ${modoOperador ? "xl:grid-cols-1" : "xl:grid-cols-[390px_1fr]"}`}
        >
          {!modoOperador && (
            <aside className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Campanhas cadastradas
              </p>

              <div className="mb-4 grid grid-cols-2 gap-2">
                {[
                  { id: "ativas", label: "Ativas" },
                  { id: "desativadas", label: "Desativadas" },
                  { id: "arquivadas", label: "Arquivadas" },
                  { id: "todas", label: "Todas" },
                ].map((filtro) => (
                  <button
                    key={filtro.id}
                    type="button"
                    onClick={() => {
                      setFiltroCampanhas(filtro.id as FiltroCampanhas);
                      setSelecionadaId("");
                      setEditando(false);
                    }}
                    className={`h-10 rounded-2xl border px-3 text-xs font-black transition ${
                      filtroCampanhas === filtro.id
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>

              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Resultado
                </p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  {campanhasFiltradas.length} campanha(s)
                </p>
              </div>

              <div className="grid gap-3">
                {campanhasFiltradas.length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                    Nenhuma campanha encontrada neste filtro.
                  </div>
                ) : (
                  campanhasFiltradas.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selecionar(item)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        campanha?.id === item.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{item.nome}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {formatarData(item.data_inicio)} até{" "}
                            {formatarData(item.data_fim)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>

                      {item.tem_simulador && (
                        <span
                          className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${
                            item.simulador_liberado
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          Simulador{" "}
                          {item.simulador_liberado ? "liberado" : "bloqueado"}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </aside>
          )}

          <section className="space-y-5">
            {campanha ? (
              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
                <div className="p-6">
                  <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                    <div className="flex items-start gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-3">
                        {campanha.imagem_url ? (
                          <img
                            src={campanha.imagem_url}
                            alt={campanha.nome}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-xs font-black text-slate-400">
                            Sem imagem
                          </div>
                        )}
                      </div>

                      <div className="pt-1">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusClass(
                            campanha.status,
                          )}`}
                        >
                          {statusLabel(campanha.status)}
                        </span>

                        <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                          {campanha.titulo_publico || campanha.nome}
                        </h2>

                        <p className="mt-2 text-sm font-bold text-slate-500">
                          {formatarData(campanha.data_inicio)} até{" "}
                          {formatarData(campanha.data_fim)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {campanha.mostrar_link_oficial &&
                        campanha.link_oficial && (
                          <a
                            href={campanha.link_oficial}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-700 px-4 text-sm font-black text-white"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Página oficial
                          </a>
                        )}

                      {campanha.tem_simulador &&
                        (campanha.simulador_liberado || podeGerenciar) && (
                          <Link
                            href={`/dashboard/campanhas/${campanha.id}/simulador`}
                            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white"
                          >
                            <Settings2 className="h-4 w-4" />
                            Abrir simulador
                          </Link>
                        )}

                      <button
                        type="button"
                        onClick={copiarMensagem}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
                      >
                        <Clipboard className="h-4 w-4" />
                        Copiar mensagem
                      </button>
                    </div>
                  </div>

                  {campanha.tem_simulador && !campanha.simulador_liberado && (
                    <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-black text-red-700">
                        Simulador bloqueado para operador.
                      </p>
                      <p className="mt-1 text-xs font-bold text-red-600">
                        Admin consegue abrir para testar. Operador só acessa
                        quando for liberado.
                      </p>
                    </div>
                  )}

                  {podeGerenciar && !modoOperador && (
                    <div className="mt-5 flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <button
                        type="button"
                        onClick={editarCampanha}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-black text-white"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar campanha
                      </button>

                      {campanha.status === "ativa" ? (
                        <button
                          type="button"
                          onClick={() => mudarStatus("pausada")}
                          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-amber-500 px-4 text-xs font-black text-white"
                        >
                          <XCircle className="h-4 w-4" />
                          Desativar campanha
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => mudarStatus("ativa")}
                          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-black text-white"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Ativar campanha
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => mudarStatus("arquivada")}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-500 px-4 text-xs font-black text-white"
                      >
                        <Archive className="h-4 w-4" />
                        Arquivar
                      </button>

                      <button
                        type="button"
                        onClick={excluirCampanha}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl bg-red-600 px-4 text-xs font-black text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  )}

                  {modoOperador ? (
                    <div className="mt-6 space-y-6">
                      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                          Leitura rápida para operação
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-blue-900">
                          {visaoOperador.abertura}
                        </p>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                            Como funciona
                          </h3>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            leitura rápida
                          </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                          {visaoOperador.passos.map((passo) => (
                            <div
                              key={`${passo.numero}-${passo.titulo}`}
                              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-slate-950">
                                {passo.numero}
                              </div>
                              <p className="mt-3 text-sm font-black text-slate-900">
                                {passo.titulo}
                              </p>
                              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                                {passo.descricao}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-3 text-lg font-black tracking-[-0.03em] text-slate-950">
                          Benefícios principais
                        </h3>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          {visaoOperador.beneficios.map((beneficio) => (
                            <div
                              key={`${beneficio.destaque}-${beneficio.titulo}`}
                              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="inline-flex rounded-2xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                {beneficio.destaque}
                              </div>
                              <p className="mt-3 text-sm font-black text-slate-900">
                                {beneficio.titulo}
                              </p>
                              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                                {beneficio.descricao}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <p className="text-sm font-black text-slate-900">
                            Abordagem rápida
                          </p>
                          <div className="mt-3 grid gap-3">
                            {visaoOperador.perguntas.map((pergunta) => (
                              <div
                                key={pergunta}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                              >
                                {pergunta}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <p className="text-sm font-black text-slate-900">
                            Objeções rápidas
                          </p>
                          <div className="mt-3 grid gap-3">
                            {visaoOperador.objecoes.map((objecao) => (
                              <div
                                key={objecao.titulo}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                              >
                                <p className="text-sm font-black text-slate-900">
                                  {objecao.titulo}
                                </p>
                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                                  {objecao.resposta}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-5 xl:grid-cols-2">
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm font-black">
                          Resumo para operação
                        </p>
                        <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">
                          {campanha.resumo_operador ||
                            "Resumo ainda não cadastrado."}
                        </p>
                      </div>

                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm font-black">Regras rápidas</p>
                        <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">
                          {campanha.regras_principais ||
                            "Regras rápidas ainda não cadastradas."}
                        </p>
                      </div>

                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm font-black">Script de ligação</p>
                        <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">
                          {campanha.script_ligacao ||
                            "Script ainda não cadastrado."}
                        </p>
                      </div>

                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm font-black">
                          Objeções e respostas
                        </p>
                        <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">
                          {campanha.objecoes ||
                            "Objeções ainda não cadastradas."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-lg font-black">
                  Nenhuma campanha encontrada neste filtro.
                </p>
              </div>
            )}

            {podeGerenciar && !modoOperador && editando && (
              <form
                onSubmit={salvar}
                className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                      Administração
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      {form.id ? "Editar campanha" : "Nova campanha"}
                    </h2>
                  </div>

                  <button
                    type="submit"
                    disabled={salvando}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white disabled:opacity-60"
                  >
                    {salvando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar campanha
                  </button>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <Campo
                    label="Nome da campanha"
                    name="nome"
                    value={form.nome}
                    onChange={mudarCampo}
                  />
                  <Campo
                    label="Data início"
                    name="data_inicio"
                    value={form.data_inicio}
                    onChange={mudarCampo}
                    type="date"
                  />
                  <Campo
                    label="Data fim"
                    name="data_fim"
                    value={form.data_fim}
                    onChange={mudarCampo}
                    type="date"
                  />

                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </span>
                    <select
                      name="status"
                      value={form.status}
                      onChange={mudarCampo}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none"
                    >
                      <option value="ativa">Ativa</option>
                      <option value="pausada">Desativada</option>
                      <option value="encerrada">Encerrada</option>
                      <option value="arquivada">Arquivada</option>
                    </select>
                  </label>

                  <Campo
                    label="Título público"
                    name="titulo_publico"
                    value={form.titulo_publico}
                    onChange={mudarCampo}
                  />
                  <Campo
                    label="Imagem principal"
                    name="imagem_url"
                    value={form.imagem_url}
                    onChange={mudarCampo}
                  />

                  <div className="xl:col-span-3 grid gap-2">
                    <Campo
                      label="Link oficial"
                      name="link_oficial"
                      value={form.link_oficial}
                      onChange={mudarCampo}
                      placeholder="https://conteudo.azulveiculos.com.br/copaazul"
                    />

                    <button
                      type="button"
                      onClick={puxarInformacoes}
                      disabled={importando || !form.link_oficial.trim()}
                      className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white disabled:opacity-50"
                    >
                      {importando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Puxar informações
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => alternar("mostrar_link_oficial")}
                    className={`rounded-3xl border p-4 text-left ${
                      form.mostrar_link_oficial
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="font-black">Mostrar link oficial</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Operador pode abrir a página da campanha.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => alternar("tem_simulador")}
                    className={`rounded-3xl border p-4 text-left ${
                      form.tem_simulador
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="font-black">
                      Esta Usar simulador nesta campanha
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Habilita acesso ao simulador configurado para esta
                      campanha.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!form.tem_simulador}
                    onClick={() => alternar("simulador_liberado")}
                    className={`rounded-3xl border p-4 text-left disabled:opacity-50 ${
                      form.simulador_liberado
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <p className="font-black">
                      {form.simulador_liberado
                        ? "Simulador liberado"
                        : "Simulador bloqueado"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Controla se a operação pode acessar o simulador desta
                      campanha.
                    </p>
                  </button>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Tipo de simulador
                    </span>
                    <select
                      name="simulador_tipo"
                      value={form.simulador_tipo}
                      onChange={mudarCampo}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none"
                    >
                      <option value="nenhum">Nenhum simulador</option>
                      <option value="copa_azul">
                        Simulador interno Copa Azul
                      </option>
                      <option value="link_externo">
                        Link externo / simulador da campanha
                      </option>
                    </select>
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-800">
                      Personalizável por campanha
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                      Use Copa Azul apenas nessa campanha. Para outras
                      campanhas, escolha Link externo ou Nenhum.
                    </p>
                  </div>
                </div>

                {form.tem_simulador && (
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <Campo
                      label="Link de origem / referência do simulador"
                      name="link_simulador"
                      value={form.link_simulador}
                      onChange={mudarCampo}
                    />
                    <Campo
                      label="Observação do simulador"
                      name="simulador_observacao"
                      value={form.simulador_observacao}
                      onChange={mudarCampo}
                    />
                  </div>
                )}

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <Area
                    label="Resumo para operação"
                    name="resumo_operador"
                    value={form.resumo_operador}
                    onChange={mudarCampo}
                  />
                  <Area
                    label="Regras rápidas"
                    name="regras_principais"
                    value={form.regras_principais}
                    onChange={mudarCampo}
                  />
                  <Area
                    label="Script de ligação"
                    name="script_ligacao"
                    value={form.script_ligacao}
                    onChange={mudarCampo}
                  />
                  <Area
                    label="Objeções e respostas"
                    name="objecoes"
                    value={form.objecoes}
                    onChange={mudarCampo}
                  />

                  <div className="xl:col-span-2">
                    <Area
                      label="Mensagem WhatsApp"
                      name="mensagem_whatsapp"
                      value={form.mensagem_whatsapp}
                      onChange={mudarCampo}
                      rows={6}
                    />
                  </div>
                </div>
              </form>
            )}
          </section>
        </section>
        {confirmacao && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
              <div
                className={`h-2 ${
                  confirmacao.variante === "red"
                    ? "bg-red-600"
                    : confirmacao.variante === "amber"
                      ? "bg-amber-500"
                      : confirmacao.variante === "emerald"
                        ? "bg-emerald-600"
                        : "bg-slate-600"
                }`}
              />

              <div className="p-6">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    confirmacao.variante === "red"
                      ? "bg-red-100 text-red-700"
                      : confirmacao.variante === "amber"
                        ? "bg-amber-100 text-amber-700"
                        : confirmacao.variante === "emerald"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {confirmacao.tipo === "excluir" ? (
                    <Trash2 className="h-5 w-5" />
                  ) : confirmacao.variante === "emerald" ? (
                    <PlayCircle className="h-5 w-5" />
                  ) : confirmacao.variante === "amber" ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <Archive className="h-5 w-5" />
                  )}
                </div>

                <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                  {confirmacao.titulo}
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  {confirmacao.descricao}
                </p>

                {confirmacao.tipo === "excluir" && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
                        Confirmação obrigatória
                      </span>
                      <p className="text-xs font-bold leading-5 text-red-700">
                        Para excluir definitivamente, digite EXCLUIR abaixo. Se
                        quer manter histórico, use Arquivar.
                      </p>
                      <input
                        value={textoConfirmacaoExclusao}
                        onChange={(event) =>
                          setTextoConfirmacaoExclusao(event.target.value)
                        }
                        placeholder="Digite EXCLUIR"
                        className="h-11 rounded-2xl border border-red-200 bg-white px-4 text-sm font-black uppercase text-red-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                      />
                    </label>
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Cancelamento automático
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    Se você não confirmar, essa janela fecha em{" "}
                    {contadorConfirmacao}s.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={confirmandoAcao}
                    onClick={() => {
                      setConfirmacao(null);
                      setTextoConfirmacaoExclusao("");
                    }}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={
                      confirmandoAcao ||
                      (confirmacao.tipo === "excluir" &&
                        textoConfirmacaoExclusao.trim().toUpperCase() !==
                          "EXCLUIR")
                    }
                    onClick={confirmarAcao}
                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      confirmacao.variante === "red"
                        ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                        : confirmacao.variante === "amber"
                          ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                          : confirmacao.variante === "emerald"
                            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                            : "bg-slate-700 hover:bg-slate-800 shadow-slate-700/20"
                    }`}
                  >
                    {confirmandoAcao && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {confirmacao.confirmarTexto} ({contadorConfirmacao}s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {confirmacao && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
              <div
                className={`h-2 ${
                  confirmacao.variante === "red"
                    ? "bg-red-600"
                    : confirmacao.variante === "amber"
                      ? "bg-amber-500"
                      : confirmacao.variante === "emerald"
                        ? "bg-emerald-600"
                        : "bg-slate-600"
                }`}
              />

              <div className="p-6">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    confirmacao.variante === "red"
                      ? "bg-red-100 text-red-700"
                      : confirmacao.variante === "amber"
                        ? "bg-amber-100 text-amber-700"
                        : confirmacao.variante === "emerald"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {confirmacao.tipo === "excluir" ? (
                    <Trash2 className="h-5 w-5" />
                  ) : confirmacao.variante === "emerald" ? (
                    <PlayCircle className="h-5 w-5" />
                  ) : confirmacao.variante === "amber" ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <Archive className="h-5 w-5" />
                  )}
                </div>

                <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                  {confirmacao.titulo}
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  {confirmacao.descricao}
                </p>

                {confirmacao.tipo === "excluir" && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <label className="grid gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
                        Confirmação obrigatória
                      </span>
                      <p className="text-xs font-bold leading-5 text-red-700">
                        Para excluir definitivamente, digite EXCLUIR abaixo. Se
                        quer manter histórico, use Arquivar.
                      </p>
                      <input
                        value={textoConfirmacaoExclusao}
                        onChange={(event) =>
                          setTextoConfirmacaoExclusao(event.target.value)
                        }
                        placeholder="Digite EXCLUIR"
                        className="h-11 rounded-2xl border border-red-200 bg-white px-4 text-sm font-black uppercase text-red-700 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                      />
                    </label>
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Cancelamento automático
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    Se você não confirmar, essa janela fecha em{" "}
                    {contadorConfirmacao}s.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={confirmandoAcao}
                    onClick={() => {
                      setConfirmacao(null);
                      setTextoConfirmacaoExclusao("");
                    }}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={
                      confirmandoAcao ||
                      (confirmacao.tipo === "excluir" &&
                        textoConfirmacaoExclusao.trim().toUpperCase() !==
                          "EXCLUIR")
                    }
                    onClick={confirmarAcao}
                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      confirmacao.variante === "red"
                        ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                        : confirmacao.variante === "amber"
                          ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                          : confirmacao.variante === "emerald"
                            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                            : "bg-slate-700 hover:bg-slate-800 shadow-slate-700/20"
                    }`}
                  >
                    {confirmandoAcao && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {confirmacao.confirmarTexto} ({contadorConfirmacao}s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
