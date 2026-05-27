import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ConversaRecebida = {
  telefone?: string | null;
  telefone_normalizado?: string | null;
  nome_contato?: string | null;
  ultima_mensagem_preview?: string | null;
  ultima_mensagem_em?: string | null;
  ultima_direcao?: "enviada" | "recebida" | "sistema" | null;
  cliente_respondeu?: boolean | null;
};

type ConversasBody = {
  token?: string;
  conector_id?: string;
  conversas?: ConversaRecebida[];
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

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  let body: ConversasBody;

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

  if (!Array.isArray(body.conversas)) {
    return NextResponse.json(
      {
        ok: false,
        erro: "conversas precisa ser uma lista.",
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
        erro: "Conector bloqueado. Sincronização de conversas não permitida.",
      },
      { status: 403 }
    );
  }

  let totalRecebidas = body.conversas.length;
  let totalSalvas = 0;
  let totalSemTelefone = 0;
  let totalNaBase = 0;
  let totalForaDaBase = 0;
  let totalClienteRespondeu = 0;
  let totalWhatsappSem3cx = 0;

  for (const conversa of body.conversas) {
    const telefoneNormalizado =
      somenteNumeros(conversa.telefone_normalizado) ||
      somenteNumeros(conversa.telefone);

    if (!telefoneNormalizado) {
      totalSemTelefone++;
      continue;
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("id, nome, telefone_normalizado, status, etapa, atualizado_em")
      .eq("telefone_normalizado", telefoneNormalizado)
      .maybeSingle();

    const clienteEstaNaBase = Boolean(lead?.id);

    if (clienteEstaNaBase) {
      totalNaBase++;
    } else {
      totalForaDaBase++;
    }

    const clienteRespondeu =
      conversa.cliente_respondeu === true || conversa.ultima_direcao === "recebida";

    if (clienteRespondeu) {
      totalClienteRespondeu++;
    }

    /*
      Por enquanto, teve_ligacao_3cx fica false.
      Quando ligarmos a tabela real de ligações 3CX, essa parte será trocada
      para consultar por telefone_normalizado.
    */
    const teveLigacao3cx = false;
    const falouNoTelefone = false;

    const whatsappSem3cx = clienteRespondeu && !teveLigacao3cx;

    if (whatsappSem3cx) {
      totalWhatsappSem3cx++;
    }

    const statusAuditoria = definirStatusAuditoria({
      clienteEstaNaBase,
      teveLigacao3cx,
      clienteRespondeu,
    });

    const primeiraMensagemEm = dataOuNull(conversa.ultima_mensagem_em);
    const ultimaMensagemEm = dataOuNull(conversa.ultima_mensagem_em);

    const payloadConversa = {
      conector_id: conector.id,
      usuario_id: conector.usuario_id,
      lead_id: lead?.id || null,

      telefone_normalizado: telefoneNormalizado,
      nome_contato: limparTexto(conversa.nome_contato) || lead?.nome || null,

      cliente_esta_na_base: clienteEstaNaBase,
      teve_ligacao_3cx: teveLigacao3cx,
      falou_no_telefone: falouNoTelefone,
      teve_whatsapp: true,
      cliente_respondeu: clienteRespondeu,
      whatsapp_sem_3cx: whatsappSem3cx,
      conversa_fora_da_base: !clienteEstaNaBase,
      c2s_nao_atualizado: false,

      primeira_mensagem_em: primeiraMensagemEm,
      ultima_mensagem_em: ultimaMensagemEm,

      ultima_mensagem_preview: limparTexto(conversa.ultima_mensagem_preview),
      ultima_direcao: direcaoValida(conversa.ultima_direcao),

      status_auditoria: statusAuditoria,
      atualizado_em: new Date().toISOString(),
    };

    const { data: conversaExistente } = await supabase
      .from("whatsapp_conversas")
      .select("id")
      .eq("conector_id", conector.id)
      .eq("telefone_normalizado", telefoneNormalizado)
      .maybeSingle();

    let conversaId: string | null = null;

    if (conversaExistente?.id) {
      const { data: atualizada, error: updateError } = await supabase
        .from("whatsapp_conversas")
        .update(payloadConversa)
        .eq("id", conversaExistente.id)
        .select("id")
        .single();

      if (updateError) {
        continue;
      }

      conversaId = atualizada.id;
    } else {
      const { data: criada, error: insertError } = await supabase
        .from("whatsapp_conversas")
        .insert(payloadConversa)
        .select("id")
        .single();

      if (insertError) {
        continue;
      }

      conversaId = criada.id;
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
          nome: limparTexto(conversa.nome_contato) || lead?.nome || null,
          telefone: limparTexto(conversa.telefone),
          esta_no_c2s: clienteEstaNaBase,
          lead_id: lead?.id || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", contatoExistente.id);
    } else {
      await supabase.from("whatsapp_contatos").insert({
        conector_id: conector.id,
        usuario_id: conector.usuario_id,
        nome: limparTexto(conversa.nome_contato) || lead?.nome || null,
        telefone: limparTexto(conversa.telefone),
        telefone_normalizado: telefoneNormalizado,
        esta_no_c2s: clienteEstaNaBase,
        lead_id: lead?.id || null,
      });
    }

    if (statusAuditoria !== "pendente" && conversaId) {
      const titulo =
        statusAuditoria === "fora_da_base"
          ? "Conversa WhatsApp fora da base"
          : statusAuditoria === "whatsapp_sem_3cx"
            ? "WhatsApp com resposta sem ligação 3CX"
            : "Cliente respondeu no WhatsApp";

      const descricao =
        statusAuditoria === "fora_da_base"
          ? "Contato encontrado no WhatsApp, mas não localizado na base de leads."
          : statusAuditoria === "whatsapp_sem_3cx"
            ? "Cliente respondeu no WhatsApp, mas ainda não há ligação 3CX vinculada."
            : "Cliente respondeu no WhatsApp e precisa ser tratado no CRM.";

      await supabase.from("whatsapp_auditoria_alertas").insert({
        conversa_id: conversaId,
        lead_id: lead?.id || null,
        usuario_id: conector.usuario_id,
        conector_id: conector.id,
        tipo:
          statusAuditoria === "fora_da_base"
            ? "fora_da_base"
            : statusAuditoria === "whatsapp_sem_3cx"
              ? "whatsapp_sem_3cx"
              : "cliente_respondeu",
        severidade: statusAuditoria === "fora_da_base" ? "media" : "alta",
        titulo,
        descricao,
        telefone_normalizado: telefoneNormalizado,
        status: "aberto",
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
    total_sem_telefone: totalSemTelefone,
    total_na_base: totalNaBase,
    total_fora_da_base: totalForaDaBase,
    total_cliente_respondeu: totalClienteRespondeu,
    total_whatsapp_sem_3cx: totalWhatsappSem3cx,
  });
}
