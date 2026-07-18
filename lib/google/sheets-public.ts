function obrigatorio(nome: string) {
  const valor = process.env[nome];

  if (!valor) {
    throw new Error(`Variável de ambiente ausente: ${nome}`);
  }

  return valor;
}

function parseCsv(texto: string) {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const char = texto[i];
    const proximo = texto[i + 1];

    if (char === '"' && dentroAspas && proximo === '"') {
      campo += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      dentroAspas = !dentroAspas;
      continue;
    }

    if (char === "," && !dentroAspas) {
      linha.push(campo);
      campo = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !dentroAspas) {
      if (char === "\r" && proximo === "\n") i += 1;

      linha.push(campo);
      campo = "";

      if (linha.some((item) => item.trim() !== "")) linhas.push(linha);

      linha = [];
      continue;
    }

    campo += char;
  }

  linha.push(campo);

  if (linha.some((item) => item.trim() !== "")) linhas.push(linha);

  return linhas;
}

export async function lerGoogleSheetPublicoPorGid(gid: string) {
  const spreadsheetId = obrigatorio("GOOGLE_SHEETS_SPREADSHEET_ID");

  if (!gid) return [];

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

  const resposta = await fetch(url, { cache: "no-store" });

  if (!resposta.ok) {
    throw new Error(
      `Não consegui ler a planilha. Verifique se está compartilhada como leitor. Status: ${resposta.status}`,
    );
  }

  const texto = await resposta.text();

  if (texto.toLowerCase().includes("<html")) {
    throw new Error(
      "A planilha não está pública para leitura. Compartilhe como: Qualquer pessoa com o link > Leitor.",
    );
  }

  return parseCsv(texto);
}

export async function lerGoogleSheetPublicoPorAba(nomeAba: string) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID não configurado.");
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nomeAba)}`;

  const resposta = await fetch(url, {
    cache: "no-store",
  });

  if (!resposta.ok) {
    throw new Error(
      `Não foi possível ler a aba ${nomeAba}. Verifique se a planilha está pública.`,
    );
  }

  const csv = await resposta.text();

  return parseCsv(csv);
}
