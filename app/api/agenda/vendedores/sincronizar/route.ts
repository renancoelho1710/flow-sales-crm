import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_COLABORADORES_ID || "1sUwIDhTmpA7zXkWWA2pnJjwsghbhy1V37h-Udk7tSi8";
const GID_DADOSCOLABS = process.env.GOOGLE_SHEETS_DADOSCOLABS_GID || "1595733337";
const GID_CORPCLRVENDEDORES = process.env.GOOGLE_SHEETS_CORPCLRVENDEDORES_GID || "690381588";

type Linha = Record<string, string>;

type VendedorImportado = {
  nome: string;
  nome_correio: string | null;
  nome_c2s: string | null;
  loja: string | null;
  cargo: string | null;
  status_planilha: string | null;
  telefone_particular_1: string | null;
  telefone_particular_2: string | null;
  telefone_corporativo: string | null;
  origem: "google_sheets";
  ativo: boolean;
  recebe_agendamento: boolean;
  situacao_operacional: string;
  google_sheet_hash: string;
  google_sheet_atualizado_em: string;
};

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "gerente", "supervisor", "suporte"].includes(String(perfil || "").trim().toLowerCase());
}

function limpar(valor: unknown) {
  const texto = String(valor || "").trim();
  return texto || null;
}

function normalizarNome(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function limparTelefone(valor: unknown) {
  const digits = String(valor || "").replace(/\D/g, "");
  return digits || null;
}

function csvUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

function parseCsv(texto: string) {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const next = texto[i + 1];

    if (char === '"') {
      if (aspas && next === '"') {
        campo += '"';
        i++;
      } else {
        aspas = !aspas;
      }
      continue;
    }

    if (char === "," && !aspas) {
      linha.push(campo);
      campo = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !aspas) {
      if (char === "\r" && next === "\n") i++;
      linha.push(campo);
      if (linha.some((v) => v.trim())) linhas.push(linha);
      linha = [];
      campo = "";
      continue;
    }

    campo += char;
  }

  linha.push(campo);
  if (linha.some((v) => v.trim())) linhas.push(linha);

  if (!linhas.length) return [];
  const cabecalho = linhas[0].map((v) => v.trim());
  return linhas.slice(1).map((valores) => {
    const obj: Linha = {};
    cabecalho.forEach((nome, index) => {
      obj[nome || `coluna_${index}`] = String(valores[index] || "").trim();
    });
    return obj;
  });
}

async function buscarAba(gid: string) {
  const resposta = await fetch(csvUrl(gid), { cache: "no-store" });
  const texto = await resposta.text();

  if (!resposta.ok || texto.toLowerCase().includes("html") && texto.toLowerCase().includes("google")) {
    throw new Error("Não foi possível ler a planilha. Verifique se ela está compartilhada para leitura ou configure acesso via Google API.");
  }

  return parseCsv(texto);
}

function getColuna(linha: Linha, nomes: string[]) {
  for (const nome of nomes) {
    if (linha[nome] !== undefined) return linha[nome];
  }
  return "";
}

function chaveVendedor(nome: string | null, loja: string | null) {
  return `${normalizarNome(nome)}|${String(loja || "").trim().toUpperCase()}`;
}

function hashVendedor(v: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(v)).toString("base64").slice(0, 180);
}

async function getContexto() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, usuario: null, erro: NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 }) };

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuario) return { supabase, usuario: null, erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado." }, { status: 403 }) };
  if (!perfilGestao(usuario.perfil)) return { supabase, usuario, erro: NextResponse.json({ ok: false, erro: "Apenas gestão pode sincronizar vendedores." }, { status: 403 }) };
  return { supabase, usuario, erro: null };
}

export async function POST() {
  const { supabase, usuario, erro } = await getContexto();
  if (erro || !usuario) return erro;

  let logId: string | null = null;

  try {
    const { data: log } = await supabase
      .from("vendedores_sincronizacao_logs")
      .insert({ origem: "google_sheets", status: "iniciado", mensagem: "Sincronização iniciada.", executado_por: usuario.id })
      .select("id")
      .single();
    logId = log?.id || null;

    const [dadoscolabs, corp] = await Promise.all([
      buscarAba(GID_DADOSCOLABS),
      buscarAba(GID_CORPCLRVENDEDORES),
    ]);

    const corporativos = new Map<string, string>();
    for (const linha of corp) {
      const loja = limpar(getColuna(linha, ["LOJA", "Loja", "loja", "A"]));
      const nome = limpar(getColuna(linha, ["NOME", "Nome", "nome", "B"]));
      const telefone = limparTelefone(getColuna(linha, ["TELEFONE", "Telefone", "telefone", "G"]));
      if (nome && telefone) corporativos.set(chaveVendedor(nome, loja), telefone);
    }

    const importados: VendedorImportado[] = [];
    const ignorados: Array<{ nome: string | null; motivo: string }> = [];

    for (const linha of dadoscolabs) {
      const nomeCorreio = limpar(getColuna(linha, ["NOME CORREIO", "Nome Correio", "nome correio"]));
      const nomeC2S = limpar(getColuna(linha, ["NOME C2S", "Nome C2S", "nome c2s"]));
      const loja = limpar(getColuna(linha, ["LOJA", "Loja", "loja"]));
      const status = limpar(getColuna(linha, ["STATUS", "Status", "status"]));
      const ddd1 = limparTelefone(getColuna(linha, ["DDD", "DDD 1", "F"]));
      const tel1 = limparTelefone(getColuna(linha, ["TELEFONE", "Telefone", "telefone", "G"]));
      const ddd2 = limparTelefone(getColuna(linha, ["DDD_2", "DDD 2", "H"]));
      const tel2 = limparTelefone(getColuna(linha, ["TELEFONE_2", "TELEFONE 2", "Telefone 2", "I"]));
      const acesso = limpar(getColuna(linha, ["ACESSO CORR", "Acesso Corr", "ACESSO", "J"]));
      const cargo = limpar(getColuna(linha, ["FUNÇÃO", "FUNCAO", "Função", "Cargo", "K"]));
      const nome = nomeC2S || nomeCorreio;

      if (!nome) {
        ignorados.push({ nome: null, motivo: "Sem nome." });
        continue;
      }

      if (String(status || "").trim().toLowerCase() !== "ativo") {
        ignorados.push({ nome, motivo: "Status diferente de Ativo." });
        continue;
      }

      if (String(loja || "").trim().toUpperCase() === "W") {
        ignorados.push({ nome, motivo: "Time Web não entra na agenda por vendedor." });
        continue;
      }

      const cargoNormalizado = normalizarNome(cargo || acesso);
      if (!cargoNormalizado.includes("VENDEDOR")) {
        ignorados.push({ nome, motivo: "Não é vendedor." });
        continue;
      }

      const telefone1 = tel1 ? `${ddd1 || ""}${tel1}` : null;
      const telefone2 = tel2 ? `${ddd2 || ""}${tel2}` : null;
      const telefoneCorporativo = corporativos.get(chaveVendedor(nome, loja)) || corporativos.get(chaveVendedor(nomeCorreio, loja)) || null;

      const base = {
        nome,
        nome_correio: nomeCorreio,
        nome_c2s: nomeC2S,
        loja,
        cargo: cargo || acesso || "VENDEDOR",
        status_planilha: status,
        telefone_particular_1: telefone1,
        telefone_particular_2: telefone2,
        telefone_corporativo: telefoneCorporativo,
      };

      importados.push({
        ...base,
        origem: "google_sheets",
        ativo: true,
        recebe_agendamento: true,
        situacao_operacional: "ativo",
        google_sheet_hash: hashVendedor(base),
        google_sheet_atualizado_em: new Date().toISOString(),
      });
    }

    let totalImportados = 0;
    let totalAtualizados = 0;

    for (const vendedor of importados) {
      const { data: existente } = await supabase
        .from("vendedores_comerciais")
        .select("id, google_sheet_hash, origem")
        .or(`nome_c2s.eq.${vendedor.nome_c2s || vendedor.nome},nome.eq.${vendedor.nome}`)
        .eq("loja", vendedor.loja)
        .maybeSingle();

      if (existente?.id) {
        const { error } = await supabase
          .from("vendedores_comerciais")
          .update({
            ...vendedor,
            atualizado_por: usuario.id,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", existente.id);
        if (error) throw error;
        totalAtualizados++;
      } else {
        const { data: criado, error } = await supabase
          .from("vendedores_comerciais")
          .insert({
            ...vendedor,
            criado_por: usuario.id,
            atualizado_por: usuario.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        totalImportados++;

        const capacidades = Array.from({ length: 7 }).map((_, dia) => ({
          vendedor_id: criado.id,
          dia_semana: dia,
          manha_ativo: dia !== 0,
          tarde_ativo: dia !== 0 && dia !== 6,
          noite_ativo: false,
          capacidade_manha: dia === 0 ? 0 : dia === 6 ? 2 : 3,
          capacidade_tarde: dia === 0 || dia === 6 ? 0 : 4,
          capacidade_noite: 0,
          atualizado_por: usuario.id,
        }));
        await supabase.from("vendedores_capacidade").upsert(capacidades, { onConflict: "vendedor_id,dia_semana" }).then(() => null);
      }
    }

    const resumo = {
      total_lidos: dadoscolabs.length,
      total_importados: totalImportados,
      total_atualizados: totalAtualizados,
      total_ignorados: ignorados.length,
      detalhes: { ignorados: ignorados.slice(0, 80), spreadsheet_id: SPREADSHEET_ID },
    };

    if (logId) {
      await supabase
        .from("vendedores_sincronizacao_logs")
        .update({ status: "sucesso", mensagem: "Sincronização concluída.", ...resumo })
        .eq("id", logId);
    }

    return NextResponse.json({ ok: true, ...resumo });
  } catch (error) {
    console.error("Erro ao sincronizar vendedores Google Sheets:", error);
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar vendedores.";
    if (logId) {
      await supabase
        .from("vendedores_sincronizacao_logs")
        .update({ status: "erro", mensagem })
        .eq("id", logId)
        .then(() => null);
    }
    return NextResponse.json({ ok: false, erro: mensagem }, { status: 500 });
  }
}
