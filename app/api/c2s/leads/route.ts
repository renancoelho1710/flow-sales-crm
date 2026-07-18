import { NextResponse } from "next/server";

type C2SLead = {
  id?: string;
  internal_id?: number;
  attributes?: {
    description?: string | null;
    observation?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    cellphone?: string | null;
    created_at?: string | null;
    product?: {
      id?: string | null;
      description?: string | null;
      price?: string | null;
      price_float?: number | null;
      model?: string | null;
      brand?: string | null;
    } | null;
    customer?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      cellphone?: string | null;
    } | null;
    source?: {
      name?: string | null;
    } | null;
  };
};

function somenteNumeros(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

function limparTexto(valor?: string | null) {
  const texto = String(valor || "").trim();
  return texto.length > 0 ? texto : null;
}

function normalizarLeadC2S(item: C2SLead) {
  const attributes = item.attributes || {};
  const customer = attributes.customer || {};
  const product = attributes.product || {};

  const nome =
    limparTexto(customer.name) ||
    limparTexto(attributes.name) ||
    "Cliente sem nome";

  const telefone =
    limparTexto(customer.cellphone) ||
    limparTexto(customer.phone) ||
    limparTexto(attributes.cellphone) ||
    limparTexto(attributes.phone);

  return {
    c2s_id: item.id || null,
    c2s_internal_id: item.internal_id || null,

    nome,
    telefone,
    telefone_normalizado: somenteNumeros(telefone),

    email: limparTexto(customer.email) || limparTexto(attributes.email),
    origem: limparTexto(attributes.source?.name) || "C2S",
    observacao: limparTexto(attributes.observation),

    veiculo_interesse:
      limparTexto(product.description) ||
      limparTexto(attributes.description) ||
      null,

    produto: {
      id: product.id || null,
      descricao: product.description || null,
      marca: product.brand || null,
      modelo: product.model || null,
      preco: product.price || null,
      preco_float: product.price_float || null,
    },

    criado_em_c2s: attributes.created_at || null,
  };
}

export async function GET() {
  const baseUrl = process.env.C2S_API_BASE_URL;
  const token = process.env.C2S_API_TOKEN;

  if (!baseUrl || !token) {
    return NextResponse.json(
      {
        ok: false,
        erro: "C2S_API_BASE_URL ou C2S_API_TOKEN não configurado.",
      },
      { status: 500 }
    );
  }

  try {
    const resposta = await fetch(`${baseUrl}/integration/leads`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "x-api-key": token,
        token,
      },
      cache: "no-store",
    });

    const texto = await resposta.text();

    if (!resposta.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: resposta.status,
          erro: "C2S recusou a requisição.",
          resposta: texto.slice(0, 500),
        },
        { status: resposta.status }
      );
    }

    const json = JSON.parse(texto);
    const leads = Array.isArray(json?.data)
      ? json.data.map(normalizarLeadC2S)
      : [];

    return NextResponse.json({
      ok: true,
      total: leads.length,
      leads,
    });
  } catch (erro) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          erro instanceof Error
            ? erro.message
            : "Erro desconhecido ao consultar C2S.",
      },
      { status: 500 }
    );
  }
}
