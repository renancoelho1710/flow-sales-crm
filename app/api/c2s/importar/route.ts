import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    produto_c2s: {
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

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, erro: "Usuário não autenticado." },
      { status: 401 }
    );
  }

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("id, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuarioInterno || !["adm", "suporte"].includes(usuarioInterno.perfil)) {
    return NextResponse.json(
      { ok: false, erro: "Usuário sem permissão para importar leads." },
      { status: 403 }
    );
  }

  const baseUrl = process.env.C2S_API_BASE_URL;
  const token = process.env.C2S_API_TOKEN;

  if (!baseUrl || !token) {
    return NextResponse.json(
      { ok: false, erro: "Configuração da API C2S incompleta." },
      { status: 500 }
    );
  }

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
        erro: "C2S recusou a requisição.",
        status: resposta.status,
        resposta: texto.slice(0, 500),
      },
      { status: resposta.status }
    );
  }

  const json = JSON.parse(texto);
  const itens: C2SLead[] = Array.isArray(json?.data) ? json.data : [];
  const leads = itens.map(normalizarLeadC2S);

  let totalImportados = 0;
  let totalAtualizados = 0;
  let totalSemTelefone = 0;

  for (const lead of leads) {
    if (!lead.telefone_normalizado) {
      totalSemTelefone++;
      continue;
    }

    const { data: existente } = await supabase
      .from("leads")
      .select("id, responsavel_id")
      .eq("telefone_normalizado", lead.telefone_normalizado)
      .maybeSingle();

    if (existente) {
      const { error } = await supabase
        .from("leads")
        .update({
          c2s_id: lead.c2s_id,
          c2s_internal_id: lead.c2s_internal_id,
          nome: lead.nome,
          telefone: lead.telefone,
          email: lead.email,
          origem: lead.origem,
          campanha: "C2S",
          veiculo_interesse: lead.veiculo_interesse,
          observacao: lead.observacao,
          produto_c2s: lead.produto_c2s,
          criado_em_c2s: lead.criado_em_c2s,
        })
        .eq("id", existente.id);

      if (!error) {
        totalAtualizados++;
      }

      continue;
    }

    const { error } = await supabase.from("leads").insert({
      c2s_id: lead.c2s_id,
      c2s_internal_id: lead.c2s_internal_id,
      nome: lead.nome,
      telefone: lead.telefone,
      telefone_normalizado: lead.telefone_normalizado,
      email: lead.email,
      origem: lead.origem,
      campanha: "C2S",
      status: "morno",
      etapa: "novo",
      temperatura: "morno",
      veiculo_interesse: lead.veiculo_interesse,
      observacao: lead.observacao,
      produto_c2s: lead.produto_c2s,
      criado_em_c2s: lead.criado_em_c2s,
    });

    if (!error) {
      totalImportados++;
    }
  }

  await supabase.from("importacoes_c2s").insert({
    usuario_id: usuarioInterno.id,
    total_recebidos: leads.length,
    total_importados: totalImportados,
    total_atualizados: totalAtualizados,
    total_sem_telefone: totalSemTelefone,
    status: "concluida",
    observacao: "Importação realizada pela API C2S.",
  });

  return NextResponse.json({
    ok: true,
    total_recebidos: leads.length,
    total_importados: totalImportados,
    total_atualizados: totalAtualizados,
    total_sem_telefone: totalSemTelefone,
  });
}
