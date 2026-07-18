import { NextRequest, NextResponse } from "next/server";

type DadosImportados = {
  nome: string;
  titulo_publico: string;
  imagem_url: string;
  resumo_operador: string;
  regras_principais: string;
  script_ligacao: string;
  mensagem_whatsapp: string;
  objecoes: string;
  tem_simulador: boolean;
  simulador_tipo: "nenhum" | "copa_azul" | "link_externo";
  link_simulador: string;
  simulador_observacao: string;
};

function limparTexto(valor: unknown) {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function decodificarHtml(texto: string) {
  return limparTexto(texto)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function atributo(tag: string, nome: string) {
  const regex = new RegExp(`${nome}\\s*=\\s*["']([^"']+)["']`, "i");
  return decodificarHtml(tag.match(regex)?.[1] || "");
}

function meta(html: string, chave: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const name = atributo(tag, "name").toLowerCase();
    const property = atributo(tag, "property").toLowerCase();

    if (name === chave.toLowerCase() || property === chave.toLowerCase()) {
      return atributo(tag, "content");
    }
  }

  return "";
}

function tituloPagina(html: string) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";

  return decodificarHtml(
    h1.replace(/<[^>]+>/g, " ").trim() || meta(html, "og:title") || title,
  );
}

function textoDaPagina(html: string) {
  return decodificarHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<(br|p|div|section|li|h1|h2|h3|h4)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\n\s*\n/g, "\n"),
  );
}

function linhasRelevantes(texto: string) {
  return texto
    .split("\n")
    .map((linha) => limparTexto(linha))
    .filter((linha) => linha.length >= 12)
    .filter((linha, index, lista) => lista.indexOf(linha) === index);
}

function contem(base: string, termos: string[]) {
  const b = base.toLowerCase();
  return termos.some((termo) => b.includes(termo.toLowerCase()));
}

function regraSe(condicao: boolean, texto: string) {
  return condicao ? texto : "";
}

function montarNome(titulo: string, url: string) {
  const limpo = titulo
    .replace(/\|.*$/g, "")
    .replace(/- Azul Veículos.*$/gi, "")
    .replace(/Azul Veículos/gi, "")
    .replace(/Chegou!?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (limpo) return limpo;

  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop() || "campanha";
    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letra) => letra.toUpperCase());
  } catch {
    return "Nova campanha";
  }
}

function montarResumo(descricao: string, linhas: string[]) {
  const base = descricao || linhas.slice(0, 3).join(" ");

  if (!base) {
    return "Campanha importada a partir do link oficial. Revise as informações antes de liberar para a operação.";
  }

  return base.length > 650 ? `${base.slice(0, 650).trim()}...` : base;
}

function montarRegras(textoCompleto: string, linhas: string[]) {
  const regras: string[] = [];

  if (contem(textoCompleto, ["12 parcelas", "12x", "doze parcelas"])) {
    regras.push(
      "12 parcelas iniciais por nossa conta, conforme regra da campanha.",
    );
  }

  if (contem(textoCompleto, ["r$ 99", "r$99", "99 reais"])) {
    regras.push("Parcelas iniciais promocionais de R$ 99, conforme aprovação.");
  }

  if (contem(textoCompleto, ["30%", "entrada mínima", "entrada minima"])) {
    regras.push("Entrada mínima obrigatória de 30% do valor do veículo.");
  }

  if (contem(textoCompleto, ["carbank"])) {
    regras.push("Operação exclusiva pelo banco CarBank no Plano Sob Medida.");
  }

  if (contem(textoCompleto, ["crédito", "credito", "aprovação", "aprovacao"])) {
    regras.push("Condição sujeita à análise e aprovação de crédito.");
  }

  if (contem(textoCompleto, ["fipe", "tabela fipe", "100% fipe"])) {
    regras.push(
      "Usado pode ser avaliado em até 100% da FIPE, conforme análise técnica e comercial.",
    );
  }

  if (contem(textoCompleto, ["chute premiado"])) {
    regras.push("Chute Premiado possui regulamento próprio na página oficial.");
  }

  regras.push("Para regras completas, consulte a página oficial da campanha.");

  return regras
    .filter((linha, index, lista) => linha && lista.indexOf(linha) === index)
    .slice(0, 7)
    .join("\n");
}

function montarScript(nome: string, resumo: string) {
  return `Olá, tudo bem? Aqui é da Azul Veículos.

Estou entrando em contato porque temos uma campanha ativa: ${nome}.

A ideia é te apresentar uma condição especial que pode facilitar sua troca ou compra do veículo.

Resumo da campanha:
${resumo}

Posso te fazer algumas perguntas rápidas para entender qual veículo você procura e verificar se essa condição faz sentido para você?`;
}

function montarWhatsApp(nome: string, resumo: string, url: string) {
  return `Olá! Tudo bem?

Temos uma campanha ativa na Azul Veículos: ${nome}.

${resumo}

Você pode conferir mais detalhes aqui:
${url}

Se quiser, me chama por aqui que eu te ajudo a encontrar uma opção dentro dessa condição.`;
}

function montarObjecoes(textoCompleto: string) {
  const objecoes = [
    `"Vou pensar"
Resposta: Sem problema. Só para eu te orientar melhor: o que mais pesa na sua decisão hoje, valor de entrada, parcela ou avaliação do seu usado?`,

    `"Está caro"
Resposta: Entendo. Vamos comparar pela condição completa, não só pelo valor. Posso verificar entrada, parcela e possibilidade de troca para ficar dentro do que você procura.`,

    `"Tenho usado na troca"
Resposta: Ótimo. Podemos avaliar seu veículo e conferir se a campanha permite alguma condição especial usando ele na negociação.`,

    `"Não quero financiar"
Resposta: Tudo bem. A campanha pode ter regras específicas para financiamento, mas eu posso verificar também outras possibilidades para o seu caso.`,
  ];

  if (contem(textoCompleto, ["crédito", "credito", "banco", "financiamento"])) {
    objecoes.push(
      `"Tenho medo de não aprovar"
Resposta: A análise depende do banco, mas podemos simular com seus dados e ver o melhor caminho antes de qualquer decisão.`,
    );
  }

  return objecoes.join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = limparTexto(body?.url);

    if (!url) {
      return NextResponse.json(
        { ok: false, erro: "Informe o link da campanha." },
        { status: 400 },
      );
    }

    let urlValidada: URL;

    try {
      urlValidada = new URL(url);
    } catch {
      return NextResponse.json(
        { ok: false, erro: "Link inválido." },
        { status: 400 },
      );
    }

    const resposta = await fetch(urlValidada.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 AzulVeiculosCampanhas/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!resposta.ok) {
      return NextResponse.json(
        { ok: false, erro: "Não consegui acessar o link informado." },
        { status: 400 },
      );
    }

    const html = await resposta.text();
    const textoCompleto = textoDaPagina(html);
    const linhas = linhasRelevantes(textoCompleto);

    const titulo =
      meta(html, "og:title") ||
      meta(html, "twitter:title") ||
      tituloPagina(html);

    const descricao =
      meta(html, "description") ||
      meta(html, "og:description") ||
      meta(html, "twitter:description");

    const imagem = meta(html, "og:image") || meta(html, "twitter:image") || "";

    const nome = montarNome(titulo, urlValidada.toString());
    const resumo = montarResumo(descricao, linhas);

    const temSimulador = contem(textoCompleto, [
      "simulador",
      "simulação",
      "simulacao",
      "valor financiado",
      "entrada mínima",
      "entrada minima",
      "parcelas",
      "calcule",
    ]);

    const ehCopaAzul = contem(`${titulo} ${textoCompleto}`, [
      "copa azul",
      "plano sob medida",
      "12 parcelas",
      "r$ 99",
      "r$99",
      "carbank",
    ]);

    const simuladorTipo: DadosImportados["simulador_tipo"] = temSimulador
      ? ehCopaAzul
        ? "copa_azul"
        : "link_externo"
      : "nenhum";

    const dados: DadosImportados = {
      nome,
      titulo_publico: titulo || nome,
      imagem_url: imagem,
      resumo_operador: resumo,
      regras_principais: montarRegras(textoCompleto, linhas),
      script_ligacao: montarScript(nome, resumo),
      mensagem_whatsapp: montarWhatsApp(nome, resumo, urlValidada.toString()),
      objecoes: montarObjecoes(textoCompleto),
      tem_simulador: temSimulador,
      simulador_tipo: simuladorTipo,
      link_simulador: temSimulador ? urlValidada.toString() : "",
      simulador_observacao:
        simuladorTipo === "copa_azul"
          ? "Simulador interno Copa Azul detectado automaticamente."
          : simuladorTipo === "link_externo"
            ? "Simulador identificado na página. Usar link externo da campanha."
            : "",
    };

    return NextResponse.json({ ok: true, dados });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao importar informações da campanha.",
      },
      { status: 500 },
    );
  }
}
