"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  DownloadCloud,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AtendimentoHeader } from "@/components/atendimento/AtendimentoHeader";

type ResultadoImportacao = {
  ok: boolean;
  total_recebidos?: number;
  total_importados?: number;
  total_atualizados?: number;
  total_sem_telefone?: number;
  total_com_vendedor_c2s?: number;
  total_com_loja_carteira?: number;
  total_atribuidos_automaticamente?: number;
  total_sem_responsavel_disponivel?: number;
  erro?: string;
  status?: number;
  resposta?: string;
};

type EtapaImportacao = {
  titulo: string;
  detalhe: string;
};

const etapasImportacao: EtapaImportacao[] = [
  {
    titulo: "Conectando ao C2S",
    detalhe: "Validando credenciais e preparando a consulta da base.",
  },
  {
    titulo: "Buscando oportunidades",
    detalhe: "Lendo leads retornados pela integração oficial.",
  },
  {
    titulo: "Normalizando dados",
    detalhe: "Tratando telefone, cliente, veículo, vendedor e loja/carteira.",
  },
  {
    titulo: "Comparando com o Flow",
    detalhe: "Identificando leads novos e leads que já existem no CRM.",
  },
  {
    titulo: "Atualizando a base",
    detalhe: "Criando novos registros e atualizando oportunidades existentes.",
  },
  {
    titulo: "Distribuindo atendimento",
    detalhe: "Vinculando leads sem responsável aos operadores disponíveis.",
  },
  {
    titulo: "Finalizando relatório",
    detalhe: "Gerando resumo da importação para conferência.",
  },
];

function CardResultado({
  titulo,
  valor,
  descricao,
  destaque = false,
}: {
  titulo: string;
  valor: number | string;
  descricao: string;
  destaque?: boolean;
}) {
  return (
    <div className={`fs-attention-metric ${destaque ? "is-blue" : "is-slate"}`}>
      <span className="fs-attention-metric__label">{titulo}</span>
      <strong>{valor}</strong>
      <small>{descricao}</small>
    </div>
  );
}

function LinhaResumo({
  label,
  valor,
  detalhe,
  tom,
}: {
  label: string;
  valor: number;
  detalhe: string;
  tom: "blue" | "emerald" | "orange" | "red" | "slate";
}) {
  return (
    <div className={`fs-sync-summary-row is-${tom}`}>
      <strong>{label}</strong>
      <span>{valor}</span>
      <small>{detalhe}</small>
    </div>
  );
}

function etapaStatus(index: number, etapaAtual: number, concluido: boolean) {
  if (concluido) return "concluida";
  if (index < etapaAtual) return "concluida";
  if (index === etapaAtual) return "andamento";
  return "pendente";
}

export default function Page() {
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [erro, setErro] = useState("");
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [inicioImportacao, setInicioImportacao] = useState<Date | null>(null);

  const progresso = useMemo(() => {
    if (resultado) return 100;
    if (!carregando) return 0;
    const total = etapasImportacao.length;
    return Math.min(96, Math.round(((etapaAtual + 1) / total) * 100));
  }, [carregando, etapaAtual, resultado]);

  useEffect(() => {
    if (!carregando) return;

    const intervalo = window.setInterval(() => {
      setEtapaAtual((atual) => {
        if (atual >= etapasImportacao.length - 2) return atual;
        return atual + 1;
      });
    }, 1500);

    return () => window.clearInterval(intervalo);
  }, [carregando]);

  async function importarBase() {
    setCarregando(true);
    setErro("");
    setResultado(null);
    setEtapaAtual(0);
    setInicioImportacao(new Date());

    try {
      const resposta = await fetch("/api/c2s/importar", {
        method: "POST",
        cache: "no-store",
      });

      setEtapaAtual(etapasImportacao.length - 1);

      const dados = (await resposta.json().catch(() => null)) as ResultadoImportacao | null;

      if (!resposta.ok || !dados?.ok) {
        throw new Error(
          dados?.erro ||
            dados?.resposta ||
            "Não foi possível importar a base C2S. Verifique a integração."
        );
      }

      setResultado(dados);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao importar base."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flow-premium-page fs-attention-page">
      <div className="mx-auto max-w-[1480px] space-y-4">
        <AtendimentoHeader
          active="sincronizar"
          title="Sincronizar com o C2S"
          description="Traga oportunidades, atualize dados e distribua atendimento sem interromper o trabalho da equipe."
          canManage
          primaryAction={{ href: "/dashboard/leads", label: "Ver fila atualizada" }}
          secondaryAction={{ href: "/dashboard/leads/solicitacoes", label: "Aprovações" }}
          aside={
            <button type="button" onClick={importarBase} disabled={carregando} className="fs-sync-primary-action">
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
              {carregando ? "Sincronizando..." : "Sincronizar agora"}
            </button>
          }
        />

        <section className="fs-sync-overview">
          <article><Database className="h-5 w-5" /><div><strong>Origem oficial</strong><span>Leads vêm diretamente da API C2S configurada.</span></div></article>
          <article><CheckCircle2 className="h-5 w-5" /><div><strong>Sem duplicidade</strong><span>Registros existentes são atualizados, não recriados.</span></div></article>
          <article><RefreshCw className="h-5 w-5" /><div><strong>Distribuição automática</strong><span>Novos leads entram na fila de operadores disponíveis.</span></div></article>
        </section>

        <section className={`fs-sync-console ${erro ? "is-error" : resultado ? "is-success" : carregando ? "is-running" : ""}`}>
          <div className="fs-sync-console__status">
            <div className="fs-sync-console__icon">
              {erro ? <AlertTriangle className="h-6 w-6" /> : resultado ? <CheckCircle2 className="h-6 w-6" /> : carregando ? <Loader2 className="h-6 w-6 animate-spin" /> : <Database className="h-6 w-6" />}
            </div>
            <div>
              <p className="fs-attention-eyebrow">Status da sincronização</p>
              <h2>{resultado ? "Base atualizada com sucesso" : erro ? "Sincronização interrompida" : carregando ? etapasImportacao[etapaAtual]?.titulo : "Pronto para sincronizar"}</h2>
              <span>{resultado ? "Confira o resumo abaixo e siga para a fila de atendimento." : erro ? "Revise a mensagem e tente novamente quando a integração estiver disponível." : carregando ? etapasImportacao[etapaAtual]?.detalhe : "A sincronização não altera o trabalho já registrado pelos operadores."}</span>
              {inicioImportacao ? <small>Iniciado às {inicioImportacao.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small> : null}
            </div>
          </div>

          <div className="fs-sync-console__progress">
            <div className="fs-sync-progress-ring" style={{ "--progress": `${progresso * 3.6}deg` } as CSSProperties}><span>{progresso}%</span></div>
            {!carregando && !resultado ? <button type="button" onClick={importarBase}><DownloadCloud className="h-4 w-4" /> Iniciar</button> : null}
          </div>
        </section>

        {(carregando || resultado || erro) ? (
          <section className="fs-sync-timeline">
            {etapasImportacao.map((etapa, index) => {
              const status = etapaStatus(index, etapaAtual, Boolean(resultado));
              return (
                <article key={etapa.titulo} className={`is-${status}`}>
                  <span>{status === "concluida" ? <CheckCircle2 className="h-4 w-4" /> : status === "andamento" ? <Loader2 className="h-4 w-4 animate-spin" /> : index + 1}</span>
                  <div><strong>{etapa.titulo}</strong><small>{etapa.detalhe}</small></div>
                </article>
              );
            })}
          </section>
        ) : null}

        {erro ? <div className="fs-attention-alert is-error"><AlertTriangle className="h-5 w-5" /> {erro}</div> : null}

        {resultado ? (
          <section className="fs-sync-results">
            <header><div><p className="fs-attention-eyebrow">Resultado</p><h2>O que mudou nesta sincronização</h2></div><span><CheckCircle2 className="h-4 w-4" /> Concluída</span></header>

            <div className="fs-attention-metrics fs-attention-metrics--four">
              <CardResultado titulo="Recebidos" valor={resultado.total_recebidos ?? 0} descricao="Retornados pelo C2S" destaque />
              <CardResultado titulo="Novos" valor={resultado.total_importados ?? 0} descricao="Criados no Flow" />
              <CardResultado titulo="Atualizados" valor={resultado.total_atualizados ?? 0} descricao="Dados renovados" />
              <CardResultado titulo="Sem telefone" valor={resultado.total_sem_telefone ?? 0} descricao="Ignorados com segurança" />
            </div>

            <div className="fs-sync-summary-list">
              <LinhaResumo label="Com vendedor C2S" valor={resultado.total_com_vendedor_c2s ?? 0} detalhe="Mantiveram a carteira comercial identificada." tom="blue" />
              <LinhaResumo label="Com loja/carteira" valor={resultado.total_com_loja_carteira ?? 0} detalhe="Vieram com loja de origem identificada." tom="emerald" />
              <LinhaResumo label="Distribuídos" valor={resultado.total_atribuidos_automaticamente ?? 0} detalhe="Foram ligados automaticamente a operadores disponíveis." tom="orange" />
              <LinhaResumo label="Sem responsável" valor={resultado.total_sem_responsavel_disponivel ?? 0} detalhe="Aguardam disponibilidade para entrar na operação." tom={(resultado.total_sem_responsavel_disponivel ?? 0) > 0 ? "red" : "slate"} />
            </div>

            <footer>
              <Link href="/dashboard/leads"><Users className="h-4 w-4" /> Abrir fila</Link>
              <Link href="/dashboard/kanban" className="is-secondary"><ShieldCheck className="h-4 w-4" /> Ver funil</Link>
            </footer>
          </section>
        ) : null}
      </div>
    </main>
  );
}
