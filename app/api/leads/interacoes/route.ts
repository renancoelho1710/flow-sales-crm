import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registrarHistoricoC2S } from "@/lib/c2s/sincronizacao";

type Payload = {
  lead_id?: string;
  tipo?: string;
  canal?: string;
  resultado?: string;
  observacao?: string;
  etapa?: string;
  data_proxima_acao?: string;
};

function texto(valor?: string | null) {
  return String(valor || "").trim();
}

function dataOuNull(valor?: string | null) {
  const limpo = texto(valor);
  if (!limpo) return null;

  const data = new Date(limpo);
  if (Number.isNaN(data.getTime())) return null;

  return data.toISOString();
}

function temperaturaAutomatica(resultado: string, etapa: string) {
  const valor = `${resultado} ${etapa}`.toLowerCase();

  if (
    valor.includes("venda") ||
    valor.includes("visitou") ||
    valor.includes("visita") ||
    valor.includes("agendou") ||
    valor.includes("agendado") ||
    valor.includes("simulacao") ||
    valor.includes("simulação") ||
    valor.includes("quer_ver_veiculo")
  ) {
    return "quente";
  }

  if (
    valor.includes("sem_resposta") ||
    valor.includes("nao_atendeu") ||
    valor.includes("não_atendeu")
  ) {
    return "morno";
  }

  if (valor.includes("sem_interesse")) {
    return "frio";
  }

  return "morno";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;

    const leadId = texto(body.lead_id);
    const tipo = texto(body.tipo) || "contato";
    const canal = texto(body.canal) || "sistema";
    const resultado = texto(body.resultado);
    const observacao = texto(body.observacao);
    const etapa = texto(body.etapa) || "contato";
    const proximaAcao = dataOuNull(body.data_proxima_acao);
    const temperatura = temperaturaAutomatica(resultado, etapa);

    if (!leadId) {
      return NextResponse.json(
        { ok: false, erro: "Lead não informado." },
        { status: 400 }
      );
    }

    if (!observacao) {
      return NextResponse.json(
        { ok: false, erro: "Informe a observação do atendimento." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const { data: usuarioInterno } = await supabase
      .from("usuarios_internos")
      .select("id, nome, perfil, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    if (!usuarioInterno) {
      return NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado ou inativo." },
        { status: 403 }
      );
    }

    const { data: leadExistente } = await supabase
      .from("leads")
      .select("id, data_primeiro_contato")
      .eq("id", leadId)
      .single();

    if (!leadExistente) {
      return NextResponse.json(
        { ok: false, erro: "Lead não encontrado." },
        { status: 404 }
      );
    }

    const { data: interacao, error: erroInteracao } = await supabase
      .from("lead_interacoes")
      .insert({
        lead_id: leadId,
        usuario_id: usuarioInterno.id,
        tipo,
        canal,
        resultado: resultado || null,
        observacao,
      })
      .select("*")
      .single();

    if (erroInteracao) {
      console.error("Erro ao inserir interação:", erroInteracao);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível registrar a interação." },
        { status: 500 }
      );
    }

    const atualizacaoLead: Record<string, unknown> = {
      etapa,
      temperatura,
      status: temperatura,
      data_ultimo_contato: new Date().toISOString(),
      data_proxima_acao: proximaAcao,
      atualizado_em: new Date().toISOString(),
    };

    if (!leadExistente.data_primeiro_contato) {
      atualizacaoLead.data_primeiro_contato = new Date().toISOString();
    }

    const { data: lead, error: erroLead } = await supabase
      .from("leads")
      .update(atualizacaoLead)
      .eq("id", leadId)
      .select("*")
      .single();

    if (erroLead) {
      console.error("Erro ao atualizar lead:", erroLead);

      return NextResponse.json(
        { ok: false, erro: "Interação salva, mas não foi possível atualizar o lead." },
        { status: 500 }
      );
    }

    const c2sSync = await registrarHistoricoC2S({
      supabase,
      leadId,
      usuarioId: usuarioInterno.id,
      tipoEvento: "interacao_registrada",
      titulo: "Interação registrada no Flow Sales CRM",
      descricao: [
        "[Flow Sales CRM] Interação registrada no atendimento do lead.",
        `Operador: ${usuarioInterno.nome}.`,
        `Canal: ${canal}.`,
        resultado ? `Resultado: ${resultado}.` : "",
        etapa ? `Etapa atual: ${etapa}.` : "",
        `Observação: ${observacao}`,
      ].filter(Boolean).join("\n"),
      payload: {
        interacao_id: interacao.id,
        tipo,
        canal,
        resultado: resultado || null,
        etapa,
        data_proxima_acao: proximaAcao,
      },
    });

    return NextResponse.json({
      ok: true,
      interacao,
      lead,
      c2s_sync: c2sSync,
    });
  } catch (error) {
    console.error("Erro ao registrar atendimento:", error);

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao registrar atendimento." },
      { status: 500 }
    );
  }
}
