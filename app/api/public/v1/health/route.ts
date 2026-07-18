import { NextRequest, NextResponse } from "next/server";
import {
  registrarApiLog,
  temPermissao,
  validarTokenApi,
} from "@/lib/api-publica/auth";

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

  if (!temPermissao(validacao.token, "health:ler")) {
    await registrarApiLog({
      request,
      token: validacao.token,
      status: 403,
      sucesso: false,
      duracao_ms: Date.now() - inicio,
      erro: "Sem permissão health:ler.",
    });

    return NextResponse.json(
      { ok: false, erro: "Sem permissão para consultar health." },
      { status: 403 },
    );
  }

  const resposta = {
    ok: true,
    sistema: "Flow Sales CRM",
    status: "online",
    versao: "v1",
    horario: new Date().toISOString(),
  };

  await registrarApiLog({
    request,
    token: validacao.token,
    status: 200,
    sucesso: true,
    duracao_ms: Date.now() - inicio,
    metadata: resposta,
  });

  return NextResponse.json(resposta);
}
