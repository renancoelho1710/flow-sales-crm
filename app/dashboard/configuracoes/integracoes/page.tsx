"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  PhoneCall,
  PlugZap,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  TestTube2,
  Users,
  X,
} from "lucide-react";

type Integracao = {
  id: string;
  chave: string;
  nome: string;
  descricao?: string | null;
  tipo: string;
  ativo: boolean;
  base_url?: string | null;
  usuario?: string | null;
  token_mascarado?: string | null;
  parametros: Record<string, any>;
  ultima_sincronizacao_em?: string | null;
  ultimo_teste_em?: string | null;
  ultimo_teste_status?: string | null;
  ultimo_teste_mensagem?: string | null;
  atualizado_em?: string | null;
};

type Usuario3CX = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  recebe_leads: boolean;
  status_operacional: string;
  status_administrativo: string;
  ramal_3cx?: string | null;
};

type TipoCertificado = {
  chave: string;
  nome: string;
  categoria: string;
  descricao: string;
  modos: Array<{ chave: string; nome: string; descricao: string }>;
};

type Capacidade = {
  chave: string;
  nome: string;
  grupo: string;
};

const tiposCertificados: TipoCertificado[] = [
  {
    chave: "c2s",
    nome: "C2S",
    categoria: "CRM",
    descricao: "Leads, origem, vendedor da carteira e sincronização comercial.",
    modos: [
      { chave: "api_oficial", nome: "API oficial", descricao: "Consulta e sincronização por API autenticada." },
      { chave: "webhook", nome: "Webhook", descricao: "Recebimento de eventos enviados pelo C2S ou conector." },
      { chave: "manual_assistido", nome: "Manual assistido", descricao: "Registro operacional sem automação direta." },
    ],
  },
  {
    chave: "3cx",
    nome: "3CX",
    categoria: "Telefonia",
    descricao: "Controle de chamadas, status por ramal e histórico no lead.",
    modos: [
      { chave: "call_control_api", nome: "Call Control API", descricao: "Controle completo por API oficial quando liberado." },
      { chave: "webhook_monitor", nome: "Webhook / Monitor", descricao: "Eventos enviados pelo monitor, conector ou Tampermonkey." },
      { chave: "click_to_call", nome: "Click-to-call", descricao: "Discagem pelo Web Client/app 3CX com registro no Flow." },
      { chave: "manual_assistido", nome: "Manual assistido", descricao: "Registro interno com operação feita no 3CX." },
    ],
  },
  {
    chave: "zoiper_sip",
    nome: "Zoiper / SIP",
    categoria: "Telefonia",
    descricao: "Softphone SIP, links de discagem e eventos por URL.",
    modos: [
      { chave: "sip_click_to_call", nome: "SIP click-to-call", descricao: "Discagem por protocolo local do computador." },
      { chave: "url_eventos", nome: "URL por evento", descricao: "Zoiper chama URLs do Flow em eventos de telefonia." },
      { chave: "manual_assistido", nome: "Manual assistido", descricao: "Registro interno sem controle direto do softphone." },
    ],
  },
  {
    chave: "whatsapp",
    nome: "WhatsApp",
    categoria: "Mensageria",
    descricao: "API oficial, monitor web, webhooks e histórico no lead.",
    modos: [
      { chave: "api_oficial", nome: "API oficial", descricao: "Envio e recebimento por API autorizada." },
      { chave: "web_monitor", nome: "Monitor web", descricao: "Monitoramento via conector interno." },
      { chave: "webhook", nome: "Webhook", descricao: "Eventos recebidos de provedor externo." },
      { chave: "manual_assistido", nome: "Manual assistido", descricao: "Registro operacional sem automação direta." },
    ],
  },
  {
    chave: "webhook_personalizado",
    nome: "Webhook personalizado",
    categoria: "Eventos",
    descricao: "Entrada ou saída controlada de eventos externos.",
    modos: [
      { chave: "webhook_entrada", nome: "Entrada", descricao: "Flow recebe eventos do sistema externo." },
      { chave: "webhook_saida", nome: "Saída", descricao: "Flow envia eventos para o sistema externo." },
    ],
  },
  {
    chave: "sistema_externo",
    nome: "Sistema externo",
    categoria: "Geral",
    descricao: "Integração controlada com sistema autorizado.",
    modos: [
      { chave: "api_externa", nome: "API externa", descricao: "Conexão por URL/base e token." },
      { chave: "webhook", nome: "Webhook", descricao: "Troca de eventos por endpoint." },
      { chave: "manual_assistido", nome: "Manual assistido", descricao: "Registro interno com ação externa manual." },
    ],
  },
];

const capacidades: Capacidade[] = [
  { chave: "testar_conexao", nome: "Testar conexão", grupo: "Conexão" },
  { chave: "receber_webhook", nome: "Receber webhook", grupo: "Eventos" },
  { chave: "enviar_webhook", nome: "Enviar webhook", grupo: "Eventos" },
  { chave: "iniciar_chamada", nome: "Iniciar chamada", grupo: "Telefonia" },
  { chave: "encerrar_chamada", nome: "Encerrar chamada", grupo: "Telefonia" },
  { chave: "transferir_chamada", nome: "Transferir chamada", grupo: "Telefonia" },
  { chave: "registrar_chamada", nome: "Registrar chamada", grupo: "Telefonia" },
  { chave: "sincronizar_status", nome: "Sincronizar status", grupo: "Operação" },
  { chave: "importar_leads", nome: "Importar leads", grupo: "CRM" },
  { chave: "exportar_leads", nome: "Enviar leads", grupo: "CRM" },
  { chave: "enviar_mensagem", nome: "Enviar mensagem", grupo: "Mensageria" },
  { chave: "receber_mensagem", nome: "Receber mensagem", grupo: "Mensageria" },
  { chave: "registrar_historico", nome: "Registrar histórico", grupo: "Auditoria" },
  { chave: "sincronizar_agenda", nome: "Sincronizar agenda", grupo: "Agenda" },
];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-blue-700" : "bg-slate-300"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black uppercase tracking-wide text-slate-400">{children}</span>;
}

function formatarData(valor?: string | null) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function tipoInfo(tipo: string) {
  return tiposCertificados.find((item) => item.chave === tipo) || tiposCertificados[5];
}

function modoInfo(tipo: string, modo: string) {
  return tipoInfo(tipo).modos.find((item) => item.chave === modo) || tipoInfo(tipo).modos[0];
}

function statusClasse(status?: string | null) {
  if (status === "sucesso") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "erro") return "border-red-100 bg-red-50 text-red-700";
  if (status === "pendente") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function capacidadeAtiva(integracao: Integracao, chave: string) {
  return Boolean(integracao.parametros?.capacidades?.[chave]);
}

function valorIntervalo(item: Integracao) {
  return Number(
    item.parametros?.intervalo_sincronizacao_minutos ||
      item.parametros?.intervalo_importacao_minutos ||
      item.parametros?.intervalo_leitura_minutos ||
      15
  );
}

function chaveIntervalo(item: Integracao) {
  if (item.tipo === "whatsapp") return "intervalo_leitura_minutos";
  if (item.tipo === "3cx") return "intervalo_importacao_minutos";
  return "intervalo_sincronizacao_minutos";
}

function endpointWebhook(chave: string) {
  if (typeof window === "undefined") return `/api/webhooks/${chave}`;
  if (chave === "3cx") return `${window.location.origin}/api/3cx/status`;
  return `${window.location.origin}/api/webhooks/${chave}`;
}

export default function Page() {
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario3CX[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [ramais, setRamais] = useState<Record<string, string>>({});
  const [selecionada, setSelecionada] = useState<string>("3cx");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tokenGerado, setTokenGerado] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [novo, setNovo] = useState({
    nome: "",
    chave: "",
    descricao: "",
    tipo: "sistema_externo",
    modo_operacao: "api_externa",
  });

  const itemSelecionado = useMemo(
    () => integracoes.find((item) => item.chave === selecionada) || integracoes[0] || null,
    [integracoes, selecionada]
  );

  const resumo = useMemo(() => {
    return {
      total: integracoes.length,
      ativas: integracoes.filter((item) => item.ativo).length,
      comErro: integracoes.filter((item) => item.ultimo_teste_status === "erro").length,
      sucesso: integracoes.filter((item) => item.ultimo_teste_status === "sucesso").length,
    };
  }, [integracoes]);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const [respostaIntegracoes, respostaVinculos] = await Promise.all([
        fetch("/api/integracoes/configuracoes", { method: "GET", cache: "no-store" }),
        fetch("/api/integracoes/3cx-vinculos", { method: "GET", cache: "no-store" }).catch(() => null),
      ]);

      const jsonIntegracoes = await respostaIntegracoes.json().catch(() => null);
      const jsonVinculos = respostaVinculos ? await respostaVinculos.json().catch(() => null) : null;

      if (!respostaIntegracoes.ok || !jsonIntegracoes?.ok) {
        throw new Error(jsonIntegracoes?.erro || "Não foi possível carregar integrações.");
      }

      const lista = jsonIntegracoes.integracoes || [];
      setIntegracoes(lista);

      if (!lista.some((item: Integracao) => item.chave === selecionada) && lista[0]) {
        setSelecionada(lista[0].chave);
      }

      if (jsonVinculos?.ok) {
        setUsuarios(jsonVinculos.usuarios || []);
        setRamais(
          Object.fromEntries((jsonVinculos.usuarios || []).map((usuario: Usuario3CX) => [usuario.id, usuario.ramal_3cx || ""]))
        );
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar integrações.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizar(chave: string, campo: keyof Integracao, valor: any) {
    setIntegracoes((atuais) => atuais.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)));
  }

  function atualizarParametro(chave: string, campo: string, valor: any) {
    setIntegracoes((atuais) =>
      atuais.map((item) =>
        item.chave === chave ? { ...item, parametros: { ...(item.parametros || {}), [campo]: valor } } : item
      )
    );
  }

  function alterarModo(chave: string, modo: string) {
    atualizarParametro(chave, "modo_operacao", modo);
  }

  function alternarCapacidadeManual(chaveIntegracao: string, chaveCapacidade: string, valor: boolean) {
    setIntegracoes((atuais) =>
      atuais.map((item) => {
        if (item.chave !== chaveIntegracao) return item;
        const parametros = item.parametros || {};
        return {
          ...item,
          parametros: {
            ...parametros,
            capacidades_manuais: {
              ...(parametros.capacidades_manuais || {}),
              [chaveCapacidade]: valor,
            },
            capacidades: {
              ...(parametros.capacidades || {}),
              [chaveCapacidade]: valor,
            },
          },
        };
      })
    );
  }

  async function salvar(item: Integracao, acao = "salvar") {
    setSalvando(`${acao}-${item.chave}`);
    setErro("");
    setMensagem("");
    setTokenGerado("");

    try {
      const resposta = await fetch("/api/integracoes/configuracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, acao, token: tokens[item.chave] || undefined }),
      });
      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) throw new Error(json?.erro || "Não foi possível salvar integração.");

      setMensagem(acao === "gerar_webhook_token" ? "Token gerado com sucesso." : `${item.nome} salvo com sucesso.`);
      if (json.token_gerado) setTokenGerado(json.token_gerado);
      setTokens((atuais) => ({ ...atuais, [item.chave]: "" }));
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar integração.");
    } finally {
      setSalvando("");
    }
  }

  async function testar(chave: string) {
    setSalvando(`testar-${chave}`);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch("/api/integracoes/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave }),
      });
      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) throw new Error(json?.erro || json?.mensagem || "Teste não concluído.");

      setMensagem(json.mensagem || "Teste concluído com sucesso.");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao testar integração.");
      await carregar();
    } finally {
      setSalvando("");
    }
  }

  async function criarIntegracao() {
    setSalvando("criar");
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch("/api/integracoes/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novo.nome,
          chave: novo.chave,
          descricao: novo.descricao,
          tipo: novo.tipo,
          ativo: false,
          parametros: { modo_operacao: novo.modo_operacao, capacidades_manuais: {} },
        }),
      });
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok || !json?.ok) throw new Error(json?.erro || "Não foi possível criar integração.");

      setMensagem("Integração criada com sucesso.");
      setNovoAberto(false);
      setNovo({ nome: "", chave: "", descricao: "", tipo: "sistema_externo", modo_operacao: "api_externa" });
      await carregar();
      if (json.integracao?.chave) setSelecionada(json.integracao.chave);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao criar integração.");
    } finally {
      setSalvando("");
    }
  }

  async function salvarRamal(usuarioId: string) {
    setSalvando(`ramal-${usuarioId}`);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch("/api/integracoes/3cx-vinculos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioId, ramal_3cx: ramais[usuarioId] || "" }),
      });
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok || !json?.ok) throw new Error(json?.erro || "Não foi possível salvar ramal.");

      setMensagem("Ramal salvo com sucesso.");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar ramal.");
    } finally {
      setSalvando("");
    }
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto);
    setMensagem("Copiado para a área de transferência.");
  }

  useEffect(() => {
    carregar();
  }, []);

  if (carregando) {
    return (
      <main className="p-4 sm:p-6">
        <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
            <p className="mt-3 text-sm font-bold text-slate-500">Carregando integrações...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1540px] space-y-5">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <Link href="/dashboard/configuracoes" className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-800">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Configurações</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Central de Integrações</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Conexões autorizadas, credenciais, webhooks, capacidades operacionais e vínculos de telefonia.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5">
              <Resumo label="Total" valor={resumo.total} />
              <Resumo label="Ativas" valor={resumo.ativas} />
              <Resumo label="Testadas" valor={resumo.sucesso} />
              <Resumo label="Atenção" valor={resumo.comErro} />
              <button
                type="button"
                onClick={carregar}
                className="inline-flex h-[58px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>
        </section>

        {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{erro}</div> : null}
        {mensagem ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            {mensagem}
          </div>
        ) : null}

        {tokenGerado ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-black text-amber-800">Token gerado. Copie agora.</p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
              <code className="min-w-0 flex-1 overflow-auto rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-900 ring-1 ring-amber-100">
                {tokenGerado}
              </code>
              <button
                type="button"
                onClick={() => copiar(tokenGerado)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-black text-white hover:bg-amber-700"
              >
                <Copy className="h-4 w-4" />
                Copiar token
              </button>
            </div>
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-950">Integrações</h2>
                <button
                  type="button"
                  onClick={() => setNovoAberto(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-700 px-3 text-xs font-black text-white hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Nova
                </button>
              </div>

              <div className="space-y-2">
                {integracoes.map((item) => {
                  const info = tipoInfo(item.tipo);
                  const ativo = item.chave === selecionada;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelecionada(item.chave)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${ativo ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50 hover:border-blue-100 hover:bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">{item.nome}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">{info.categoria} • {modoInfo(item.tipo, item.parametros?.modo_operacao).nome}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {item.ativo ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {capacidades.filter((cap) => capacidadeAtiva(item, cap.chave)).slice(0, 3).map((cap) => (
                          <span key={cap.chave} className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                            {cap.nome}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">Tipos certificados</h3>
              <div className="mt-3 space-y-2">
                {tiposCertificados.map((tipo) => (
                  <div key={tipo.chave} className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-black text-slate-950">{tipo.nome}</p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">{tipo.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {itemSelecionado ? (
            <section className="space-y-5">
              <IntegracaoEditor
                item={itemSelecionado}
                tokens={tokens}
                salvando={salvando}
                onTokenChange={(value) => setTokens((atuais) => ({ ...atuais, [itemSelecionado.chave]: value }))}
                onUpdate={(campo, valor) => atualizar(itemSelecionado.chave, campo, valor)}
                onParam={(campo, valor) => atualizarParametro(itemSelecionado.chave, campo, valor)}
                onModo={(modo) => alterarModo(itemSelecionado.chave, modo)}
                onSalvar={() => salvar(itemSelecionado)}
                onTestar={() => testar(itemSelecionado.chave)}
                onGerarToken={() => salvar(itemSelecionado, "gerar_webhook_token")}
                onCopiar={copiar}
                onCapacidadeManual={(capacidade, valor) => alternarCapacidadeManual(itemSelecionado.chave, capacidade, valor)}
              />

              {itemSelecionado.tipo === "3cx" ? (
                <Ramal3CX
                  usuarios={usuarios}
                  ramais={ramais}
                  salvando={salvando}
                  setRamais={setRamais}
                  salvarRamal={salvarRamal}
                />
              ) : null}
            </section>
          ) : null}
        </section>

        {novoAberto ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm" onClick={() => setNovoAberto(false)}>
            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Nova integração</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Crie uma conexão a partir dos tipos certificados.</p>
                </div>
                <button type="button" onClick={() => setNovoAberto(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <Label>Nome</Label>
                  <input value={novo.nome} onChange={(e) => setNovo((atual) => ({ ...atual, nome: e.target.value }))} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label className="grid gap-2">
                  <Label>Chave interna</Label>
                  <input value={novo.chave} onChange={(e) => setNovo((atual) => ({ ...atual, chave: e.target.value }))} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label className="grid gap-2">
                  <Label>Tipo</Label>
                  <select
                    value={novo.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value;
                      setNovo((atual) => ({ ...atual, tipo, modo_operacao: tipoInfo(tipo).modos[0].chave }));
                    }}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    {tiposCertificados.map((tipo) => <option key={tipo.chave} value={tipo.chave}>{tipo.nome}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <Label>Modo</Label>
                  <select value={novo.modo_operacao} onChange={(e) => setNovo((atual) => ({ ...atual, modo_operacao: e.target.value }))} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                    {tipoInfo(novo.tipo).modos.map((modo) => <option key={modo.chave} value={modo.chave}>{modo.nome}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <Label>Descrição</Label>
                  <textarea value={novo.descricao} onChange={(e) => setNovo((atual) => ({ ...atual, descricao: e.target.value }))} rows={3} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setNovoAberto(false)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={criarIntegracao} disabled={salvando === "criar" || !novo.nome.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">
                  {salvando === "criar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Criar integração
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Resumo({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-950">{valor}</p>
    </div>
  );
}

function IntegracaoEditor({
  item,
  tokens,
  salvando,
  onTokenChange,
  onUpdate,
  onParam,
  onModo,
  onSalvar,
  onTestar,
  onGerarToken,
  onCopiar,
  onCapacidadeManual,
}: {
  item: Integracao;
  tokens: Record<string, string>;
  salvando: string;
  onTokenChange: (value: string) => void;
  onUpdate: (campo: keyof Integracao, valor: any) => void;
  onParam: (campo: string, valor: any) => void;
  onModo: (modo: string) => void;
  onSalvar: () => void;
  onTestar: () => void;
  onGerarToken: () => void;
  onCopiar: (texto: string) => void;
  onCapacidadeManual: (capacidade: string, valor: boolean) => void;
}) {
  const info = tipoInfo(item.tipo);
  const modo = modoInfo(item.tipo, item.parametros?.modo_operacao);
  const webhookUrl = endpointWebhook(item.chave);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <PlugZap className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black text-slate-950">{item.nome}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.ativo ? "Ativa" : "Inativa"}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClasse(item.ultimo_teste_status)}`}>{item.ultimo_teste_status || "sem teste"}</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{item.descricao}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onTestar} disabled={salvando === `testar-${item.chave}`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {salvando === `testar-${item.chave}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
              Testar
            </button>
            <button type="button" onClick={onSalvar} disabled={salvando === `salvar-${item.chave}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 disabled:opacity-60">
              {salvando === `salvar-${item.chave}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <Label>Status</Label>
              <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 px-3">
                <span className="text-sm font-black text-slate-700">{item.ativo ? "Ativa" : "Inativa"}</span>
                <Toggle checked={item.ativo} onChange={(checked) => onUpdate("ativo", checked)} />
              </div>
            </label>
            <label className="grid gap-2">
              <Label>Tipo certificado</Label>
              <select value={item.tipo} onChange={(e) => onUpdate("tipo", e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                {tiposCertificados.map((tipo) => <option key={tipo.chave} value={tipo.chave}>{tipo.nome}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <Label>Modo de operação</Label>
              <select value={item.parametros?.modo_operacao || info.modos[0].chave} onChange={(e) => onModo(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                {info.modos.map((modoItem) => <option key={modoItem.chave} value={modoItem.chave}>{modoItem.nome}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <Label>Intervalo operacional</Label>
              <input type="number" value={valorIntervalo(item)} onChange={(e) => onParam(chaveIntervalo(item), Number(e.target.value))} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            </label>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-black text-slate-950">{modo.nome}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{modo.descricao}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <Label>URL/Base</Label>
              <input value={item.base_url || ""} onChange={(e) => onUpdate("base_url", e.target.value)} placeholder="https://..." className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            </label>
            <label className="grid gap-2">
              <Label>Usuário / identificação</Label>
              <input value={item.usuario || ""} onChange={(e) => onUpdate("usuario", e.target.value)} placeholder="Usuário, e-mail ou identificador" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <Label>Token/API key</Label>
              <input value={tokens[item.chave] || ""} onChange={(e) => onTokenChange(e.target.value)} placeholder={item.token_mascarado || "Cole uma credencial autorizada"} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            </label>
          </div>

          {item.tipo === "3cx" ? (
            <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
              <label className="grid gap-2">
                <Label>3CX Web Client</Label>
                <input value={String(item.parametros?.web_client_url || "")} onChange={(e) => onParam("web_client_url", e.target.value)} placeholder="https://.../webclient" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none" />
              </label>
              <label className="grid gap-2">
                <Label>Abrir 3CX em</Label>
                <select value={String(item.parametros?.abrir_em || "nova_aba")} onChange={(e) => onParam("abrir_em", e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none">
                  <option value="nova_aba">Nova aba</option>
                  <option value="popup">Popup</option>
                  <option value="lateral">Painel lateral</option>
                </select>
              </label>
              <CheckOption label="Registrar chamadas no lead" checked={Boolean(item.parametros?.registrar_chamadas_no_lead)} onChange={(v) => onParam("registrar_chamadas_no_lead", v)} />
              <CheckOption label="Sincronizar status por ramal" checked={Boolean(item.parametros?.sincronizar_status_por_ramal)} onChange={(v) => onParam("sincronizar_status_por_ramal", v)} />
            </div>
          ) : null}

          {item.tipo === "zoiper_sip" ? (
            <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
              <label className="grid gap-2">
                <Label>Protocolo de discagem</Label>
                <select value={String(item.parametros?.protocolo_discagem || "tel")} onChange={(e) => onParam("protocolo_discagem", e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none">
                  <option value="tel">tel:</option>
                  <option value="callto">callto:</option>
                  <option value="sip">sip:</option>
                  <option value="zoiper">zoiper:</option>
                </select>
              </label>
              <label className="grid gap-2">
                <Label>URL de eventos</Label>
                <input value={String(item.parametros?.url_evento || "")} onChange={(e) => onParam("url_evento", e.target.value)} placeholder="https://..." className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none" />
              </label>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">Webhook</p>
                <p className="text-xs font-bold text-slate-500">Endpoint e token para eventos externos autorizados.</p>
              </div>
              <button type="button" onClick={() => onCopiar(webhookUrl)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-slate-50">
                <Copy className="h-4 w-4" />
                Copiar endpoint
              </button>
            </div>
            <input value={webhookUrl} readOnly className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700" />
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input value={String(item.parametros?.webhook_token_mascarado || "")} readOnly placeholder="Token não gerado" className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700" />
              <button type="button" onClick={onGerarToken} disabled={salvando === `gerar_webhook_token-${item.chave}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
                <KeyRound className="h-4 w-4" />
                Gerar token
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-black text-slate-950">Capacidades</h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {capacidades.map((cap) => {
                const ativa = capacidadeAtiva(item, cap.chave);
                return (
                  <label key={cap.chave} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${ativa ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-white"}`}>
                    <span>
                      <span className="block text-sm font-black text-slate-800">{cap.nome}</span>
                      <span className="block text-[11px] font-bold text-slate-400">{cap.grupo}</span>
                    </span>
                    <input type="checkbox" checked={ativa} onChange={(e) => onCapacidadeManual(cap.chave, e.target.checked)} className="h-4 w-4" />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-black text-slate-950">Status técnico</h3>
            <div className="mt-4 grid gap-3 text-xs font-bold text-slate-600">
              <InfoLinha label="Último teste" valor={formatarData(item.ultimo_teste_em)} />
              <InfoLinha label="Resultado" valor={item.ultimo_teste_status || "—"} />
              <InfoLinha label="Mensagem" valor={item.ultimo_teste_mensagem || "—"} />
              <InfoLinha label="Atualizado em" valor={formatarData(item.atualizado_em)} />
              <InfoLinha label="Token" valor={item.token_mascarado || "—"} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700" />
              <div>
                <h3 className="text-sm font-black text-slate-950">Controle de segurança</h3>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  Alterações de credenciais, modo, capacidades e testes são registradas na auditoria do sistema.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CheckOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

function InfoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <strong className="max-w-[70%] text-right text-slate-700">{valor}</strong>
    </div>
  );
}

function Ramal3CX({
  usuarios,
  ramais,
  salvando,
  setRamais,
  salvarRamal,
}: {
  usuarios: Usuario3CX[];
  ramais: Record<string, string>;
  salvando: string;
  setRamais: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  salvarRamal: (usuarioId: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-700" />
        <div>
          <h2 className="font-black text-slate-950">Ramais 3CX</h2>
          <p className="text-sm font-semibold text-slate-500">Vínculo entre ramal, colaborador e status operacional.</p>
        </div>
      </div>

      <div className="grid gap-3">
        {usuarios.map((usuario) => (
          <div key={usuario.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_170px_auto] md:items-center">
            <div>
              <p className="text-sm font-black text-slate-950">{usuario.nome}</p>
              <p className="text-xs font-bold text-slate-500">
                {usuario.email} • {usuario.perfil} • {usuario.status_operacional}
              </p>
            </div>
            <input
              value={ramais[usuario.id] || ""}
              onChange={(e) => setRamais((atuais) => ({ ...atuais, [usuario.id]: e.target.value.replace(/\D/g, "") }))}
              placeholder="Ramal"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => salvarRamal(usuario.id)}
              disabled={salvando === `ramal-${usuario.id}`}
              className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {salvando === `ramal-${usuario.id}` ? "Salvando..." : "Salvar ramal"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
