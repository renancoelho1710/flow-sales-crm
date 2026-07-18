"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  DatabaseZap,
  Eye,
  KanbanSquare,
  Loader2,
  LockKeyhole,
  MonitorCog,
  Palette,
  Save,
  Settings,
  SlidersHorizontal,
  User,
  Users,
  Volume2,
} from "lucide-react";

type ConfigItem = {
  id?: string;
  chave: string;
  valor: Record<string, any>;
  descricao?: string | null;
  escopo?: string;
  perfil?: string;
  usuario_id?: string;
};

type ApiConfiguracoes = {
  ok: boolean;
  usuario: {
    id: string;
    nome: string;
    email?: string;
    perfil: string;
    ativo?: boolean;
  };
  permissoes: {
    pode_editar_global: boolean;
    pode_editar_perfil: boolean;
    pode_editar_usuario: boolean;
  };
  configuracoes: {
    sistema: ConfigItem[];
    perfil: ConfigItem[];
    usuario: ConfigItem[];
  };
};

type SecaoId =
  | "minha-conta"
  | "aparencia"
  | "notificacoes"
  | "operacao-pausas"
  | "crm-leads"
  | "kanban"
  | "agenda"
  | "integracoes"
  | "permissoes";

const secoes: Array<{
  id: SecaoId;
  label: string;
  icon: any;
  description: string;
  perfis: string[];
}> = [
  {
    id: "minha-conta",
    label: "Minha conta",
    icon: User,
    description: "Preferências pessoais.",
    perfis: ["todos"],
  },
  {
    id: "aparencia",
    label: "Aparência",
    icon: Palette,
    description: "Tema, densidade e visual.",
    perfis: ["todos"],
  },
  {
    id: "notificacoes",
    label: "Notificações",
    icon: Bell,
    description: "Som, popup, sininho e alertas.",
    perfis: ["todos"],
  },
  {
    id: "operacao-pausas",
    label: "Operação e pausas",
    icon: Settings,
    description: "Regras por trás dos status, pausas e bloqueio de leads.",
    perfis: ["adm", "admin", "suporte"],
  },
  {
    id: "crm-leads",
    label: "CRM e Leads",
    icon: SlidersHorizontal,
    description: "Regras comerciais e resgate.",
    perfis: ["adm", "admin", "suporte", "supervisor", "gerente"],
  },
  {
    id: "kanban",
    label: "Kanban",
    icon: KanbanSquare,
    description: "Colunas e lógica do funil.",
    perfis: ["adm", "admin", "suporte", "supervisor", "gerente"],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    description: "Confirmações e atrasos.",
    perfis: ["adm", "admin", "suporte", "supervisor", "gerente"],
  },
  {
    id: "integracoes",
    label: "Integrações",
    icon: DatabaseZap,
    description: "C2S, 3CX e WhatsApp.",
    perfis: ["adm", "admin", "suporte"],
  },
  {
    id: "permissoes",
    label: "Permissões",
    icon: LockKeyhole,
    description: "Perfis e acessos.",
    perfis: ["adm", "admin", "suporte"],
  },
];

function perfilNormalizado(perfil?: string) {
  return String(perfil || "")
    .trim()
    .toLowerCase();
}

function podeVerSecao(perfil: string, perfis: string[]) {
  if (perfis.includes("todos")) return true;
  return perfis.includes(perfilNormalizado(perfil));
}

function buscarValor(
  configs: ConfigItem[],
  chave: string,
  fallback: Record<string, any>,
) {
  return configs.find((item) => item.chave === chave)?.valor || fallback;
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-blue-700" : "bg-slate-300"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
      {children}
    </span>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-base font-black text-slate-950">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm font-medium text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CampoNumero({
  label,
  value,
  disabled,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
        <input
          disabled={disabled}
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-bold outline-none disabled:bg-slate-100"
        />
        {suffix ? (
          <span className="border-l border-slate-100 px-3 text-xs font-black text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

export default function Page() {
  const [aba, setAba] = useState<SecaoId>("minha-conta");
  const [dados, setDados] = useState<ApiConfiguracoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const perfil = perfilNormalizado(dados?.usuario?.perfil);
  const secoesVisiveis = useMemo(
    () => secoes.filter((secao) => podeVerSecao(perfil, secao.perfis)),
    [perfil],
  );

  const sistema = dados?.configuracoes.sistema || [];
  const perfilConfigs = dados?.configuracoes.perfil || [];
  const usuarioConfigs = dados?.configuracoes.usuario || [];

  const aparenciaGlobal = buscarValor(sistema, "aparencia_global", {
    tema_padrao: "claro",
    cor_principal: "blue",
    densidade: "confortavel",
    menu_padrao: "aberto",
    fonte: "padrao",
  });

  const notificacoesGlobal = buscarValor(sistema, "notificacoes_global", {
    som_ativo: true,
    volume: 100,
    popup_tempo_segundos: 30,
    agendamento_chegando_minutos: 15,
    confirmar_presenca_minutos: 60,
    repetir_ate_resolver: true,
    tipos_popup: [
      "confirmar_presenca",
      "agendamento_chegando",
      "agendamento_atrasado",
      "atividade_atrasada",
    ],
  });

  const notificacoesPerfil = buscarValor(
    perfilConfigs,
    "notificacoes_perfil",
    notificacoesGlobal,
  );

  const crmRegras = buscarValor(sistema, "crm_regras_global", {
    exigir_observacao_ao_mover: true,
    exigir_proxima_acao: true,
    bloquear_troca_vendedor_original: true,
    somente_adm_troca_vendedor: true,
    manter_vendedor_c2s: true,
    comissao_resgate_ativa: true,
  });

  const agendaRegras = buscarValor(sistema, "agenda_regras_global", {
    confirmar_presenca_minutos: 60,
    alerta_atraso_minutos: 10,
    bloquear_horario_duplicado: true,
    exigir_vendedor_responsavel: true,
    permitir_reagendamento_operador: true,
  });

  const integracoes = buscarValor(sistema, "integracoes_global", {
    c2s_ativo: true,
    trescx_ativo: true,
    whatsapp_ativo: true,
    sincronizar_c2s_minutos: 15,
    importar_3cx_minutos: 15,
    gerar_notificacoes_whatsapp: true,
  });

  const preferenciasUsuario = buscarValor(
    usuarioConfigs,
    "preferencias_usuario",
    {
      tema: "sistema",
      densidade: "confortavel",
      som_ativo: true,
      volume: 100,
      menu_aberto: true,
    },
  );

  const podeGlobal = Boolean(dados?.permissoes.pode_editar_global);
  const podePerfil = Boolean(dados?.permissoes.pode_editar_perfil);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/configuracoes", {
        method: "GET",
        cache: "no-store",
      });
      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        throw new Error(
          json?.erro || "Não foi possível carregar configurações.",
        );
      }

      setDados(json);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar configurações.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function salvarConfig({
    escopo,
    chave,
    valor,
    descricao,
    perfil: perfilAlvo,
  }: {
    escopo: "global" | "perfil" | "usuario";
    chave: string;
    valor: Record<string, any>;
    descricao?: string;
    perfil?: string;
  }) {
    setSalvando(chave);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/configuracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escopo,
          chave,
          valor,
          descricao,
          perfil: perfilAlvo,
        }),
      });

      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        throw new Error(json?.erro || "Não foi possível salvar configuração.");
      }

      setSucesso("Configuração salva com sucesso.");
      await carregar();
      window.dispatchEvent(new Event("flow-configuracoes-atualizadas"));
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao salvar configuração.",
      );
    } finally {
      setSalvando("");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const abaUrl = params.get("aba");
    const mapa: Record<string, SecaoId> = {
      tema: "aparencia",
      aparencia: "aparencia",
      notificacoes: "notificacoes",
      pausas: "operacao-pausas",
      operacao: "operacao-pausas",
      "operacao-pausas": "operacao-pausas",
      integracoes: "integracoes",
      kanban: "kanban",
      agenda: "agenda",
      permissoes: "permissoes",
      leads: "crm-leads",
    };

    if (abaUrl && mapa[abaUrl]) setAba(mapa[abaUrl]);
  }, []);

  useEffect(() => {
    if (
      secoesVisiveis.length > 0 &&
      !secoesVisiveis.some((secao) => secao.id === aba)
    ) {
      setAba(secoesVisiveis[0].id);
    }
  }, [secoesVisiveis, aba]);

  if (carregando) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">
              Carregando configurações...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!dados) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
          {erro || "Não foi possível carregar as configurações."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-slate-950">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-700">
                  Flow Sales CRM
                </p>
                <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                  Configurações
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
                  Central real de preferências, regras operacionais,
                  notificações, integrações e permissões do CRM.
                </p>
              </div>

              <div className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm sm:min-w-[320px]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Usuário</span>
                  <strong>{dados.usuario.nome}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Perfil</span>
                  <strong className="uppercase">{dados.usuario.perfil}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {secoesVisiveis.map((secao) => {
              const Icon = secao.icon;
              const active = aba === secao.id;

              return (
                <button
                  key={secao.id}
                  type="button"
                  onClick={() => setAba(secao.id)}
                  className={`group rounded-3xl border p-4 text-left transition ${active ? "border-blue-200 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 transition ${active ? "text-blue-700" : "text-slate-300 group-hover:text-blue-500"}`}
                    />
                  </div>
                  <h2 className="mt-4 text-sm font-black text-slate-950">
                    {secao.label}
                  </h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {secao.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {erro}
          </div>
        ) : null}
        {sucesso ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {sucesso}
          </div>
        ) : null}

        {aba === "minha-conta" ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <Card
              title="Preferências pessoais"
              description="Essas preferências afetam apenas o usuário logado e são aplicadas no CRM inteiro."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <FieldLabel>Tema pessoal</FieldLabel>
                  <select
                    value={preferenciasUsuario.tema}
                    onChange={(event) =>
                      salvarConfig({
                        escopo: "usuario",
                        chave: "preferencias_usuario",
                        valor: {
                          ...preferenciasUsuario,
                          tema: event.target.value,
                        },
                      })
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="sistema">
                      Seguir configuração do sistema
                    </option>
                    <option value="claro">Claro</option>
                    <option value="escuro">Escuro</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <FieldLabel>Densidade pessoal</FieldLabel>
                  <select
                    value={preferenciasUsuario.densidade}
                    onChange={(event) =>
                      salvarConfig({
                        escopo: "usuario",
                        chave: "preferencias_usuario",
                        valor: {
                          ...preferenciasUsuario,
                          densidade: event.target.value,
                        },
                      })
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="compacta">Compacta</option>
                    <option value="confortavel">Confortável</option>
                    <option value="ampla">Ampla</option>
                  </select>
                </label>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <h4 className="font-black text-slate-950">Som pessoal</h4>
                    <p className="text-xs font-semibold text-slate-500">
                      Ativa ou desativa som para este usuário.
                    </p>
                  </div>
                  <Toggle
                    checked={Boolean(preferenciasUsuario.som_ativo)}
                    onChange={(checked) =>
                      salvarConfig({
                        escopo: "usuario",
                        chave: "preferencias_usuario",
                        valor: { ...preferenciasUsuario, som_ativo: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <h4 className="font-black text-slate-950">Menu aberto</h4>
                    <p className="text-xs font-semibold text-slate-500">
                      Define se o menu inicia aberto para este usuário.
                    </p>
                  </div>
                  <Toggle
                    checked={Boolean(preferenciasUsuario.menu_aberto)}
                    onChange={(checked) =>
                      salvarConfig({
                        escopo: "usuario",
                        chave: "preferencias_usuario",
                        valor: { ...preferenciasUsuario, menu_aberto: checked },
                      })
                    }
                  />
                </div>

                <label className="grid gap-2 sm:col-span-2">
                  <FieldLabel>Volume pessoal</FieldLabel>
                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 px-3">
                    <Volume2 className="h-5 w-5 text-blue-700" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={preferenciasUsuario.volume}
                      onChange={(event) =>
                        salvarConfig({
                          escopo: "usuario",
                          chave: "preferencias_usuario",
                          valor: {
                            ...preferenciasUsuario,
                            volume: Number(event.target.value),
                          },
                        })
                      }
                      className="h-11 flex-1"
                    />
                    <strong className="w-12 text-right text-sm">
                      {preferenciasUsuario.volume}%
                    </strong>
                  </div>
                </label>
              </div>
            </Card>

            <Card title="Resumo da conta">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <span className="font-semibold text-slate-500">Nome</span>
                  <strong>{dados.usuario.nome}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <span className="font-semibold text-slate-500">Perfil</span>
                  <strong>{dados.usuario.perfil}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <span className="font-semibold text-slate-500">
                    Edita global
                  </span>
                  <strong>{podeGlobal ? "Sim" : "Não"}</strong>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {aba === "aparencia" ? (
          <Card
            title="Aparência global"
            description="Configurações padrão de visual do sistema. Se o usuário escolher seguir sistema, essas opções serão usadas."
          >
            {!podeGlobal ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                Você pode alterar suas preferências pessoais em Minha conta.
                Aparência global é restrita para ADM/Suporte.
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                [
                  "tema_padrao",
                  "Tema padrão",
                  ["claro", "escuro", "acompanhar_sistema"],
                ],
                [
                  "cor_principal",
                  "Cor principal",
                  ["blue", "slate", "emerald"],
                ],
                [
                  "densidade",
                  "Densidade",
                  ["compacta", "confortavel", "ampla"],
                ],
                ["menu_padrao", "Menu padrão", ["aberto", "fechado"]],
                ["fonte", "Fonte", ["padrao", "grande", "compacta"]],
              ].map(([key, label, options]) => (
                <label key={String(key)} className="grid gap-2">
                  <FieldLabel>{String(label)}</FieldLabel>
                  <select
                    disabled={!podeGlobal}
                    value={aparenciaGlobal[String(key)]}
                    onChange={(event) =>
                      salvarConfig({
                        escopo: "global",
                        chave: "aparencia_global",
                        valor: {
                          ...aparenciaGlobal,
                          [String(key)]: event.target.value,
                        },
                      })
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100"
                  >
                    {(options as string[]).map((option) => (
                      <option key={option} value={option}>
                        {option === "acompanhar_sistema"
                          ? "Acompanhar sistema"
                          : option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </Card>
        ) : null}

        {aba === "notificacoes" ? (
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Card
              title="Notificações operacionais"
              description="Controle real de popup, som, sininho e tempo dos alertas."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <h4 className="font-black text-slate-950">Som ativo</h4>
                    <p className="text-xs font-semibold text-slate-500">
                      Ativa sons operacionais no CRM.
                    </p>
                  </div>
                  <Toggle
                    disabled={!podeGlobal && !podePerfil}
                    checked={Boolean(
                      (podeGlobal ? notificacoesGlobal : notificacoesPerfil)
                        .som_ativo,
                    )}
                    onChange={(checked) =>
                      salvarConfig({
                        escopo: podeGlobal ? "global" : "perfil",
                        chave: podeGlobal
                          ? "notificacoes_global"
                          : "notificacoes_perfil",
                        valor: {
                          ...(podeGlobal
                            ? notificacoesGlobal
                            : notificacoesPerfil),
                          som_ativo: checked,
                        },
                        perfil,
                      })
                    }
                  />
                </div>

                <label className="grid gap-2 rounded-2xl border border-slate-200 p-4">
                  <FieldLabel>Volume padrão</FieldLabel>
                  <div className="flex items-center gap-4">
                    <Volume2 className="h-5 w-5 text-blue-700" />
                    <input
                      disabled={!podeGlobal && !podePerfil}
                      type="range"
                      min="0"
                      max="100"
                      value={
                        (podeGlobal ? notificacoesGlobal : notificacoesPerfil)
                          .volume
                      }
                      onChange={(event) =>
                        salvarConfig({
                          escopo: podeGlobal ? "global" : "perfil",
                          chave: podeGlobal
                            ? "notificacoes_global"
                            : "notificacoes_perfil",
                          valor: {
                            ...(podeGlobal
                              ? notificacoesGlobal
                              : notificacoesPerfil),
                            volume: Number(event.target.value),
                          },
                          perfil,
                        })
                      }
                      className="flex-1"
                    />
                    <strong className="w-12 text-right">
                      {
                        (podeGlobal ? notificacoesGlobal : notificacoesPerfil)
                          .volume
                      }
                      %
                    </strong>
                  </div>
                </label>

                <CampoNumero
                  label="Popup na tela"
                  suffix="seg"
                  disabled={!podeGlobal && !podePerfil}
                  value={Number(
                    (podeGlobal ? notificacoesGlobal : notificacoesPerfil)
                      .popup_tempo_segundos || 30,
                  )}
                  onChange={(value) =>
                    salvarConfig({
                      escopo: podeGlobal ? "global" : "perfil",
                      chave: podeGlobal
                        ? "notificacoes_global"
                        : "notificacoes_perfil",
                      valor: {
                        ...(podeGlobal
                          ? notificacoesGlobal
                          : notificacoesPerfil),
                        popup_tempo_segundos: value,
                      },
                      perfil,
                    })
                  }
                />

                <CampoNumero
                  label="Agendamento chegando"
                  suffix="min"
                  disabled={!podeGlobal && !podePerfil}
                  value={Number(
                    (podeGlobal ? notificacoesGlobal : notificacoesPerfil)
                      .agendamento_chegando_minutos || 15,
                  )}
                  onChange={(value) =>
                    salvarConfig({
                      escopo: podeGlobal ? "global" : "perfil",
                      chave: podeGlobal
                        ? "notificacoes_global"
                        : "notificacoes_perfil",
                      valor: {
                        ...(podeGlobal
                          ? notificacoesGlobal
                          : notificacoesPerfil),
                        agendamento_chegando_minutos: value,
                      },
                      perfil,
                    })
                  }
                />
              </div>
            </Card>

            <Card title="Tipos de alerta">
              <div className="space-y-3">
                {[
                  ["confirmar_presenca", "Confirmar presença"],
                  ["agendamento_chegando", "Agendamento chegando"],
                  ["agendamento_atrasado", "Agendamento atrasado"],
                  ["atividade_atrasada", "Atividade atrasada"],
                  ["novo_lead", "Novo lead"],
                  ["lead_enviado_supervisora", "Lead enviado pela supervisora"],
                ].map(([tipo, label]) => {
                  const base = podeGlobal
                    ? notificacoesGlobal
                    : notificacoesPerfil;
                  const viraPopup = Array.isArray(base.tipos_popup)
                    ? base.tipos_popup.includes(tipo)
                    : false;
                  return (
                    <div
                      key={tipo}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          {label}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {viraPopup ? "Popup + sininho" : "Só sininho"}
                        </p>
                      </div>
                      <Toggle
                        disabled={!podeGlobal && !podePerfil}
                        checked={viraPopup}
                        onChange={(checked) => {
                          const atuais = Array.isArray(base.tipos_popup)
                            ? base.tipos_popup
                            : [];
                          const proximos = checked
                            ? Array.from(new Set([...atuais, tipo]))
                            : atuais.filter((item: string) => item !== tipo);
                          salvarConfig({
                            escopo: podeGlobal ? "global" : "perfil",
                            chave: podeGlobal
                              ? "notificacoes_global"
                              : "notificacoes_perfil",
                            valor: { ...base, tipos_popup: proximos },
                            perfil,
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : null}

        {aba === "operacao-pausas" ? (
          <Card
            title="Operação e pausas"
            description="Aqui ficam as regras por trás da tela Usuários > Status. Esta área não aplica pausa em colaborador; ela define o que cada pausa/status faz no sistema."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={Settings}
                title="Regras de status"
                description="Definir se cada status bloqueia lead, exige motivo, gera popup, volta automático ou precisa de supervisor."
                href="/dashboard/configuracoes/operacao-pausas"
              />
              <InfoCard
                icon={Users}
                title="Execução fica em Usuários"
                description="Horário de almoço, pausa feedback e status da equipe são aplicados na área Usuários > Status."
                href="/dashboard/usuarios?aba=status"
              />
              <InfoCard
                icon={Bell}
                title="Popups automáticos"
                description="As mensagens configuradas aqui avisam o colaborador quando o sistema muda o status dele."
                href="/dashboard/configuracoes/operacao-pausas"
              />
            </div>
          </Card>
        ) : null}

        {aba === "crm-leads" ? (
          <Card
            title="Regras do CRM e Resgate"
            description="Regras críticas da operação comercial. Essas chaves ficam salvas para os módulos respeitarem."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {[
                [
                  "exigir_observacao_ao_mover",
                  "Exigir observação ao mover lead",
                ],
                ["exigir_proxima_acao", "Exigir próxima ação"],
                [
                  "bloquear_troca_vendedor_original",
                  "Bloquear troca do vendedor original",
                ],
                ["somente_adm_troca_vendedor", "Somente ADM troca vendedor"],
                ["manter_vendedor_c2s", "Manter vendedor original do C2S"],
                ["comissao_resgate_ativa", "Comissão de resgate ativa"],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-black text-slate-950">{label}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Regra operacional do fluxo de leads.
                    </p>
                  </div>
                  <Toggle
                    disabled={!podeGlobal}
                    checked={Boolean(crmRegras[key])}
                    onChange={(checked) =>
                      salvarConfig({
                        escopo: "global",
                        chave: "crm_regras_global",
                        valor: { ...crmRegras, [key]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {aba === "kanban" ? (
          <Card
            title="Kanban"
            description="Essa área abre a configuração real do funil, colunas, regras de avanço e bloqueios."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={KanbanSquare}
                title="Configurar colunas"
                description="Criar, editar, ativar, bloquear e ordenar etapas do funil."
                href="/dashboard/configuracoes/kanban"
              />
              <InfoCard
                icon={CheckCircle2}
                title="Validações"
                description="Definir observação, próxima ação e etapas finais no funil."
                href="/dashboard/configuracoes/kanban"
              />
              <InfoCard
                icon={Users}
                title="Funil da equipe"
                description="Aplicar estrutura padrão para operação comercial."
                href="/dashboard/configuracoes/kanban"
              />
            </div>
          </Card>
        ) : null}

        {aba === "agenda" ? (
          <Card
            title="Agenda operacional"
            description="Parâmetros salvos para confirmação, atraso e regras de agendamento."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <CampoNumero
                label="Confirmar presença"
                suffix="min antes"
                disabled={!podeGlobal && !podePerfil}
                value={Number(agendaRegras.confirmar_presenca_minutos || 60)}
                onChange={(value) =>
                  salvarConfig({
                    escopo: podeGlobal ? "global" : "perfil",
                    chave: "agenda_regras_global",
                    valor: {
                      ...agendaRegras,
                      confirmar_presenca_minutos: value,
                    },
                    perfil,
                  })
                }
              />
              <CampoNumero
                label="Alerta de atraso"
                suffix="min"
                disabled={!podeGlobal && !podePerfil}
                value={Number(agendaRegras.alerta_atraso_minutos || 10)}
                onChange={(value) =>
                  salvarConfig({
                    escopo: podeGlobal ? "global" : "perfil",
                    chave: "agenda_regras_global",
                    valor: { ...agendaRegras, alerta_atraso_minutos: value },
                    perfil,
                  })
                }
              />
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-black">Bloquear horário duplicado</p>
                  <p className="text-xs font-semibold text-slate-500">
                    Evita dois agendamentos no mesmo horário.
                  </p>
                </div>
                <Toggle
                  disabled={!podeGlobal && !podePerfil}
                  checked={Boolean(agendaRegras.bloquear_horario_duplicado)}
                  onChange={(checked) =>
                    salvarConfig({
                      escopo: podeGlobal ? "global" : "perfil",
                      chave: "agenda_regras_global",
                      valor: {
                        ...agendaRegras,
                        bloquear_horario_duplicado: checked,
                      },
                      perfil,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-black">Exigir vendedor responsável</p>
                  <p className="text-xs font-semibold text-slate-500">
                    Agenda precisa ter responsável definido.
                  </p>
                </div>
                <Toggle
                  disabled={!podeGlobal && !podePerfil}
                  checked={Boolean(agendaRegras.exigir_vendedor_responsavel)}
                  onChange={(checked) =>
                    salvarConfig({
                      escopo: podeGlobal ? "global" : "perfil",
                      chave: "agenda_regras_global",
                      valor: {
                        ...agendaRegras,
                        exigir_vendedor_responsavel: checked,
                      },
                      perfil,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-black">Operador pode reagendar</p>
                  <p className="text-xs font-semibold text-slate-500">
                    Permite ajuste de agenda pelo atendente.
                  </p>
                </div>
                <Toggle
                  disabled={!podeGlobal && !podePerfil}
                  checked={Boolean(
                    agendaRegras.permitir_reagendamento_operador,
                  )}
                  onChange={(checked) =>
                    salvarConfig({
                      escopo: podeGlobal ? "global" : "perfil",
                      chave: "agenda_regras_global",
                      valor: {
                        ...agendaRegras,
                        permitir_reagendamento_operador: checked,
                      },
                      perfil,
                    })
                  }
                />
              </div>
            </div>
          </Card>
        ) : null}

        {aba === "integracoes" ? (
          <Card
            title="Integrações"
            description="Controle administrativo das integrações ativas e frequência de sincronização."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                [
                  "c2s_ativo",
                  "C2S ativo",
                  "Permite rotinas de leads e origem C2S.",
                ],
                [
                  "trescx_ativo",
                  "3CX ativo",
                  "Permite monitoramento de ligações.",
                ],
                [
                  "whatsapp_ativo",
                  "WhatsApp ativo",
                  "Permite monitoramento de conversas.",
                ],
                [
                  "gerar_notificacoes_whatsapp",
                  "Notificar WhatsApp",
                  "Gera alertas operacionais de WhatsApp.",
                ],
              ].map(([key, title, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-black">{title}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {desc}
                    </p>
                  </div>
                  <Toggle
                    disabled={!podeGlobal}
                    checked={Boolean(integracoes[key])}
                    onChange={(checked) =>
                      salvarConfig({
                        escopo: "global",
                        chave: "integracoes_global",
                        valor: { ...integracoes, [key]: checked },
                      })
                    }
                  />
                </div>
              ))}
              <CampoNumero
                label="Sincronizar C2S"
                suffix="min"
                disabled={!podeGlobal}
                value={Number(integracoes.sincronizar_c2s_minutos || 15)}
                onChange={(value) =>
                  salvarConfig({
                    escopo: "global",
                    chave: "integracoes_global",
                    valor: { ...integracoes, sincronizar_c2s_minutos: value },
                  })
                }
              />
              <CampoNumero
                label="Importar 3CX"
                suffix="min"
                disabled={!podeGlobal}
                value={Number(integracoes.importar_3cx_minutos || 15)}
                onChange={(value) =>
                  salvarConfig({
                    escopo: "global",
                    chave: "integracoes_global",
                    valor: { ...integracoes, importar_3cx_minutos: value },
                  })
                }
              />
            </div>
          </Card>
        ) : null}

        {aba === "permissoes" ? (
          <Card
            title="Permissões"
            description="Permissões ficam na gestão real de usuários/perfis, não em botão decorativo."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={LockKeyhole}
                title="Perfis e acessos"
                description="Abrir painel real de permissões por perfil."
                href="/dashboard/configuracoes/permissoes"
              />
              <InfoCard
                icon={MonitorCog}
                title="Todos os usuários"
                description="Editar usuário, status, perfil, ativo e recebimento de leads."
                href="/dashboard/usuarios"
              />
              <InfoCard
                icon={Eye}
                title="Status da equipe"
                description="Acompanhar status operacional e administrativo."
                href="/dashboard/usuarios?aba=status"
              />
            </div>
          </Card>
        ) : null}

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

function InfoCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: any;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <Icon className="h-6 w-6 text-blue-700" />
      <h4 className="mt-3 font-black text-slate-950">{title}</h4>
      <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-700">
        Abrir área{" "}
        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
