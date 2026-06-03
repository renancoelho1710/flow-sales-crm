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

  const url = `${baseUrl}/integration/leads`;

  const payloads = [
    {
      nome: "data_simples",
      body: {
        data: {
          name: "TESTE FLOW SALES NAO CADASTRAR",
          phone: "11999990000",
          email: "teste@flowsales.local",
          description: "Teste tecnico de integracao Flow Sales CRM",
          observation: "Teste tecnico. Se criado por engano, ignorar.",
          source: "Flow Sales CRM",
        },
      },
    },
    {
      nome: "data_attributes",
      body: {
        data: {
          type: "lead",
          attributes: {
            name: "TESTE FLOW SALES NAO CADASTRAR",
            phone: "11999990000",
            email: "teste@flowsales.local",
            description: "Teste tecnico de integracao Flow Sales CRM",
            observation: "Teste tecnico. Se criado por engano, ignorar.",
            source: "Flow Sales CRM",
          },
        },
      },
    },
    {
      nome: "data_customer",
      body: {
        data: {
          customer: {
            name: "TESTE FLOW SALES NAO CADASTRAR",
            phone: "11999990000",
            cellphone: "11999990000",
            email: "teste@flowsales.local",
          },
          description: "Teste tecnico de integracao Flow Sales CRM",
          observation: "Teste tecnico. Se criado por engano, ignorar.",
          source: "Flow Sales CRM",
        },
      },
    },
  ];

  const resultados = [];

  for (const payload of payloads) {
    try {
      const resposta = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": token,
          token,
        },
        body: JSON.stringify(payload.body),
        cache: "no-store",
      });

      const texto = await resposta.text();

      resultados.push({
        teste: payload.nome,
        status: resposta.status,
        ok: resposta.ok,
        resposta: texto.slice(0, 1500),
      });
    } catch (erro) {
      resultados.push({
        teste: payload.nome,
        ok: false,
        erro: erro instanceof Error ? erro.message : "Erro desconhecido",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    aviso:
      "Teste tecnico de formato. Pode criar lead de teste se o C2S aceitar algum payload. Use apenas uma vez e confira no C2S.",
    endpoint: url,
    resultados,
  });
}
