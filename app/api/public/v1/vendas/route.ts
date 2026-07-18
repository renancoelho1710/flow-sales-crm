import { NextRequest, NextResponse } from "next/server";
import { registrarApiLog, temPermissao, validarTokenApi } from "@/lib/api-publica/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function limparPlaca(valor: string | null) {
  return String(valor || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function pegarCampo(linha: Record<string, any>, campos: string[]) {
  for (const campo of campos) {
    if (
      linha[campo] !== undefined &&
      linha[campo] !== null &&
      linha[campo] !== ""
    ) {
      return linha[campo];
    }
  }

  return null;
}

function normalizarVenda(linha: Record<string, any>) {
  return {
    id: pegarCampo(linha, ["id"]),
    placa: pegarCampo(linha, ["placa", "veiculo_placa"]),
    vendedor: pegarCampo(linha, [
      "vendedor",
      "vendedor_nome",
      "nome_vendedor",
      "vendedor_origem",
      "captador_nome",
    ]),
    loja: pegarCampo(linha, ["loja", "loja_vendedor", "loja_nome"]),
    cliente: pegarCampo(linha, [
      "cliente",
      "cliente_nome",
      "nome_cliente",
      "comprador",
    ]),
    veiculo: pegarCampo(linha, ["veiculo", "modelo", "veiculo_nome"]),
    data_venda: pegarCampo(linha, [
      "data_venda",
      "data",
      "data_proposta",
      "vendido_em",
    ]),
    data_envio: pegarCampo(linha, ["data_envio", "enviado_em"]),
    instituicao_financeira: pegarCampo(linha, [
      "instituicao_financeira",
      "instituicao",
      "financeira",
      "banco",
    ]),
    parcela: pegarCampo(linha, ["parcela", "parcelas"]),
    valor_parcela: pegarCampo(linha, ["valor_parcela", "valor_da_parcela"]),
    taxa: pegarCampo(linha, ["taxa", "taxa_financiamento"]),
    total_venda: pegarCampo(linha, ["total_venda", "valor_total", "valor"]),
    operador_nome: pegarCampo(linha, ["operador_nome"]),
    operador_email: pegarCampo(linha, ["operador_email"]),
    validacao_status: pegarCampo(linha, ["validacao_status"]),
    elegivel_comissao: pegarCampo(linha, ["elegivel_comissao"]),
    agendamento_id: pegarCampo(linha, ["agendamento_id"]),
    lead_id: pegarCampo(linha, ["lead_id"]),
    atualizado_em: pegarCampo(linha, ["atualizado_em", "ultima_sincronizacao"]),
  };
}

export async function GET(request: NextRequest) {
  const inicio = Date.now();
  const validacao = await validarTokenApi(request);

  if (!validacao.ok) {
    await registrarApiLog({
      request,
      token: null,
      status: validacao.status,
      sucesso: false,
      duracao_ms: Date.now() - inicio,
      erro: validacao.erro,
    });

    return NextResponse.json(
      { ok: false, erro: validacao.erro },
      { status: validacao.status },
    );
  }

  if (!temPermissao(validacao.token, "vendas:ler")) {
    await registrarApiLog({
      request,
      token: validacao.token,
      status: 403,
      sucesso: false,
      duracao_ms: Date.now() - inicio,
      erro: "Sem permissão vendas:ler.",
    });

    return NextResponse.json(
      { ok: false, erro: "Sem permissão para consultar vendas." },
      { status: 403 },
    );
  }

  try {
    const supabase = createAdminClient();
    const placa = limparPlaca(request.nextUrl.searchParams.get("placa"));

    if (!placa) {
      await registrarApiLog({
        request,
        token: validacao.token,
        status: 400,
        sucesso: false,
        duracao_ms: Date.now() - inicio,
        erro: "Informe a placa.",
      });

      return NextResponse.json(
        { ok: false, erro: "Informe a placa." },
        { status: 400 },
      );
    }

    const prefixo = placa.slice(0, 3);

    const { data: candidatas, error } = await supabase
      .from("vendas_acompanhamento")
      .select("*")
      .ilike("placa", `${prefixo}%`)
      .limit(500);

    if (error) throw new Error(error.message);

    const encontradas = (candidatas || []).filter((linha) => {
      return limparPlaca(String(linha.placa || "")) === placa;
    });

    const vendas = encontradas.map((linha) =>
      normalizarVenda(linha as Record<string, any>),
    );

    const resposta = {
      ok: true,
      placa,
      total: vendas.length,
      vendas,
    };

    await registrarApiLog({
      request,
      token: validacao.token,
      status: 200,
      sucesso: true,
      duracao_ms: Date.now() - inicio,
      metadata: {
        placa,
        total: vendas.length,
      },
    });

    return NextResponse.json(resposta);
  } catch (error) {
    await registrarApiLog({
      request,
      token: validacao.token,
      status: 500,
      sucesso: false,
      duracao_ms: Date.now() - inicio,
      erro: error instanceof Error ? error.message : "Erro interno.",
    });

    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error ? error.message : "Erro ao consultar venda.",
      },
      { status: 500 },
    );
  }
}
