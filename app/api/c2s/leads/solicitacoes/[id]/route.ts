import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  acao?: "salvar" | "rejeitar" | "criar_c2s";
  origem_c2s?: string;
  campanha?: string;
  tags?: string;
  fila_vendedor?: string;
  observacao_supervisor?: string;
  motivo_rejeicao?: string;
};

type SolicitacaoLead = {
  id: string;
  nome_indicado: string;
  telefone_indicado: string;
  telefone_indicado_normalizado: string;
  email_indicado: string | null;
  nome_indicador: string | null;
  telefone_indicador: string | null;
  veiculo_interesse: string | null;
  observacao_atendente: string | null;
  origem_c2s: string | null;
  campanha: string | null;
  tags: string[] | null;
  fila_vendedor: string | null;
  observacao_supervisor: string | null;
  status: string;
};

function texto(valor?: string | null) {
  return String(valor || "").trim();
}

function tagsArray(valor?: string) {
  return String(valor || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function montarObservacao(solicitacao: SolicitacaoLead) {
  const partes = [
    "Lead criado pelo Flow Sales CRM a partir de solicitação interna.",
    "",
    solicitacao.nome_indicador
      ? `Indicado por: ${solicitacao.nome_indicador}`
      : "",
    solicitacao.telefone_indicador
      ? `Telefone de quem indicou: ${solicitacao.telefone_indicador}`
      : "",
    solicitacao.veiculo_interesse
      ? `Veículo de interesse: ${solicitacao.veiculo_interesse}`
      : "",
    "",
    solicitacao.observacao_atendente
      ? `Observação do atendente: ${solicitacao.observacao_atendente}`
      : "",
    solicitacao.observacao_supervisor
      ? `Observação da supervisão: ${solicitacao.observacao_supervisor}`
      : "",
    solicitacao.tags?.length ? `Tags: ${solicitacao.tags.join(", ")}` : "",
    solicitacao.fila_vendedor
      ? `Fila/vendedor sugerido: ${solicitacao.fila_vendedor}`
      : "",
  ];

  return partes.filter(Boolean).join("\n");
}

async function criarLeadNoC2S(solicitacao: SolicitacaoLead) {
  const baseUrl = process.env.C2S_API_BASE_URL;
  const token = process.env.C2S_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error("Configuração da API C2S incompleta.");
  }

  const observation = montarObservacao(solicitacao);

  const resposta = await fetch(`${baseUrl}/integration/leads`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-api-key": token,
      token,
    },
    body: JSON.stringify({
      data: {
        type: "lead",
        attributes: {
          name: solicitacao.nome_indicado,
          phone: solicitacao.telefone_indicado_normalizado || solicitacao.telefone_indicado,
          cellphone: solicitacao.telefone_indicado_normalizado || solicitacao.telefone_indicado,
          email: solicitacao.email_indicado || undefined,
          description:
            solicitacao.veiculo_interesse ||
            solicitacao.campanha ||
            "Lead por indicação",
          observation,
          source: solicitacao.origem_c2s || "Flow Sales CRM",
        },
      },
    }),
    cache: "no-store",
  });

  const textoResposta = await resposta.text();
  let json: any = null;

  try {
    json = JSON.parse(textoResposta);
  } catch {
    json = null;
  }

  if (!resposta.ok || !json?.success) {
    throw new Error(
      json?.message ||
        json?.error ||
        textoResposta.slice(0, 500) ||
        "C2S recusou a criação do lead."
    );
  }

  return json;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Payload;
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

    const perfil = String(usuarioInterno?.perfil || "").toLowerCase();
    const podeAnalisar = ["adm", "admin", "supervisor", "gerente", "suporte"].includes(perfil);

    if (!usuarioInterno || !podeAnalisar) {
      return NextResponse.json(
        { ok: false, erro: "Usuário sem permissão para analisar solicitações." },
        { status: 403 }
      );
    }

    const acao = body.acao || "salvar";

    if (acao === "rejeitar") {
      const motivo = texto(body.motivo_rejeicao);

      if (!motivo) {
        return NextResponse.json(
          { ok: false, erro: "Informe o motivo da rejeição." },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("lead_solicitacoes")
        .update({
          status: "rejeitado",
          motivo_rejeicao: motivo,
          analisado_por: usuarioInterno.id,
          analisado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, erro: "Não foi possível rejeitar a solicitação." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, solicitacao: data });
    }

    if (acao === "criar_c2s") {
      const { data: solicitacao, error: erroSolicitacao } = await supabase
        .from("lead_solicitacoes")
        .select("*")
        .eq("id", id)
        .single();

      if (erroSolicitacao || !solicitacao) {
        return NextResponse.json(
          { ok: false, erro: "Solicitação não encontrada." },
          { status: 404 }
        );
      }

      if (solicitacao.status === "criado_c2s") {
        return NextResponse.json(
          { ok: false, erro: "Esta solicitação já foi criada no C2S." },
          { status: 409 }
        );
      }

      if (solicitacao.status === "rejeitado") {
        return NextResponse.json(
          { ok: false, erro: "Solicitação rejeitada não pode ser criada no C2S." },
          { status: 400 }
        );
      }

      const { data: leadExistente } = await supabase
        .from("leads")
        .select("id, nome, telefone")
        .eq("telefone_normalizado", solicitacao.telefone_indicado_normalizado)
        .maybeSingle();

      if (leadExistente) {
        return NextResponse.json(
          { ok: false, erro: "Já existe um lead com esse telefone no Flow." },
          { status: 409 }
        );
      }

      try {
        const retornoC2S = await criarLeadNoC2S(solicitacao as SolicitacaoLead);
        const c2sId = retornoC2S?.lead_id || null;
        const observacao = montarObservacao(solicitacao as SolicitacaoLead);

        const { data: novoLead, error: erroLead } = await supabase
          .from("leads")
          .insert({
            c2s_id: c2sId,
            c2s_internal_id: null,
            nome: solicitacao.nome_indicado,
            telefone: solicitacao.telefone_indicado,
            telefone_normalizado: solicitacao.telefone_indicado_normalizado,
            email: solicitacao.email_indicado || null,
            origem: solicitacao.origem_c2s || "Flow Sales CRM",
            campanha: solicitacao.campanha || "Indicação",
            status: "morno",
            etapa: "novo",
            temperatura: "morno",
            veiculo_interesse: solicitacao.veiculo_interesse || null,
            observacao,
            produto_c2s: {
              criado_pelo_flow: true,
              received_by: retornoC2S?.received_by || null,
              company: retornoC2S?.company || null,
              info: retornoC2S?.info || null,
            },
          })
          .select("id")
          .single();

        if (erroLead || !novoLead) {
          await supabase
            .from("lead_solicitacoes")
            .update({
              status: "erro_c2s",
              c2s_id: c2sId,
              erro_c2s:
                "Lead criado no C2S, mas não foi possível salvar no Flow. Verifique manualmente.",
              atualizado_em: new Date().toISOString(),
            })
            .eq("id", id);

          return NextResponse.json(
            {
              ok: false,
              erro:
                "Lead criado no C2S, mas não foi possível salvar no Flow. Verifique manualmente.",
            },
            { status: 500 }
          );
        }

        const { data: solicitacaoAtualizada, error: erroAtualizacao } = await supabase
          .from("lead_solicitacoes")
          .update({
            status: "criado_c2s",
            lead_id: novoLead.id,
            c2s_id: c2sId,
            c2s_internal_id: null,
            erro_c2s: null,
            analisado_por: usuarioInterno.id,
            analisado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();

        if (erroAtualizacao) {
          return NextResponse.json(
            {
              ok: false,
              erro:
                "Lead criado no C2S e no Flow, mas não foi possível atualizar a solicitação.",
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          ok: true,
          mensagem: "Lead criado no C2S e salvo no Flow.",
          solicitacao: solicitacaoAtualizada,
          lead_id: novoLead.id,
          c2s_id: c2sId,
          c2s: retornoC2S,
        });
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível criar o lead no C2S.";

        const { data: solicitacaoErro } = await supabase
          .from("lead_solicitacoes")
          .update({
            status: "erro_c2s",
            erro_c2s: mensagem,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();

        return NextResponse.json(
          {
            ok: false,
            erro: mensagem,
            solicitacao: solicitacaoErro,
          },
          { status: 500 }
        );
      }
    }

    const { data, error } = await supabase
      .from("lead_solicitacoes")
      .update({
        origem_c2s: texto(body.origem_c2s) || null,
        campanha: texto(body.campanha) || null,
        tags: tagsArray(body.tags),
        fila_vendedor: texto(body.fila_vendedor) || null,
        observacao_supervisor: texto(body.observacao_supervisor) || null,
        status: "em_analise",
        analisado_por: usuarioInterno.id,
        analisado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, erro: "Não foi possível salvar a análise." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, solicitacao: data });
  } catch (error) {
    console.error("Erro ao atualizar solicitação de lead:", error);
    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao atualizar solicitação." },
      { status: 500 }
    );
  }
}
