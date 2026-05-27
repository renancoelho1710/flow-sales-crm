import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type MensagemRecebida = {
  whatsapp_message_id?: string | null;
  telefone?: string | null;
  telefone_normalizado?: string | null;
  direcao?: "enviada" | "recebida" | "sistema" | null;
  tipo?: "texto" | "imagem" | "audio" | "video" | "documento" | "sistema" | "outro" | null;
  mensagem_preview?: string | null;
  enviada_em?: string | null;
};

type MensagensBody = {
  token?: string;
  conector_id?: string;
  mensagens?: MensagemRecebida[];
};

function somenteNumeros(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function dataOuNull(valor?: string | null) {
  if (!valor) return null;

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return null;

  return data.toISOString();
}

function limparTexto(valor?: string | null) {
  const texto = String(valor || "").trim();
  return texto.length > 0 ? texto : null;
}

function direcaoValida(valor?: string | null) {
  if (valor === "enviada" || valor === "recebida" || valor === "sistema") {
    return valor;
  }

  return null;
}

function tipoValido(valor?: string | null) {
  if (
    valor === "texto" ||
    valor === "imagem" ||
    valor === "audio" ||
    valor === "video" ||
    valor === "documento" ||
    valor === "sistema" ||
    valor === "outro"
  ) {
    return valor;
  }

  return "texto";
}

function hashMensagem(params: {
  telefone_normalizado: string;
  direcao: string;
  tipo: string;
  mensagem_preview?: string | null;
  enviada_em?: string | null;
}) {
  return createHash("sha256")
    .update(
      [
        params.telefone_normalizado,
        params.direcao,
        params.tipo,
        params.mensagem_preview || "",
        params.enviada_em || "",
      ].join("|")
    )
    .digest("hex");
}

function definirStatusAuditoria(params: {
  clienteEstaNaBase: boolean;
  teveLigacao3cx: boolean;
  clienteRespondeu: boolean;
}) {
  const { clienteEstaNaBase, teveLigacao3cx, clienteRespondeu } = params;

  if (!clienteEstaNaBase) {
    return "fora_da_base";
  }

  if (clienteRespondeu && !teveLigacao3cx) {
    return "whatsapp_sem_3cx";
  }

  if (clienteRespondeu) {
    return "cliente_respondeu";
  }

  return "pendente";
}

async function buscarOuCriarConversa(params: {
  conector_id: string;
  usuario_id: string;
  telefone_normalizado: string;
  ultima_mensagem_preview: string | null;
  ultima_direcao: "enviada" | "recebida" | "sistema";
  ultima_mensagem_em: string | null;
}) {
  const supabase = createAdminClient();

  const { data: conversaExistente } = await supabase
    .from("whatsapp_conversas")
    .select("id, lead_id, cliente_esta_na_base, teve_ligacao_3cx, cliente_respondeu")
    .eq("conector_id", params.conector_id)
    .eq("telefone_normalizado", params.telefone_normalizado)
    .maybeSingle();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, nome, telefone_normalizado, status, etapa, atualizado_em")
    .eq("telefone_normalizado", params.telefone_normalizado)
    .maybeSingle();

  const clienteEstaNaBase = Boolean(lead?.id);

  /*
    Por enquanto, teve_ligacao_3cx fica false.
    Quando ligarmos a tabela real de ligações 3CX, essa parte será trocada
    para consultar por telefone_normalizado.
  */
  const teveLigacao3cx = false;
  const falouNoTelefone = false;
  const clienteRespondeu =
    params.ultima_direcao === "recebida" ||
    Boolean(conversaExistente?.cliente_respondeu);

  const whatsappSem3cx = clienteRespondeu && !teveLigacao3cx;

  const statusAuditoria = definirStatusAuditoria({
    clienteEstaNaBase,
    teveLigacao3cx,
    clienteRespondeu,
  });

  const payloadConversa = {
    conector_id: params.conector_id,
    usuario_id: params.usuario_id,
    lead_id: lead?.id || conversaExistente?.lead_id || null,

    telefone_normalizado: params.telefone_normalizado,
    nome_contato: lead?.nome || null,

    cliente_esta_na_base: clienteEstaNaBase,
    teve_ligacao_3cx: teveLigacao3cx,
    falou_no_telefone: falouNoTelefone,
    teve_whatsapp: true,
    cliente_respondeu: clienteRespondeu,
    whatsapp_sem_3cx: whatsappSem3cx,
    conversa_fora_da_base: !clienteEstaNaBase,
    c2s_nao_atualizado: false,

    primeira_mensagem_em: params.ultima_mensagem_em,
    ultima_mensagem_em: params.ultima_mensagem_em,
    ultima_mensagem_preview: params.ultima_mensagem_preview,
    ultima_direcao: params.ultima_direcao,

    status_auditoria: statusAuditoria,
    atualizado_em: new Date().toISOString(),
  };

  if (conversaExistente?.id) {
    const { data: atualizada, error: updateError } = await supabase
      .from("whatsapp_conversas")
      .update({
        ...payloadConversa,
        primeira_mensagem_em: undefined,
      })
      .eq("id", conversaExistente.id)
      .select("id, lead_id, status_auditoria")
      .single();

    if (updateError) {
      throw updateError;
    }

    return {
      id: atualizada.id,
      lead_id: atualizada.lead_id,
      status_auditoria: atualizada.status_auditoria,
      cliente_esta_na_base: clienteEstaNaBase,
      cliente_respondeu: clienteRespondeu,
      whatsapp_sem_3cx: whatsappSem3cx,
    };
  }

  const { data: criada, error: insertError } = await supabase
    .from("whatsapp_conversas")
    .insert(payloadConversa)
    .select("id, lead_id, status_auditoria")
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    id: criada.id,
    lead_id: criada.lead_id,
    status_auditoria: criada.status_auditoria,
    cliente_esta_na_base: clienteEstaNaBase,
    cliente_respondeu: clienteRespondeu,
    whatsapp_sem_3cx: whatsappSem3cx,
  };
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  let body: MensagensBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        erro: "Body inválido. Envie JSON.",
      },
      { status: 400 }
    );
  }

  const token = String(body.token || "").trim();
  const conectorId = String(body.conector_id || "").trim();

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Token do conector é obrigatório.",
      },
      { status: 400 }
    );
  }

  if (!conectorId) {
    return NextResponse.json(
      {
        ok: false,
        erro: "conector_id é obrigatório.",
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.mensagens)) {
    return NextResponse.json(
      {
        ok: false,
        erro: "mensagens precisa ser uma lista.",
      },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(token);

  const { data: tokenRegistro, error: tokenError } = await supabase
    .from("whatsapp_conector_tokens")
    .select("id, usuario_id, ativo, expira_em")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao validar token.",
        detalhe: tokenError.message,
      },
      { status: 500 }
    );
  }

  if (!tokenRegistro || !tokenRegistro.ativo) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Token inválido ou inativo.",
      },
      { status: 401 }
    );
  }

  if (tokenRegistro.expira_em && new Date(tokenRegistro.expira_em) < new Date()) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Token expirado.",
      },
      { status: 401 }
    );
  }

  const { data: conector, error: conectorError } = await supabase
    .from("whatsapp_conectores")
    .select("id, usuario_id, token_id, ativo, bloqueado")
    .eq("id", conectorId)
    .eq("token_id", tokenRegistro.id)
    .maybeSingle();

  if (conectorError) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Erro ao buscar conector.",
        detalhe: conectorError.message,
      },
      { status: 500 }
    );
  }

  if (!conector || !conector.ativo) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Conector não encontrado ou inativo.",
      },
      { status: 404 }
    );
  }

  if (conector.bloqueado) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Conector bloqueado. Sincronização de mensagens não permitida.",
      },
      { status: 403 }
    );
  }

  let totalRecebidas = body.mensagens.length;
  let totalSalvas = 0;
  let totalSemTelefone = 0;
  let totalIgnoradas = 0;
  let totalRecebidasCliente = 0;

  for (const mensagem of body.mensagens) {
    const telefoneNormalizado =
      somenteNumeros(mensagem.telefone_normalizado) ||
      somenteNumeros(mensagem.telefone);

    if (!telefoneNormalizado) {
      totalSemTelefone++;
      continue;
    }

    const direcao = direcaoValida(mensagem.direcao);

    if (!direcao) {
      totalIgnoradas++;
      continue;
    }

    const tipo = tipoValido(mensagem.tipo);
    const enviadaEm = dataOuNull(mensagem.enviada_em) || new Date().toISOString();
    const preview = limparTexto(mensagem.mensagem_preview);

    const conversa = await buscarOuCriarConversa({
      conector_id: conector.id,
      usuario_id: conector.usuario_id,
      telefone_normalizado: telefoneNormalizado,
      ultima_mensagem_preview: preview,
      ultima_direcao: direcao,
      ultima_mensagem_em: enviadaEm,
    });

    const mensagemHash = hashMensagem({
      telefone_normalizado: telefoneNormalizado,
      direcao,
      tipo,
      mensagem_preview: preview,
      enviada_em: enviadaEm,
    });

    const { data: mensagemExistente } = await supabase
      .from("whatsapp_mensagens")
      .select("id")
      .eq("conversa_id", conversa.id)
      .eq("mensagem_hash", mensagemHash)
      .maybeSingle();

    if (mensagemExistente?.id) {
      totalIgnoradas++;
      continue;
    }

    const { error: insertError } = await supabase.from("whatsapp_mensagens").insert({
      conversa_id: conversa.id,
      conector_id: conector.id,
      usuario_id: conector.usuario_id,
      lead_id: conversa.lead_id || null,

      whatsapp_message_id: limparTexto(mensagem.whatsapp_message_id),

      telefone_normalizado: telefoneNormalizado,

      direcao,
      tipo,

      mensagem_preview: preview,
      mensagem_hash: mensagemHash,

      enviada_em: enviadaEm,
    });

    if (insertError) {
      totalIgnoradas++;
      continue;
    }

    if (direcao === "recebida") {
      totalRecebidasCliente++;

      if (conversa.status_auditoria !== "pendente") {
        const tipoAlerta =
          conversa.status_auditoria === "fora_da_base"
            ? "fora_da_base"
            : conversa.status_auditoria === "whatsapp_sem_3cx"
              ? "whatsapp_sem_3cx"
              : "cliente_respondeu";

        const titulo =
          tipoAlerta === "fora_da_base"
            ? "Mensagem recebida fora da base"
            : tipoAlerta === "whatsapp_sem_3cx"
              ? "Cliente respondeu sem ligação 3CX"
              : "Cliente respondeu no WhatsApp";

        const descricao =
          tipoAlerta === "fora_da_base"
            ? "Mensagem recebida de um contato que não foi localizado na base de leads."
            : tipoAlerta === "whatsapp_sem_3cx"
              ? "Cliente respondeu no WhatsApp, mas ainda não há ligação 3CX vinculada."
              : "Cliente respondeu no WhatsApp e precisa ser tratado no CRM.";

        await supabase.from("whatsapp_auditoria_alertas").insert({
          conversa_id: conversa.id,
          lead_id: conversa.lead_id || null,
          usuario_id: conector.usuario_id,
          conector_id: conector.id,
          tipo: tipoAlerta,
          severidade: tipoAlerta === "fora_da_base" ? "media" : "alta",
          titulo,
          descricao,
          telefone_normalizado: telefoneNormalizado,
          status: "aberto",
        });
      }
    }

    const { data: contatoExistente } = await supabase
      .from("whatsapp_contatos")
      .select("id")
      .eq("usuario_id", conector.usuario_id)
      .eq("telefone_normalizado", telefoneNormalizado)
      .maybeSingle();

    if (contatoExistente?.id) {
      await supabase
        .from("whatsapp_contatos")
        .update({
          conector_id: conector.id,
          telefone: limparTexto(mensagem.telefone),
          lead_id: conversa.lead_id || null,
          esta_no_c2s: Boolean(conversa.lead_id),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", contatoExistente.id);
    } else {
      await supabase.from("whatsapp_contatos").insert({
        conector_id: conector.id,
        usuario_id: conector.usuario_id,
        telefone: limparTexto(mensagem.telefone),
        telefone_normalizado: telefoneNormalizado,
        lead_id: conversa.lead_id || null,
        esta_no_c2s: Boolean(conversa.lead_id),
      });
    }

    totalSalvas++;
  }

  await supabase
    .from("whatsapp_conectores")
    .update({
      ultima_sincronizacao_em: new Date().toISOString(),
      ultimo_heartbeat_em: new Date().toISOString(),
      status: "online",
    })
    .eq("id", conector.id);

  return NextResponse.json({
    ok: true,
    total_recebidas: totalRecebidas,
    total_salvas: totalSalvas,
    total_ignoradas: totalIgnoradas,
    total_sem_telefone: totalSemTelefone,
    total_recebidas_cliente: totalRecebidasCliente,
  });
}
