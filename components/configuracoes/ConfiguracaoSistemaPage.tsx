"use client";

import {
  Bell,
  CalendarDays,
  CheckCircle2,
  DatabaseZap,
  KanbanSquare,
  Loader2,
  MonitorCog,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ConfigSlug =
  | "geral"
  | "tema"
  | "notificacoes"
  | "operacao-pausas"
  | "crm-leads"
  | "agenda"
  | "kanban"
  | "integracoes"
  | "api"
  | "permissoes";

type CampoTipo = "texto" | "numero" | "select" | "toggle";

type CampoConfig = {
  tipo: CampoTipo;
  chave: string;
  label: string;
  descricao?: string;
  opcoes?: { label: string; value: string }[];
  min?: number;
  max?: number;
  suffix?: string;
};

type ConfigDef = {
  slug: ConfigSlug;
  modulo: string;
  titulo: string;
  subtitulo: string;
  chaveConfig: string;
  descricaoConfig: string;
  icon: React.ElementType;
  campos: CampoConfig[];
  defaults: Record<string, any>;
};

type ConfigItemApi = {
  chave: string;
  valor: Record<string, any>;
};

type ConfiguracoesApi = {
  ok: boolean;
  erro?: string;
  usuario?: {
    id: string;
    nome: string;
    email?: string;
    perfil: string;
  };
  configuracoes?: {
    sistema?: ConfigItemApi[];
    global?: ConfigItemApi[];
    perfil?: ConfigItemApi[];
    usuario?: ConfigItemApi[];
  };
};

const OPCOES_SIM_NAO = [
  { label: "Sim", value: "true" },
  { label: "Não", value: "false" },
];

const CONFIGS: Record<ConfigSlug, ConfigDef> = {
  geral: {
    slug: "geral",
    modulo: "Sistema",
    titulo: "Configurações gerais",
    subtitulo:
      "Preferências base do CRM. Essas opções são globais e servem como referência para o sistema inteiro.",
    chaveConfig: "sistema_geral_global",
    descricaoConfig: "Configurações gerais do Flow Sales CRM.",
    icon: Settings,
    defaults: {
      nome_sistema: "Flow Sales CRM",
      empresa: "Azul Veículos",
      pagina_inicial: "/dashboard",
      fuso_horario: "America/Sao_Paulo",
      modo_manutencao: false,
      exibir_cards_resumo: true,
    },
    campos: [
      {
        tipo: "texto",
        chave: "nome_sistema",
        label: "Nome do sistema",
        descricao: "Nome exibido internamente.",
      },
      {
        tipo: "texto",
        chave: "empresa",
        label: "Empresa",
        descricao: "Nome da empresa exibido em áreas administrativas.",
      },
      {
        tipo: "texto",
        chave: "pagina_inicial",
        label: "Página inicial",
        descricao: "Rota padrão após entrar no painel.",
      },
      {
        tipo: "select",
        chave: "fuso_horario",
        label: "Fuso horário",
        opcoes: [
          { label: "São Paulo", value: "America/Sao_Paulo" },
          { label: "UTC", value: "UTC" },
        ],
      },
      {
        tipo: "toggle",
        chave: "modo_manutencao",
        label: "Modo manutenção",
        descricao: "Usado para bloquear operações sensíveis quando necessário.",
      },
      {
        tipo: "toggle",
        chave: "exibir_cards_resumo",
        label: "Exibir cards de resumo",
        descricao: "Controla cards gerais em páginas administrativas.",
      },
    ],
  },

  tema: {
    slug: "tema",
    modulo: "Sistema",
    titulo: "Tema e aparência",
    subtitulo:
      "Controla tema claro/escuro, densidade, fonte, cor principal e padrão de abertura do menu.",
    chaveConfig: "aparencia_global",
    descricaoConfig: "Configuração global de aparência.",
    icon: MonitorCog,
    defaults: {
      tema_padrao: "claro",
      cor_principal: "blue",
      densidade: "confortavel",
      menu_padrao: "aberto",
      fonte: "padrao",
    },
    campos: [
      {
        tipo: "select",
        chave: "tema_padrao",
        label: "Tema padrão",
        descricao: "Tema usado por quem escolheu seguir o sistema.",
        opcoes: [
          { label: "Claro", value: "claro" },
          { label: "Escuro", value: "escuro" },
          { label: "Acompanhar sistema", value: "acompanhar_sistema" },
        ],
      },
      {
        tipo: "select",
        chave: "cor_principal",
        label: "Cor principal",
        opcoes: [
          { label: "Azul", value: "blue" },
          { label: "Cinza", value: "slate" },
          { label: "Verde", value: "emerald" },
        ],
      },
      {
        tipo: "select",
        chave: "densidade",
        label: "Densidade",
        opcoes: [
          { label: "Compacta", value: "compacta" },
          { label: "Confortável", value: "confortavel" },
          { label: "Ampla", value: "ampla" },
        ],
      },
      {
        tipo: "select",
        chave: "menu_padrao",
        label: "Menu padrão",
        opcoes: [
          { label: "Aberto", value: "aberto" },
          { label: "Fechado", value: "fechado" },
        ],
      },
      {
        tipo: "select",
        chave: "fonte",
        label: "Fonte",
        opcoes: [
          { label: "Padrão", value: "padrao" },
          { label: "Grande", value: "grande" },
          { label: "Compacta", value: "compacta" },
        ],
      },
    ],
  },

  notificacoes: {
    slug: "notificacoes",
    modulo: "Sistema",
    titulo: "Notificações",
    subtitulo:
      "Controla som, volume, popup, sininho e alertas operacionais do CRM.",
    chaveConfig: "notificacoes_global",
    descricaoConfig: "Configuração global de notificações.",
    icon: Bell,
    defaults: {
      som_ativo: true,
      volume: 80,
      popup_ativo: true,
      popup_tempo_segundos: 30,
      agendamento_chegando_minutos: 15,
      notificar_novo_lead: true,
      notificar_agendamento_atrasado: true,
      notificar_venda_resgate: true,
    },
    campos: [
      { tipo: "toggle", chave: "som_ativo", label: "Som ativo" },
      {
        tipo: "numero",
        chave: "volume",
        label: "Volume padrão",
        min: 0,
        max: 100,
        suffix: "%",
      },
      { tipo: "toggle", chave: "popup_ativo", label: "Popup ativo" },
      {
        tipo: "numero",
        chave: "popup_tempo_segundos",
        label: "Tempo do popup",
        min: 3,
        max: 120,
        suffix: "seg",
      },
      {
        tipo: "numero",
        chave: "agendamento_chegando_minutos",
        label: "Avisar agendamento chegando",
        min: 1,
        max: 180,
        suffix: "min",
      },
      {
        tipo: "toggle",
        chave: "notificar_novo_lead",
        label: "Notificar novo lead",
      },
      {
        tipo: "toggle",
        chave: "notificar_agendamento_atrasado",
        label: "Notificar agendamento atrasado",
      },
      {
        tipo: "toggle",
        chave: "notificar_venda_resgate",
        label: "Notificar venda de resgate",
      },
    ],
  },

  "operacao-pausas": {
    slug: "operacao-pausas",
    modulo: "Operação",
    titulo: "Operação e pausas",
    subtitulo:
      "Regras reais para status, pausas, bloqueio de leads e comportamento operacional.",
    chaveConfig: "operacao_pausas_global",
    descricaoConfig: "Regras globais de operação e pausas.",
    icon: SlidersHorizontal,
    defaults: {
      bloquear_leads_indisponivel: true,
      bloquear_leads_pausa_almoco: true,
      exigir_motivo_pausa: true,
      exigir_senha_feedback: true,
      permitir_operador_alterar_status: true,
      retorno_almoco_auto_minutos: 90,
      alerta_pausa_excedida_minutos: 5,
      status_inicial: "disponivel",
    },
    campos: [
      {
        tipo: "toggle",
        chave: "bloquear_leads_indisponivel",
        label: "Bloquear leads quando indisponível",
      },
      {
        tipo: "toggle",
        chave: "bloquear_leads_pausa_almoco",
        label: "Bloquear leads no almoço",
      },
      {
        tipo: "toggle",
        chave: "exigir_motivo_pausa",
        label: "Exigir motivo da pausa",
      },
      {
        tipo: "toggle",
        chave: "exigir_senha_feedback",
        label: "Exigir senha para pausa feedback",
      },
      {
        tipo: "toggle",
        chave: "permitir_operador_alterar_status",
        label: "Operador pode alterar próprio status",
      },
      {
        tipo: "numero",
        chave: "retorno_almoco_auto_minutos",
        label: "Retorno automático do almoço",
        min: 0,
        max: 240,
        suffix: "min",
      },
      {
        tipo: "numero",
        chave: "alerta_pausa_excedida_minutos",
        label: "Alerta de pausa excedida",
        min: 0,
        max: 60,
        suffix: "min",
      },
      {
        tipo: "select",
        chave: "status_inicial",
        label: "Status inicial",
        opcoes: [
          { label: "Disponível", value: "disponivel" },
          { label: "Offline", value: "offline" },
          { label: "Indisponível", value: "indisponivel" },
        ],
      },
    ],
  },

  "crm-leads": {
    slug: "crm-leads",
    modulo: "CRM e Leads",
    titulo: "CRM e Leads",
    subtitulo:
      "Regras comerciais e de resgate que os módulos de leads devem respeitar.",
    chaveConfig: "crm_regras_global",
    descricaoConfig: "Regras globais do CRM e resgate.",
    icon: UserRound,
    defaults: {
      exigir_observacao_ao_mover: true,
      exigir_proxima_acao: true,
      bloquear_troca_vendedor_original: true,
      somente_adm_troca_vendedor: true,
      manter_vendedor_c2s: true,
      comissao_resgate_ativa: true,
      operador_pode_criar_lead_manual: false,
      supervisor_aprova_lead_manual: true,
    },
    campos: [
      {
        tipo: "toggle",
        chave: "exigir_observacao_ao_mover",
        label: "Exigir observação ao mover lead",
      },
      {
        tipo: "toggle",
        chave: "exigir_proxima_acao",
        label: "Exigir próxima ação",
      },
      {
        tipo: "toggle",
        chave: "bloquear_troca_vendedor_original",
        label: "Bloquear troca do vendedor original",
      },
      {
        tipo: "toggle",
        chave: "somente_adm_troca_vendedor",
        label: "Somente ADM troca vendedor",
      },
      {
        tipo: "toggle",
        chave: "manter_vendedor_c2s",
        label: "Manter vendedor original do C2S",
      },
      {
        tipo: "toggle",
        chave: "comissao_resgate_ativa",
        label: "Comissão de resgate ativa",
      },
      {
        tipo: "toggle",
        chave: "operador_pode_criar_lead_manual",
        label: "Operador pode criar lead manual",
      },
      {
        tipo: "toggle",
        chave: "supervisor_aprova_lead_manual",
        label: "Supervisora aprova lead manual",
      },
    ],
  },

  agenda: {
    slug: "agenda",
    modulo: "CRM e Leads",
    titulo: "Agenda",
    subtitulo:
      "Regras reais de confirmação, atraso, reagendamento e validações da agenda.",
    chaveConfig: "agenda_regras_global",
    descricaoConfig: "Regras globais da agenda.",
    icon: CalendarDays,
    defaults: {
      confirmar_presenca_minutos: 60,
      alerta_atraso_minutos: 10,
      intervalo_padrao_minutos: 30,
      bloquear_horario_duplicado: true,
      exigir_vendedor_responsavel: true,
      permitir_reagendamento_operador: true,
      notificar_supervisor_atraso: true,
    },
    campos: [
      {
        tipo: "numero",
        chave: "confirmar_presenca_minutos",
        label: "Confirmar presença",
        min: 5,
        max: 1440,
        suffix: "min antes",
      },
      {
        tipo: "numero",
        chave: "alerta_atraso_minutos",
        label: "Alerta de atraso",
        min: 1,
        max: 120,
        suffix: "min",
      },
      {
        tipo: "numero",
        chave: "intervalo_padrao_minutos",
        label: "Intervalo padrão",
        min: 5,
        max: 120,
        suffix: "min",
      },
      {
        tipo: "toggle",
        chave: "bloquear_horario_duplicado",
        label: "Bloquear horário duplicado",
      },
      {
        tipo: "toggle",
        chave: "exigir_vendedor_responsavel",
        label: "Exigir vendedor responsável",
      },
      {
        tipo: "toggle",
        chave: "permitir_reagendamento_operador",
        label: "Operador pode reagendar",
      },
      {
        tipo: "toggle",
        chave: "notificar_supervisor_atraso",
        label: "Notificar supervisora em atraso",
      },
    ],
  },

  kanban: {
    slug: "kanban",
    modulo: "CRM e Leads",
    titulo: "Kanban",
    subtitulo:
      "Regras de funil, movimentação de cards, bloqueios e exibição do kanban.",
    chaveConfig: "kanban_regras_global",
    descricaoConfig: "Regras globais do kanban.",
    icon: KanbanSquare,
    defaults: {
      exigir_observacao_ao_mover: true,
      exigir_proxima_acao: true,
      bloquear_pular_etapa: false,
      permitir_arrastar_colunas_fechadas: false,
      destacar_atrasados: true,
      mostrar_valor_card: true,
      mostrar_vendedor_original: true,
    },
    campos: [
      {
        tipo: "toggle",
        chave: "exigir_observacao_ao_mover",
        label: "Exigir observação ao mover",
      },
      {
        tipo: "toggle",
        chave: "exigir_proxima_acao",
        label: "Exigir próxima ação",
      },
      {
        tipo: "toggle",
        chave: "bloquear_pular_etapa",
        label: "Bloquear pular etapa",
      },
      {
        tipo: "toggle",
        chave: "permitir_arrastar_colunas_fechadas",
        label: "Permitir arrastar para colunas fechadas",
      },
      {
        tipo: "toggle",
        chave: "destacar_atrasados",
        label: "Destacar cards atrasados",
      },
      {
        tipo: "toggle",
        chave: "mostrar_valor_card",
        label: "Mostrar valor no card",
      },
      {
        tipo: "toggle",
        chave: "mostrar_vendedor_original",
        label: "Mostrar vendedor original",
      },
    ],
  },

  integracoes: {
    slug: "integracoes",
    modulo: "Integrações",
    titulo: "Integrações",
    subtitulo:
      "Controle real das integrações ativas e intervalos de sincronização.",
    chaveConfig: "integracoes_global",
    descricaoConfig: "Configurações globais de integrações.",
    icon: DatabaseZap,
    defaults: {
      c2s_ativo: true,
      trescx_ativo: true,
      whatsapp_ativo: true,
      vendas_sheets_ativo: true,
      gerar_notificacoes_whatsapp: true,
      sincronizar_c2s_minutos: 15,
      importar_3cx_minutos: 15,
      sincronizar_vendas_minutos: 15,
    },
    campos: [
      { tipo: "toggle", chave: "c2s_ativo", label: "C2S ativo" },
      { tipo: "toggle", chave: "trescx_ativo", label: "3CX ativo" },
      { tipo: "toggle", chave: "whatsapp_ativo", label: "WhatsApp ativo" },
      {
        tipo: "toggle",
        chave: "vendas_sheets_ativo",
        label: "Planilhas de vendas ativas",
      },
      {
        tipo: "toggle",
        chave: "gerar_notificacoes_whatsapp",
        label: "Gerar notificações de WhatsApp",
      },
      {
        tipo: "numero",
        chave: "sincronizar_c2s_minutos",
        label: "Sincronizar C2S",
        min: 5,
        max: 1440,
        suffix: "min",
      },
      {
        tipo: "numero",
        chave: "importar_3cx_minutos",
        label: "Importar 3CX",
        min: 5,
        max: 1440,
        suffix: "min",
      },
      {
        tipo: "numero",
        chave: "sincronizar_vendas_minutos",
        label: "Sincronizar vendas",
        min: 5,
        max: 1440,
        suffix: "min",
      },
    ],
  },

  api: {
    slug: "api",
    modulo: "Integrações",
    titulo: "API",
    subtitulo:
      "Regras administrativas para uso de API, logs, tokens e segurança.",
    chaveConfig: "api_regras_global",
    descricaoConfig: "Regras globais da API.",
    icon: ShieldCheck,
    defaults: {
      api_ativa: true,
      exigir_token: true,
      registrar_logs_api: true,
      permitir_webhooks: true,
      bloquear_origem_externa: true,
      limite_requisicoes_minuto: 120,
    },
    campos: [
      { tipo: "toggle", chave: "api_ativa", label: "API ativa" },
      { tipo: "toggle", chave: "exigir_token", label: "Exigir token" },
      {
        tipo: "toggle",
        chave: "registrar_logs_api",
        label: "Registrar logs de API",
      },
      {
        tipo: "toggle",
        chave: "permitir_webhooks",
        label: "Permitir webhooks",
      },
      {
        tipo: "toggle",
        chave: "bloquear_origem_externa",
        label: "Bloquear origem externa",
      },
      {
        tipo: "numero",
        chave: "limite_requisicoes_minuto",
        label: "Limite de requisições",
        min: 10,
        max: 2000,
        suffix: "/min",
      },
    ],
  },

  permissoes: {
    slug: "permissoes",
    modulo: "Sistema",
    titulo: "Permissões",
    subtitulo:
      "Regras básicas por perfil. A gestão de usuários continua em Usuários, mas essas flags ficam salvas no sistema.",
    chaveConfig: "permissoes_perfis_global",
    descricaoConfig: "Regras globais de permissões.",
    icon: CheckCircle2,
    defaults: {
      operador_ve_somente_proprios: true,
      supervisor_ve_geral: true,
      gerente_ve_loja: true,
      admin_edita_configuracoes: true,
      operador_pode_exportar: false,
      supervisor_pode_validar_resgate: true,
      gerente_pode_remover_vinculo: true,
    },
    campos: [
      {
        tipo: "toggle",
        chave: "operador_ve_somente_proprios",
        label: "Operador vê somente próprios dados",
      },
      {
        tipo: "toggle",
        chave: "supervisor_ve_geral",
        label: "Supervisor vê geral",
      },
      {
        tipo: "toggle",
        chave: "gerente_ve_loja",
        label: "Gerente vê loja",
      },
      {
        tipo: "toggle",
        chave: "admin_edita_configuracoes",
        label: "ADM edita configurações",
      },
      {
        tipo: "toggle",
        chave: "operador_pode_exportar",
        label: "Operador pode exportar",
      },
      {
        tipo: "toggle",
        chave: "supervisor_pode_validar_resgate",
        label: "Supervisor valida resgate",
      },
      {
        tipo: "toggle",
        chave: "gerente_pode_remover_vinculo",
        label: "Gerente remove vínculo",
      },
    ],
  },
};

function aplicarAparenciaCliente(valor: Record<string, any>) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const temaPadrao = String(valor.tema_padrao || "claro");
  const tema =
    temaPadrao === "acompanhar_sistema"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "escuro"
        : "claro"
      : temaPadrao === "escuro"
        ? "escuro"
        : "claro";

  root.classList.remove("flow-theme-claro", "flow-theme-escuro");
  root.classList.add(
    tema === "escuro" ? "flow-theme-escuro" : "flow-theme-claro",
  );

  root.classList.remove(
    "flow-density-compacta",
    "flow-density-confortavel",
    "flow-density-ampla",
  );
  root.classList.add(`flow-density-${valor.densidade || "confortavel"}`);

  root.classList.remove(
    "flow-font-padrao",
    "flow-font-grande",
    "flow-font-compacta",
  );
  root.classList.add(`flow-font-${valor.fonte || "padrao"}`);

  root.dataset.flowTheme = tema;
  root.dataset.flowColor = String(valor.cor_principal || "blue");
}
function buscarValor(
  configs: ConfigItemApi[] | undefined,
  chave: string,
  fallback: Record<string, any>,
) {
  const encontrado = configs?.find((item) => item.chave === chave)?.valor;
  return { ...fallback, ...(encontrado || {}) };
}

function perfilPodeEditar(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gestor"].includes(
    String(perfil || "").toLowerCase(),
  );
}

export function ConfiguracaoSistemaPage({ slug }: { slug: ConfigSlug }) {
  const config = CONFIGS[slug];

  const [valor, setValor] = useState<Record<string, any>>(config.defaults);
  const [usuario, setUsuario] = useState<ConfiguracoesApi["usuario"] | null>(null);
  const [preferenciasUsuario, setPreferenciasUsuario] = useState<
    Record<string, any>
  >({
    tema: "sistema",
    densidade: "confortavel",
    som_ativo: true,
    volume: 100,
    menu_aberto: true,
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const podeEditar = useMemo(
    () => perfilPodeEditar(usuario?.perfil),
    [usuario?.perfil],
  );

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch("/api/configuracoes", {
        cache: "no-store",
      });

      const json = (await resposta
        .json()
        .catch(() => null)) as ConfiguracoesApi | null;

      if (!resposta.ok || !json?.ok) {
        throw new Error(
          json?.erro || "Não foi possível carregar configuração.",
        );
      }

      const globais = [
        ...(json.configuracoes?.sistema || []),
        ...(json.configuracoes?.global || []),
      ];

      const preferencias = buscarValor(
        json.configuracoes?.usuario,
        "preferencias_usuario",
        {
          tema: "sistema",
          densidade: "confortavel",
          som_ativo: true,
          volume: 100,
          menu_aberto: true,
        },
      );

      setUsuario(json.usuario || null);
      setPreferenciasUsuario(preferencias);
      setValor(buscarValor(globais, config.chaveConfig, config.defaults));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar configuração.",
      );
      setValor(config.defaults);
    } finally {
      setCarregando(false);
    }
  }, [config.chaveConfig, config.defaults]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvarCampo(chave: string, proximoValor: any) {
    const proximo = {
      ...valor,
      [chave]: proximoValor,
    };

    setValor(proximo);
    setSalvando(chave);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/configuracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escopo: "global",
          chave: config.chaveConfig,
          valor: proximo,
          descricao: config.descricaoConfig,
        }),
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível salvar configuração.");
      }

      if (config.slug === "tema") {
        const proximasPreferencias = {
          ...preferenciasUsuario,
          tema: "sistema",
          densidade: String(
            proximo.densidade || preferenciasUsuario.densidade || "confortavel",
          ),
        };

        await fetch("/api/configuracoes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            escopo: "usuario",
            chave: "preferencias_usuario",
            valor: proximasPreferencias,
            descricao:
              "Preferências pessoais ajustadas para seguir o tema global.",
          }),
        });

        setPreferenciasUsuario(proximasPreferencias);
        aplicarAparenciaCliente(proximo);
      }

      setSucesso("Configuração salva com sucesso.");
      window.dispatchEvent(new Event("flow-configuracoes-atualizadas"));
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao salvar configuração.",
      );
      await carregar();
    } finally {
      setSalvando("");
    }
  }

  const Icon = config.icon;

  if (carregando) {
    return (
      <main className="flow-premium-page min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto flex min-h-[420px] max-w-[1200px] items-center justify-center rounded-[30px] border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-black text-slate-500">
              Carregando configuração...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flow-premium-page min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-700">
                {config.modulo}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                {config.titulo}
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                {config.subtitulo}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Status
                </p>
                <p className="text-sm font-black text-slate-950">
                  {podeEditar ? "Editável" : "Somente leitura"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {erro}
          </div>
        ) : null}

        {sucesso ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {sucesso}
          </div>
        ) : null}

        {!podeEditar ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
            Seu perfil atual pode visualizar esta configuração, mas não pode
            editar. Alterações globais são liberadas para ADM/Suporte/Gestor.
          </div>
        ) : null}

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {config.campos.map((campo) => (
              <Campo
                key={campo.chave}
                campo={campo}
                valor={valor[campo.chave]}
                disabled={!podeEditar || Boolean(salvando)}
                salvando={salvando === campo.chave}
                onChange={(novoValor) => salvarCampo(campo.chave, novoValor)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Chave salva no sistema
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {config.chaveConfig}
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              disabled={carregando || Boolean(salvando)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Recarregar
            </button>
          </div>
        </section>

        {salvando ? (
          <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl">
            <Save className="h-4 w-4" />
            Salvando {salvando}...
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Campo({
  campo,
  valor,
  disabled,
  salvando,
  onChange,
}: {
  campo: CampoConfig;
  valor: any;
  disabled: boolean;
  salvando: boolean;
  onChange: (valor: any) => void;
}) {
  if (campo.tipo === "toggle") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <p className="font-black text-slate-950">{campo.label}</p>
          {campo.descricao ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {campo.descricao}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(!Boolean(valor))}
          className={`relative h-8 w-14 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
            Boolean(valor) ? "bg-blue-700" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
              Boolean(valor) ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <label className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{campo.label}</p>
          {campo.descricao ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {campo.descricao}
            </p>
          ) : null}
        </div>

        {salvando ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
        ) : null}
      </div>

      {campo.tipo === "select" ? (
        <select
          disabled={disabled}
          value={String(valor ?? "")}
          onChange={(event) => {
            const value = event.target.value;

            if (OPCOES_SIM_NAO.some((opcao) => opcao.value === value)) {
              onChange(value === "true");
              return;
            }

            onChange(value);
          }}
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 focus:bg-white disabled:bg-slate-100"
        >
          {(campo.opcoes || []).map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {opcao.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <input
            disabled={disabled}
            type={campo.tipo === "numero" ? "number" : "text"}
            min={campo.min}
            max={campo.max}
            value={String(valor ?? "")}
            onChange={(event) => {
              if (campo.tipo === "numero") {
                onChange(Number(event.target.value || 0));
                return;
              }

              onChange(event.target.value);
            }}
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 focus:bg-white disabled:bg-slate-100"
          />

          {campo.suffix ? (
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">
              {campo.suffix}
            </span>
          ) : null}
        </div>
      )}
    </label>
  );
}
