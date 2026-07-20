"use client";

import {
  CheckCircle2,
  DatabaseZap,
  Loader2,
  PlugZap,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Provedor = {
  id: string;
  nome: string;
  tipo: string;
  provedor: string;
  ambiente: string;
  ativo: boolean;
  principal: boolean;
  base_url: string | null;
  metodo_auth: string;
  token_ref: string | null;
  intervalo_minutos: number;
  headers: Record<string, any>;
  configuracoes: Record<string, any>;
  mapeamento: Record<string, any>;
  ultimo_teste_status: string | null;
  ultimo_teste_mensagem: string | null;
  ultimo_teste_em: string | null;
  ultima_sincronizacao_em: string | null;
};

type FormState = {
  id?: string;
  nome: string;
  tipo: string;
  provedor: string;
  ambiente: string;
  ativo: boolean;
  principal: boolean;
  base_url: string;
  metodo_auth: string;
  token_ref: string;
  intervalo_minutos: number;
  headersText: string;
  configuracoesText: string;
  mapeamentoText: string;
};

const TIPOS = [
  { value: "", label: "Todos" },
  { value: "crm_leads", label: "CRM / Leads" },
  { value: "telefonia", label: "Telefonia" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "planilhas", label: "Planilhas" },
  { value: "estoque", label: "Estoque / Avaliação" },
  { value: "api_externa", label: "API externa" },
  { value: "outro", label: "Outro" },
];

const FORM_INICIAL: FormState = {
  nome: "",
  tipo: "crm_leads",
  provedor: "custom",
  ambiente: "producao",
  ativo: true,
  principal: false,
  base_url: "",
  metodo_auth: "bearer_env",
  token_ref: "",
  intervalo_minutos: 15,
  headersText: "{}",
  configuracoesText: "{}",
  mapeamentoText: "{}",
};

function tipoLabel(tipo: string) {
  return TIPOS.find((item) => item.value === tipo)?.label || tipo;
}

function dataHoraBr(valor?: string | null) {
  if (!valor) return "Nunca";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(valor));
  } catch {
    return "Nunca";
  }
}

function parseJsonSeguro(texto: string, campo: string) {
  try {
    const valor = JSON.parse(texto || "{}");

    if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
      throw new Error(`O campo ${campo} precisa ser um objeto JSON.`);
    }

    return valor;
  } catch {
    throw new Error(`JSON inválido em ${campo}.`);
  }
}

function formDeProvedor(provedor: Provedor): FormState {
  return {
    id: provedor.id,
    nome: provedor.nome || "",
    tipo: provedor.tipo || "crm_leads",
    provedor: provedor.provedor || "custom",
    ambiente: provedor.ambiente || "producao",
    ativo: Boolean(provedor.ativo),
    principal: Boolean(provedor.principal),
    base_url: provedor.base_url || "",
    metodo_auth: provedor.metodo_auth || "bearer_env",
    token_ref: provedor.token_ref || "",
    intervalo_minutos: Number(provedor.intervalo_minutos || 15),
    headersText: JSON.stringify(provedor.headers || {}, null, 2),
    configuracoesText: JSON.stringify(provedor.configuracoes || {}, null, 2),
    mapeamentoText: JSON.stringify(provedor.mapeamento || {}, null, 2),
  };
}

export function IntegracoesProvedoresPage() {
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testandoId, setTestandoId] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [form, setForm] = useState<FormState | null>(null);

  const filtrados = useMemo(() => {
    return provedores;
  }, [provedores]);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const params = new URLSearchParams();
      if (busca.trim()) params.set("busca", busca.trim());
      if (tipo) params.set("tipo", tipo);

      const resposta = await fetch(`/api/integracoes/provedores?${params}`, {
        cache: "no-store",
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível carregar integrações.");
      }

      setProvedores(json.provedores || []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar integrações.",
      );
    } finally {
      setCarregando(false);
    }
  }, [busca, tipo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function atualizarForm(campo: keyof FormState, valor: any) {
    setForm((atual) => (atual ? { ...atual, [campo]: valor } : atual));
  }

  async function salvar() {
    if (!form) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const payload = {
        nome: form.nome,
        tipo: form.tipo,
        provedor: form.provedor,
        ambiente: form.ambiente,
        ativo: form.ativo,
        principal: form.principal,
        base_url: form.base_url,
        metodo_auth: form.metodo_auth,
        token_ref: form.token_ref,
        intervalo_minutos: form.intervalo_minutos,
        headers: parseJsonSeguro(form.headersText, "headers"),
        configuracoes: parseJsonSeguro(form.configuracoesText, "configurações"),
        mapeamento: parseJsonSeguro(form.mapeamentoText, "mapeamento"),
      };

      const editando = Boolean(form.id);

      const resposta = await fetch(
        editando
          ? `/api/integracoes/provedores/${form.id}`
          : "/api/integracoes/provedores",
        {
          method: editando ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível salvar integração.");
      }

      setSucesso("Integração salva com sucesso.");
      setForm(null);
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao salvar integração.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function patchProvedor(id: string, payload: Record<string, any>) {
    try {
      setErro("");
      setSucesso("");

      const resposta = await fetch(`/api/integracoes/provedores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível atualizar integração.");
      }

      setSucesso("Integração atualizada.");
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar integração.",
      );
    }
  }

  async function remover(id: string) {
    const confirmar = window.confirm(
      "Remover esta integração? Os logs antigos continuam preservados.",
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      const resposta = await fetch(`/api/integracoes/provedores/${id}`, {
        method: "DELETE",
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || "Não foi possível remover integração.");
      }

      setSucesso("Integração removida.");
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao remover integração.",
      );
    }
  }

  async function testar(id: string) {
    try {
      setTestandoId(id);
      setErro("");
      setSucesso("");

      const resposta = await fetch(`/api/integracoes/provedores/${id}/testar`, {
        method: "POST",
      });

      const json = await resposta.json().catch(() => null);

      if (!resposta.ok || !json?.ok) {
        throw new Error(json?.erro || json?.mensagem || "Teste falhou.");
      }

      setSucesso(json.mensagem || "Conexão testada com sucesso.");
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao testar conexão.",
      );
      await carregar();
    } finally {
      setTestandoId("");
    }
  }

  return (
    <main className="flow-premium-page min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-700">
                Integrações
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                Provedores plugáveis
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                Cadastre C2S, 3CX, WhatsApp, Google Sheets, AutoAvaliar ou
                qualquer fornecedor futuro. O Flow fica preparado para trocar o
                provedor ativo sem refazer o sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setForm(FORM_INICIAL)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Nova integração
            </button>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_260px_150px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, tipo ou provedor..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-blue-600 focus:bg-white"
              />
            </label>

            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-blue-600 focus:bg-white"
            >
              {TIPOS.map((item) => (
                <option key={item.value || "todos"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={carregar}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
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

        {form ? (
          <FormularioIntegracao
            form={form}
            salvando={salvando}
            onChange={atualizarForm}
            onClose={() => setForm(null)}
            onSave={salvar}
          />
        ) : null}

        <section className="grid gap-4 xl:grid-cols-2">
          {carregando ? (
            <div className="col-span-full rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
              <p className="mt-3 text-sm font-black text-slate-500">
                Carregando integrações...
              </p>
            </div>
          ) : null}

          {!carregando && filtrados.length === 0 ? (
            <div className="col-span-full rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <DatabaseZap className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-3 text-lg font-black text-slate-950">
                Nenhuma integração encontrada
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Cadastre o primeiro provedor para preparar o Flow para APIs
                externas.
              </p>
            </div>
          ) : null}

          {filtrados.map((provedor) => (
            <article
              key={provedor.id}
              className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                      {tipoLabel(provedor.tipo)}
                    </span>

                    {provedor.principal ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
                        <Star className="h-3.5 w-3.5" />
                        Principal
                      </span>
                    ) : null}

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase ${
                        provedor.ativo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {provedor.ativo ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {provedor.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <h2 className="mt-3 truncate text-xl font-black tracking-[-0.03em] text-slate-950">
                    {provedor.nome}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Provedor:{" "}
                    <strong className="text-slate-800">
                      {provedor.provedor}
                    </strong>{" "}
                    · Ambiente:{" "}
                    <strong className="text-slate-800">
                      {provedor.ambiente}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(formDeProvedor(provedor))}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <Settings2 className="h-4 w-4" />
                    Configurar
                  </button>

                  <button
                    type="button"
                    onClick={() => remover(provedor.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Info
                  label="URL base"
                  value={provedor.base_url || "Não definida"}
                />
                <Info
                  label="Token env"
                  value={provedor.token_ref || "Não definido"}
                />
                <Info
                  label="Intervalo"
                  value={`${provedor.intervalo_minutos || 15} min`}
                />
                <Info
                  label="Último teste"
                  value={`${provedor.ultimo_teste_status || "Nunca"} · ${dataHoraBr(
                    provedor.ultimo_teste_em,
                  )}`}
                />
              </div>

              {provedor.ultimo_teste_mensagem ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
                  {provedor.ultimo_teste_mensagem}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patchProvedor(provedor.id, { ativo: !provedor.ativo })
                  }
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  {provedor.ativo ? "Desativar" : "Ativar"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    patchProvedor(provedor.id, {
                      principal: true,
                      ativo: true,
                    })
                  }
                  className="rounded-xl border border-blue-200 px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                >
                  Tornar principal
                </button>

                <button
                  type="button"
                  disabled={testandoId === provedor.id}
                  onClick={() => testar(provedor.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
                >
                  {testandoId === provedor.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlugZap className="h-4 w-4" />
                  )}
                  Testar conexão
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function FormularioIntegracao({
  form,
  salvando,
  onChange,
  onClose,
  onSave,
}: {
  form: FormState;
  salvando: boolean;
  onChange: (campo: keyof FormState, valor: any) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-[30px] border border-blue-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-700">
            {form.id ? "Editar integração" : "Nova integração"}
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Configuração do provedor
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Campo label="Nome">
          <input
            value={form.nome}
            onChange={(event) => onChange("nome", event.target.value)}
            className="input-flow"
            placeholder="Ex: C2S, 3CX, Novo CRM..."
          />
        </Campo>

        <Campo label="Tipo">
          <select
            value={form.tipo}
            onChange={(event) => onChange("tipo", event.target.value)}
            className="input-flow"
          >
            {TIPOS.filter((item) => item.value).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Provedor">
          <input
            value={form.provedor}
            onChange={(event) => onChange("provedor", event.target.value)}
            className="input-flow"
            placeholder="c2s, 3cx, google_sheets..."
          />
        </Campo>

        <Campo label="Ambiente">
          <select
            value={form.ambiente}
            onChange={(event) => onChange("ambiente", event.target.value)}
            className="input-flow"
          >
            <option value="producao">Produção</option>
            <option value="homologacao">Homologação</option>
            <option value="teste">Teste</option>
          </select>
        </Campo>

        <Campo label="URL base">
          <input
            value={form.base_url}
            onChange={(event) => onChange("base_url", event.target.value)}
            className="input-flow"
            placeholder="https://api.exemplo.com"
          />
        </Campo>

        <Campo label="Método de autenticação">
          <select
            value={form.metodo_auth}
            onChange={(event) => onChange("metodo_auth", event.target.value)}
            className="input-flow"
          >
            <option value="bearer_env">Bearer via .env</option>
            <option value="service_account_env">
              Service account via .env
            </option>
            <option value="sem_auth">Sem autenticação</option>
          </select>
        </Campo>

        <Campo label="Nome da variável no .env">
          <input
            value={form.token_ref}
            onChange={(event) => onChange("token_ref", event.target.value)}
            className="input-flow"
            placeholder="C2S_API_TOKEN"
          />
        </Campo>

        <Campo label="Intervalo de sincronização">
          <input
            type="number"
            min={1}
            value={form.intervalo_minutos}
            onChange={(event) =>
              onChange("intervalo_minutos", Number(event.target.value || 15))
            }
            className="input-flow"
          />
        </Campo>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
          <div>
            <p className="font-black text-slate-950">Ativo</p>
            <p className="text-xs font-semibold text-slate-500">
              Permite uso futuro pelo motor de integrações.
            </p>
          </div>
          <Toggle
            checked={form.ativo}
            onClick={() => onChange("ativo", !form.ativo)}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
          <div>
            <p className="font-black text-slate-950">Principal do tipo</p>
            <p className="text-xs font-semibold text-slate-500">
              Define o provedor ativo para esse tipo.
            </p>
          </div>
          <Toggle
            checked={form.principal}
            onClick={() => onChange("principal", !form.principal)}
          />
        </div>

        <Campo label="Headers JSON" grande>
          <textarea
            value={form.headersText}
            onChange={(event) => onChange("headersText", event.target.value)}
            className="textarea-flow"
          />
        </Campo>

        <Campo label="Configurações JSON" grande>
          <textarea
            value={form.configuracoesText}
            onChange={(event) =>
              onChange("configuracoesText", event.target.value)
            }
            className="textarea-flow"
          />
        </Campo>

        <Campo label="Mapeamento JSON" grande>
          <textarea
            value={form.mapeamentoText}
            onChange={(event) => onChange("mapeamentoText", event.target.value)}
            className="textarea-flow"
          />
        </Campo>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={salvando}
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar integração
        </button>
      </div>
    </section>
  );
}

function Campo({
  label,
  children,
  grande = false,
}: {
  label: string;
  children: React.ReactNode;
  grande?: boolean;
}) {
  return (
    <label className={`grid gap-2 ${grande ? "xl:col-span-1" : ""}`}>
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-8 w-14 rounded-full transition ${
        checked ? "bg-blue-700" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
          checked ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}
