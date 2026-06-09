type AnyRecord = Record<string, any>;

type RegistrarHistoricoParams = {
  supabase: any;
  leadId: string;
  usuarioId?: string | null;
  tipoEvento: string;
  titulo: string;
  descricao: string;
  payload?: AnyRecord;
  origem?: string;
};

type ReprocessarParams = {
  supabase: any;
  limite?: number;
};

function texto(valor?: string | null) {
  return String(valor || "").trim();
}

function dataHoraBR(data = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function endpointHistorico(lead: AnyRecord, eventoId: string) {
  const baseUrl = texto(process.env.C2S_API_BASE_URL).replace(/\/$/, "");
  const template = texto(process.env.C2S_HISTORICO_ENDPOINT) || "/integration/leads/{c2s_id}/interactions";

  if (!baseUrl) return null;

  const c2sId = texto(lead.c2s_id || lead.c2s_lead_id || lead.c2s_uuid || lead.external_id || lead.id);
  const internalId = texto(lead.c2s_internal_id || lead.internal_id || lead.codigo_c2s || "");

  const caminho = template
    .replaceAll("{c2s_id}", encodeURIComponent(c2sId))
    .replaceAll("{lead_id}", encodeURIComponent(c2sId))
    .replaceAll("{internal_id}", encodeURIComponent(internalId))
    .replaceAll("{evento_id}", encodeURIComponent(eventoId));

  return `${baseUrl}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}

function montarPayloadC2S(evento: AnyRecord, lead: AnyRecord) {
  const descricao = texto(evento.descricao);

  return {
    source: "Flow Sales CRM",
    type: "note",
    category: "history",
    external_event_id: evento.id,
    lead_id: lead.c2s_id || lead.c2s_internal_id || lead.id,
    c2s_id: lead.c2s_id || null,
    c2s_internal_id: lead.c2s_internal_id || null,
    title: evento.titulo || "Atualização Flow Sales CRM",
    description: descricao,
    observation: descricao,
    message: descricao,
    occurred_at: evento.criado_em || new Date().toISOString(),
    payload: evento.payload || {},
  };
}

async function buscarLead(supabase: any, leadId: string) {
  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      id,
      nome,
      telefone,
      telefone_normalizado,
      email,
      origem,
      etapa,
      temperatura,
      veiculo_interesse,
      c2s_id,
      c2s_internal_id,
      vendedor_c2s_nome,
      loja_carteira_c2s_nome,
      loja_visita_nome,
      atendente_resgate_nome
      `
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw error;
  return data as AnyRecord | null;
}

async function atualizarEvento(supabase: any, eventoId: string, dados: AnyRecord) {
  try {
    await supabase.from("lead_sincronizacoes_c2s").update(dados).eq("id", eventoId);
  } catch (error) {
    console.error("Erro ao atualizar evento C2S:", error);
  }
}

async function enviarEventoC2S(supabase: any, evento: AnyRecord, lead: AnyRecord) {
  const token = texto(process.env.C2S_API_TOKEN);
  const url = endpointHistorico(lead, evento.id);

  if (!url || !token) {
    const erro = "C2S_API_BASE_URL, C2S_API_TOKEN ou endpoint de histórico não configurado.";
    await atualizarEvento(supabase, evento.id, {
      status_envio: "pendente_configuracao",
      erro,
      proxima_tentativa_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    });
    return { ok: false, status: "pendente_configuracao", erro };
  }

  const payload = montarPayloadC2S(evento, lead);

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const textoResposta = await resposta.text();
    let json: AnyRecord | null = null;

    try {
      json = textoResposta ? JSON.parse(textoResposta) : null;
    } catch {
      json = { raw: textoResposta };
    }

    if (!resposta.ok) {
      const erro = `C2S respondeu ${resposta.status}: ${textoResposta.slice(0, 500)}`;
      await atualizarEvento(supabase, evento.id, {
        status_envio: "erro",
        tentativas: Number(evento.tentativas || 0) + 1,
        erro,
        c2s_resposta: json || {},
        proxima_tentativa_em: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        atualizado_em: new Date().toISOString(),
      });
      return { ok: false, status: "erro", erro };
    }

    await atualizarEvento(supabase, evento.id, {
      status_envio: "enviado",
      tentativas: Number(evento.tentativas || 0) + 1,
      erro: null,
      c2s_resposta: json || {},
      enviado_em: new Date().toISOString(),
      proxima_tentativa_em: null,
      atualizado_em: new Date().toISOString(),
    });

    return { ok: true, status: "enviado" };
  } catch (error) {
    const erro = error instanceof Error ? error.message : "Erro desconhecido ao enviar histórico para C2S.";
    await atualizarEvento(supabase, evento.id, {
      status_envio: "erro",
      tentativas: Number(evento.tentativas || 0) + 1,
      erro,
      proxima_tentativa_em: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    });
    return { ok: false, status: "erro", erro };
  }
}

export async function registrarHistoricoC2S(params: RegistrarHistoricoParams) {
  const { supabase, leadId, usuarioId, tipoEvento, titulo, payload = {}, origem = "flow" } = params;
  const descricao = texto(params.descricao);

  if (!leadId || !descricao) {
    return { ok: false, status: "ignorado", erro: "Lead ou descrição não informado." };
  }

  try {
    const lead = await buscarLead(supabase, leadId);

    if (!lead) {
      return { ok: false, status: "ignorado", erro: "Lead não localizado para sincronização C2S." };
    }

    const eventoParaInserir = {
      lead_id: leadId,
      usuario_id: usuarioId || null,
      tipo_evento: tipoEvento,
      origem,
      titulo: texto(titulo) || "Atualização Flow Sales CRM",
      descricao,
      payload: {
        ...payload,
        gerado_em: dataHoraBR(),
        lead_nome: lead.nome || null,
        lead_telefone: lead.telefone || lead.telefone_normalizado || null,
      },
      c2s_id: lead.c2s_id || null,
      c2s_internal_id: lead.c2s_internal_id || null,
      status_envio: "pendente",
      tentativas: 0,
    };

    const { data: evento, error } = await supabase
      .from("lead_sincronizacoes_c2s")
      .insert(eventoParaInserir)
      .select("*")
      .single();

    if (error || !evento) {
      console.error("Erro ao criar fila C2S:", error);
      return {
        ok: false,
        status: "erro_fila",
        erro: error?.message || "Não foi possível criar evento de sincronização C2S.",
      };
    }

    return await enviarEventoC2S(supabase, evento, lead);
  } catch (error) {
    console.error("Erro ao registrar histórico C2S:", error);
    return {
      ok: false,
      status: "erro",
      erro: error instanceof Error ? error.message : "Erro desconhecido ao sincronizar C2S.",
    };
  }
}

export async function reprocessarHistoricosPendentesC2S({ supabase, limite = 25 }: ReprocessarParams) {
  const agora = new Date().toISOString();
  const { data: eventos, error } = await supabase
    .from("lead_sincronizacoes_c2s")
    .select("*")
    .in("status_envio", ["pendente", "erro", "pendente_configuracao"])
    .or(`proxima_tentativa_em.is.null,proxima_tentativa_em.lte.${agora}`)
    .lt("tentativas", 8)
    .order("criado_em", { ascending: true })
    .limit(limite);

  if (error) {
    return { ok: false, erro: error.message, processados: 0 };
  }

  let enviados = 0;
  let erros = 0;

  for (const evento of (eventos || []) as AnyRecord[]) {
    try {
      const lead = await buscarLead(supabase, evento.lead_id);
      if (!lead) {
        await atualizarEvento(supabase, evento.id, {
          status_envio: "erro",
          erro: "Lead não localizado para reprocessamento.",
          atualizado_em: new Date().toISOString(),
        });
        erros++;
        continue;
      }

      const resultado = await enviarEventoC2S(supabase, evento, lead);
      if (resultado.ok) enviados++;
      else erros++;
    } catch (error) {
      console.error("Erro ao reprocessar histórico C2S:", error);
      erros++;
    }
  }

  return {
    ok: true,
    processados: (eventos || []).length,
    enviados,
    erros,
  };
}
