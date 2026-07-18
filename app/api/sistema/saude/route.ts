import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function podeGerenciar(perfil?: string | null) {
  return [
    "adm",
    "admin",
    "suporte",
    "gerente",
    "supervisor",
    "gestor",
  ].includes(String(perfil || "").toLowerCase());
}

async function buscarUsuarioInterno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
) {
  const { data: porAuth } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, loja, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (porAuth) return porAuth;

  if (user.email) {
    const { data: porEmail } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, loja, ativo")
      .ilike("email", user.email)
      .eq("ativo", true)
      .maybeSingle();

    if (porEmail) return porEmail;
  }

  if (String(user.email || "").toLowerCase() === "renan@azulveiculos.com.br") {
    return {
      id: user.id,
      nome: "Renan",
      email: user.email || "",
      perfil: "adm",
      loja: null,
      ativo: true,
    };
  }

  return null;
}

async function testarTabela(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabela: string,
) {
  try {
    const { error, count } = await supabase
      .from(tabela)
      .select("*", { count: "exact", head: true });

    return {
      tabela,
      ok: !error,
      total: count || 0,
      erro: error?.message || null,
    };
  } catch (error) {
    return {
      tabela,
      ok: false,
      total: 0,
      erro: error instanceof Error ? error.message : "Erro desconhecido.",
    };
  }
}

async function testarGoogleSheet() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const acompanhamentoGid = process.env.GOOGLE_SHEETS_ACOMPANHAMENTO_GID;
  const vendidosGid = process.env.GOOGLE_SHEETS_VENDIDOS_GID;

  if (!spreadsheetId) {
    return {
      ok: false,
      erro: "GOOGLE_SHEETS_SPREADSHEET_ID não configurado.",
      abas: [],
    };
  }

  const abas = [
    {
      nome: "AcompanhamentoVendas",
      gid: acompanhamentoGid,
    },
    {
      nome: "lista_estoque_com_vendidos",
      gid: vendidosGid,
    },
    {
      nome: "statuscorreio",
      sheet: "statuscorreio",
    },
  ];

  const resultados = await Promise.all(
    abas.map(async (aba) => {
      try {
        let url = "";

        if (aba.gid) {
          url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${aba.gid}`;
        } else {
          url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
            aba.sheet || aba.nome,
          )}`;
        }

        const resposta = await fetch(url, { cache: "no-store" });
        const texto = await resposta.text();

        return {
          nome: aba.nome,
          ok: resposta.ok && texto.length > 20,
          status: resposta.status,
          tamanho: texto.length,
          erro: resposta.ok ? null : texto.slice(0, 120),
        };
      } catch (error) {
        return {
          nome: aba.nome,
          ok: false,
          status: 0,
          tamanho: 0,
          erro: error instanceof Error ? error.message : "Erro desconhecido.",
        };
      }
    }),
  );

  return {
    ok: resultados.every((item) => item.ok),
    erro: null,
    abas: resultados,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, erro: "Não autenticado." },
        { status: 401 },
      );
    }

    const usuario = await buscarUsuarioInterno(supabase, user);

    if (!usuario || !podeGerenciar(usuario.perfil)) {
      return NextResponse.json(
        { ok: false, erro: "Sem permissão para ver saúde do sistema." },
        { status: 403 },
      );
    }

    const [
      vendasTabela,
      auditoriaTabela,
      syncTabela,
      errosTabela,
      googleSheets,
      ultimaSync,
      errosRecentes,
    ] = await Promise.all([
      testarTabela(supabase, "vendas_acompanhamento"),
      testarTabela(supabase, "sistema_auditoria"),
      testarTabela(supabase, "sistema_sincronizacoes"),
      testarTabela(supabase, "sistema_erros"),
      testarGoogleSheet(),
      supabase
        .from("sistema_sincronizacoes")
        .select("*")
        .order("iniciado_em", { ascending: false })
        .limit(5),
      supabase
        .from("sistema_erros")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(10),
    ]);

    const tabelas = [vendasTabela, auditoriaTabela, syncTabela, errosTabela];

    return NextResponse.json({
      ok: true,
      usuario,
      saude: {
        status_geral:
          tabelas.every((item) => item.ok) && googleSheets.ok
            ? "ok"
            : "atencao",
        tabelas,
        google_sheets: googleSheets,
        ultima_sincronizacao: ultimaSync.data || [],
        erros_recentes: errosRecentes.data || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao carregar saúde do sistema.",
      },
      { status: 500 },
    );
  }
}
