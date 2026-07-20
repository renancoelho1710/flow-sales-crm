"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CarFront,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Phone,
  Send,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { AtendimentoHeader } from "@/components/atendimento/AtendimentoHeader";

const estadoInicial = {
  nome_indicado: "",
  telefone_indicado: "",
  email_indicado: "",
  nome_indicador: "",
  telefone_indicador: "",
  veiculo_interesse: "",
  observacao_atendente: "",
};

export function NovoLeadClient({ perfil }: { perfil?: string | null }) {
  const [form, setForm] = useState(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const podeGerir = useMemo(() => ["adm", "admin", "suporte", "gerente", "supervisor"].includes(String(perfil || "").toLowerCase()), [perfil]);

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/leads/solicitacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível enviar a solicitação.");
      }

      setSucesso("Solicitação enviada para supervisão. O lead só será criado após aprovação.");
      setForm(estadoInicial);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar a solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flow-premium-page fs-attention-page">
      <div className="mx-auto max-w-[1380px] space-y-4">
        <AtendimentoHeader
          active="indicar"
          title="Indicar novo cliente"
          description="Registre a indicação durante o atendimento. A supervisão confere os dados e cria o lead no C2S sem o operador sair do Flow Sales."
          canManage={podeGerir}
          primaryAction={{ href: "/dashboard/leads", label: "Voltar para a fila" }}
          secondaryAction={podeGerir ? { href: "/dashboard/leads/solicitacoes", label: "Ver aprovações" } : undefined}
        />

        <section className="fs-new-lead-layout">
          <aside className="fs-new-lead-guide">
            <p className="fs-attention-eyebrow">Fluxo simples</p>
            <h2>O operador informa. O sistema organiza.</h2>
            <p>Somente os dados realmente úteis ficam visíveis. O restante é tratado pela supervisão e pelas integrações.</p>

            <ol>
              <li className="is-active"><span>1</span><div><strong>Identifique o cliente</strong><small>Nome e telefone do indicado.</small></div></li>
              <li><span>2</span><div><strong>Registre o contexto</strong><small>Quem indicou e qual veículo procura.</small></div></li>
              <li><span>3</span><div><strong>Envie para validação</strong><small>A supervisão cria no C2S.</small></div></li>
            </ol>

            <div className="fs-new-lead-note">
              <ShieldCheck className="h-5 w-5" />
              <div><strong>Proteção contra duplicidade</strong><span>O telefone é conferido antes da solicitação ser aceita.</span></div>
            </div>
          </aside>

          <section className="fs-new-lead-form-card">
            <form onSubmit={enviar} className="fs-new-lead-form">
              <header>
                <p className="fs-attention-eyebrow">Dados essenciais</p>
                <h2>Quem é o novo cliente?</h2>
                <span>Campos com * são obrigatórios.</span>
              </header>

              <div className="fs-form-grid fs-form-grid--two">
                <label className="fs-premium-field">
                  <span>Nome do indicado *</span>
                  <div><UserRound className="h-5 w-5" /><input value={form.nome_indicado} onChange={(e) => atualizar("nome_indicado", e.target.value)} required placeholder="Nome completo" /></div>
                </label>
                <label className="fs-premium-field">
                  <span>Telefone do indicado *</span>
                  <div><Phone className="h-5 w-5" /><input value={form.telefone_indicado} onChange={(e) => atualizar("telefone_indicado", e.target.value)} required placeholder="(19) 99999-9999" /></div>
                </label>
              </div>

              <label className="fs-premium-field">
                <span>E-mail do indicado</span>
                <div><MessageSquareText className="h-5 w-5" /><input type="email" value={form.email_indicado} onChange={(e) => atualizar("email_indicado", e.target.value)} placeholder="cliente@email.com" /></div>
              </label>

              <div className="fs-form-divider"><span>Contexto da indicação</span></div>

              <div className="fs-form-grid fs-form-grid--two">
                <label className="fs-premium-field">
                  <span>Quem indicou</span>
                  <div><Users className="h-5 w-5" /><input value={form.nome_indicador} onChange={(e) => atualizar("nome_indicador", e.target.value)} placeholder="Nome do cliente que indicou" /></div>
                </label>
                <label className="fs-premium-field">
                  <span>Telefone de quem indicou</span>
                  <div><Phone className="h-5 w-5" /><input value={form.telefone_indicador} onChange={(e) => atualizar("telefone_indicador", e.target.value)} placeholder="(19) 99999-9999" /></div>
                </label>
              </div>

              <label className="fs-premium-field">
                <span>Veículo ou necessidade</span>
                <div><CarFront className="h-5 w-5" /><input value={form.veiculo_interesse} onChange={(e) => atualizar("veiculo_interesse", e.target.value)} placeholder="Ex.: SUV automático até R$ 100 mil" /></div>
              </label>

              <label className="fs-premium-field fs-premium-field--textarea">
                <span>Resumo do atendimento</span>
                <div><MessageSquareText className="h-5 w-5" /><textarea value={form.observacao_atendente} onChange={(e) => atualizar("observacao_atendente", e.target.value)} rows={5} placeholder="Conte o que foi combinado e o que a supervisão precisa saber." /></div>
              </label>

              {erro ? <div className="fs-attention-alert is-error">{erro}</div> : null}
              {sucesso ? <div className="fs-attention-alert is-success"><CheckCircle2 className="h-5 w-5" /> {sucesso}</div> : null}

              <footer className="fs-form-actions">
                <p><ShieldCheck className="h-4 w-4" /> O lead só é criado após validação.</p>
                <button type="submit" disabled={enviando}>
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {enviando ? "Enviando..." : "Enviar para aprovação"}
                </button>
              </footer>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}
