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
    "/integration",
    "/integrations",
    "/leads",
    "/api/leads",
    "/v1/leads",
    "/integration/leads",
  ];

  const resultados = [];

  for (const caminho of tentativas) {
    const url = `${baseUrl}${caminho}`;

    try {
      const resposta = await fetch(url, {
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

      resultados.push({
        caminho,
        url,
        status: resposta.status,
        ok: resposta.ok,
        resposta: texto.slice(0, 500),
      });
    } catch (erro) {
      resultados.push({
        caminho,
        url,
        ok: false,
        erro: erro instanceof Error ? erro.message : "Erro desconhecido",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    resultados,
  });
}
