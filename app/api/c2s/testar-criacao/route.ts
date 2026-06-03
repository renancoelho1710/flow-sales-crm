import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.C2S_API_BASE_URL;
  const token = process.env.C2S_API_TOKEN;

  if (!baseUrl || !token) {
    return NextResponse.json(
      {
        ok: false,
        erro: "C2S_API_BASE_URL ou C2S_API_TOKEN não configurado no .env.local",
      },
      { status: 500 }
    );
  }

  const tentativas = [
    {
      metodo: "OPTIONS",
      caminho: "/integration/leads",
      body: null,
    },
    {
      metodo: "POST",
      caminho: "/integration/leads",
      body: {
        teste_flow_sales: true,
      },
    },
    {
      metodo: "POST",
      caminho: "/leads",
      body: {
        teste_flow_sales: true,
      },
    },
  ];

  const resultados = [];

  for (const tentativa of tentativas) {
    const url = `${baseUrl}${tentativa.caminho}`;

    try {
      const resposta = await fetch(url, {
        method: tentativa.metodo,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": token,
          token,
        },
        body: tentativa.body ? JSON.stringify(tentativa.body) : undefined,
        cache: "no-store",
      });

      const texto = await resposta.text();

      resultados.push({
        metodo: tentativa.metodo,
        caminho: tentativa.caminho,
        url,
        status: resposta.status,
        ok: resposta.ok,
        resposta: texto.slice(0, 1000),
      });
    } catch (erro) {
      resultados.push({
        metodo: tentativa.metodo,
        caminho: tentativa.caminho,
        url,
        ok: false,
        erro: erro instanceof Error ? erro.message : "Erro desconhecido",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    aviso:
      "Teste técnico. O payload enviado é inválido/controlado para descobrir se o endpoint aceita criação sem criar lead real.",
    resultados,
  });
}
