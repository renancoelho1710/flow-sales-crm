import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AnyRecord = Record<string, any>;

type C2SLead = {
  id?: string;
  internal_id?: number;
  attributes?: AnyRecord;
};

function somenteNumeros(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

function limparTexto(valor?: string | null) {
  const texto = String(valor || "").trim();
  return texto.length > 0 ? texto : null;
}

function primeiroTexto(...valores: Array<unknown>) {
  for (const valor of valores) {
    const limpo = limparTexto(typeof valor === "string" || typeof valor === "number" ? String(valor) : null);
    if (limpo) return limpo;
  }

  return null;
}

function primeiroObjeto(...valores: Array<unknown>) {
  for (const valor of valores) {
    if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      return valor as AnyRecord;
    }
  }

  return {};
}

function normalizarEmail(valor?: string | null) {
  const email = limparTexto(valor);
  return email ? email.toLowerCase() : null;
}

function normalizarNomeBusca(valor?: string | null) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extrairVendedorCarteira(item: C2SLead) {
  const attributes = item.attributes || {};

  const vendedor = primeiroObjeto(
    attributes.seller,
    attributes.salesman,
    attributes.vendor,
    attributes.broker,
    attributes.responsible,
    attributes.responsible_user,
    attributes.attendant,
    attributes.user,
    attributes.owner,
    attributes.received_by,
    attributes.collaborator,
    attributes.consultant,
    attributes.lead_owner,
    attributes.current_user
  );

  const vendedorId = primeiroTexto(
    vendedor.id,
    vendedor.uuid,
    vendedor.external_id,
    vendedor.internal_id,
    vendedor.user_id,
    vendedor.c2s_id,
    attributes.seller_id,
    attributes.salesman_id,
    attributes.vendor_id,
    attributes.broker_id,
    attributes.responsible_id,
    attributes.user_id,
    attributes.owner_id
  );

  const vendedorNome = primeiroTexto(
    vendedor.name,
    vendedor.nome,
    vendedor.full_name,
    vendedor.display_name,
    vendedor.label,
    attributes.seller_name,
    attributes.salesman_name,
    attributes.vendor_name,
    attributes.broker_name,
    attributes.responsible_name,
    attributes.user_name,
    attributes.owner_name
  );

  const vendedorEmail = normalizarEmail(
    primeiroTexto(
      vendedor.email,
      vendedor.mail,
      vendedor.login,
      attributes.seller_email,
      attributes.salesman_email,
      attributes.vendor_email,
      attributes.responsible_email,
      attributes.user_email,
      attributes.owner_email
    )
  );

  const vendedorTelefone = primeiroTexto(
    vendedor.phone,
    vendedor.telefone,
    vendedor.cellphone,
    vendedor.mobile,
    attributes.seller_phone,
    attributes.salesman_phone,
    attributes.vendor_phone,
    attributes.responsible_phone
  );

  return {
    vendedor_c2s_id: vendedorId,
    vendedor_c2s_nome: vendedorNome,
    vendedor_c2s_email: vendedorEmail,
    vendedor_c2s_telefone: vendedorTelefone,
    vendedor_dados: Object.keys(vendedor).length ? vendedor : null,
  };
}

function extrairLojaCarteira(item: C2SLead) {
  const attributes = item.attributes || {};
  const product = attributes.product || {};

  const loja = primeiroObjeto(
    attributes.company,
    attributes.store,
    attributes.unit,
    attributes.branch,
    attributes.dealership,
    attributes.shop,
    attributes.enterprise,
    product.company,
    product.store,
    product.unit
  );

  const lojaId = primeiroTexto(
    loja.id,
    loja.uuid,
    loja.external_id,
    loja.internal_id,
    loja.company_id,
    loja.store_id,
    loja.c2s_id,
    attributes.company_id,
    attributes.store_id,
    attributes.unit_id,
    attributes.branch_id,
    product.company_id,
    product.store_id,
    product.unit_id
  );

  const lojaNome = primeiroTexto(
    loja.name,
    loja.nome,
    loja.company,
    loja.description,
    loja.label,
    attributes.company,
    attributes.company_name,
    attributes.store_name,
    attributes.unit_name,
    attributes.branch_name,
    product.company,
    product.company_name,
    product.store_name,
    product.unit_name
  );

  return {
    loja_carteira_c2s_id: lojaId,
    loja_carteira_c2s_nome: lojaNome,
    loja_dados: Object.keys(loja).length ? loja : null,
  };
}

function normalizarLeadC2S(item: C2SLead) {
  const attributes = item.attributes || {};
  const customer = attributes.customer || {};
  const product = attributes.product || {};
  const vendedorCarteira = extrairVendedorCarteira(item);
  const lojaCarteira = extrairLojaCarteira(item);

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
    ...vendedorCarteira,
    ...lojaCarteira,
    c2s_payload_resumo: {
      raw_id: item.id || null,
      internal_id: item.internal_id || null,
      vendedor: vendedorCarteira.vendedor_dados,
      loja: lojaCarteira.loja_dados,
      company: attributes.company || null,
      store: attributes.store || null,
      unit: attributes.unit || null,
      responsible: attributes.responsible || null,
      seller: attributes.seller || null,
      user: attributes.user || null,
      owner: attributes.owner || null,
    },
  };
}

async function upsertLojaC2S(supabase: any, lead: ReturnType<typeof normalizarLeadC2S>) {
  if (!lead.loja_carteira_c2s_id && !lead.loja_carteira_c2s_nome) return;

  const chave = lead.loja_carteira_c2s_id || normalizarNomeBusca(lead.loja_carteira_c2s_nome);

  await supabase.from("c2s_lojas").upsert(
    {
      c2s_id: chave,
      nome: lead.loja_carteira_c2s_nome || "Loja C2S sem nome",
      codigo: lead.loja_carteira_c2s_id || null,
      ativa: true,
      dados: lead.loja_dados || lead.c2s_payload_resumo?.loja || null,
      sincronizado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "c2s_id" }
  );
}


async function buscarResponsavelDisponivel(supabase: any) {
  const { data: statusBloqueantes } = await supabase
    .from("operacao_status_tipos")
    .select("chave")
    .eq("ativo", true)
    .eq("bloqueia_recebimento_leads", true);

  const bloqueados = new Set((statusBloqueantes || []).map((item: any) => String(item.chave || "")));

  const { data: usuarios, error } = await supabase
    .from("usuarios_internos")
    .select("id, nome, perfil, ativo, recebe_leads, status_operacional, status_administrativo, ultimo_lead_recebido_em, ordem_distribuicao")
    .eq("ativo", true)
    .eq("recebe_leads", true)
    .eq("status_administrativo", "disponivel")
    .order("ultimo_lead_recebido_em", { ascending: true, nullsFirst: true })
    .order("ordem_distribuicao", { ascending: true });

  if (error) {
    console.error("Erro ao buscar responsável disponível:", error);
    return null;
  }

  const candidatos = (usuarios || []).filter((usuario: any) => {
    const status = String(usuario.status_operacional || "offline").toLowerCase();
    return !bloqueados.has(status) && status === "disponivel";
  });

  return candidatos[0] || null;
}

async function upsertVendedorC2S(supabase: any, lead: ReturnType<typeof normalizarLeadC2S>) {
  if (!lead.vendedor_c2s_id && !lead.vendedor_c2s_email && !lead.vendedor_c2s_nome) return;

  const chave =
    lead.vendedor_c2s_id ||
    lead.vendedor_c2s_email ||
    normalizarNomeBusca(`${lead.vendedor_c2s_nome || ""}-${lead.loja_carteira_c2s_nome || ""}`);

  await supabase.from("c2s_vendedores").upsert(
    {
      c2s_id: chave,
      nome: lead.vendedor_c2s_nome || "Vendedor C2S sem nome",
      email: lead.vendedor_c2s_email || null,
      telefone: lead.vendedor_c2s_telefone || null,
      loja_c2s_id: lead.loja_carteira_c2s_id || null,
      loja_nome: lead.loja_carteira_c2s_nome || null,
      ativo: true,
      dados: lead.vendedor_dados || lead.c2s_payload_resumo?.vendedor || null,
      sincronizado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "c2s_id" }
  );
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
  let totalComVendedorC2S = 0;
  let totalComLojaCarteira = 0;
  let totalAtribuidosAutomaticamente = 0;
  let totalSemResponsavelDisponivel = 0;

  for (const lead of leads) {
    if (!lead.telefone_normalizado) {
      totalSemTelefone++;
      continue;
    }

    if (lead.vendedor_c2s_nome || lead.vendedor_c2s_id || lead.vendedor_c2s_email) {
      totalComVendedorC2S++;
    }

    if (lead.loja_carteira_c2s_nome || lead.loja_carteira_c2s_id) {
      totalComLojaCarteira++;
    }

    await upsertLojaC2S(supabase, lead);
    await upsertVendedorC2S(supabase, lead);

    const { data: existente } = await supabase
      .from("leads")
      .select("id, responsavel_id, atendente_resgate_id")
      .eq("telefone_normalizado", lead.telefone_normalizado)
      .maybeSingle();

    const dadosLead = {
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
      vendedor_c2s_id: lead.vendedor_c2s_id,
      vendedor_c2s_nome: lead.vendedor_c2s_nome,
      vendedor_c2s_email: lead.vendedor_c2s_email,
      vendedor_c2s_telefone: lead.vendedor_c2s_telefone,
      loja_carteira_c2s_id: lead.loja_carteira_c2s_id,
      loja_carteira_c2s_nome: lead.loja_carteira_c2s_nome,
    };

    if (existente) {
      const dadosAtualizacao: AnyRecord = { ...dadosLead };

      if (!existente.responsavel_id && !existente.atendente_resgate_id) {
        const responsavelDisponivel = await buscarResponsavelDisponivel(supabase);

        if (responsavelDisponivel?.id) {
          dadosAtualizacao.responsavel_id = responsavelDisponivel.id;
          dadosAtualizacao.atendente_resgate_id = responsavelDisponivel.id;
          totalAtribuidosAutomaticamente++;

          await supabase
            .from("usuarios_internos")
            .update({ ultimo_lead_recebido_em: new Date().toISOString() })
            .eq("id", responsavelDisponivel.id);
        }
      }

      const { error } = await supabase
        .from("leads")
        .update(dadosAtualizacao)
        .eq("id", existente.id);

      if (!error) {
        totalAtualizados++;
      }

      continue;
    }

    const responsavelDisponivel = await buscarResponsavelDisponivel(supabase);

    if (!responsavelDisponivel?.id) {
      totalSemResponsavelDisponivel++;
    }

    const responsavelId = responsavelDisponivel?.id || null;

    const { error } = await supabase.from("leads").insert({
      ...dadosLead,
      telefone_normalizado: lead.telefone_normalizado,
      status: "morno",
      etapa: "novo",
      temperatura: "morno",
      atendente_resgate_id: responsavelId,
      responsavel_id: responsavelId,
    });

    if (!error) {
      totalImportados++;

      if (responsavelDisponivel?.id) {
        totalAtribuidosAutomaticamente++;

        await supabase
          .from("usuarios_internos")
          .update({ ultimo_lead_recebido_em: new Date().toISOString() })
          .eq("id", responsavelDisponivel.id);
      }
    } else {
      console.error("Erro ao inserir lead C2S:", error);
    }
  }

  await supabase.from("importacoes_c2s").insert({
    usuario_id: usuarioInterno.id,
    total_recebidos: leads.length,
    total_importados: totalImportados,
    total_atualizados: totalAtualizados,
    total_sem_telefone: totalSemTelefone,
    status: "concluida",
    observacao: `Importação realizada pela API C2S. Leads com vendedor C2S: ${totalComVendedorC2S}. Leads com loja/carteira C2S: ${totalComLojaCarteira}. Atribuídos automaticamente: ${totalAtribuidosAutomaticamente}. Sem responsável disponível: ${totalSemResponsavelDisponivel}.`,
  });

  return NextResponse.json({
    ok: true,
    total_recebidos: leads.length,
    total_importados: totalImportados,
    total_atualizados: totalAtualizados,
    total_sem_telefone: totalSemTelefone,
    total_com_vendedor_c2s: totalComVendedorC2S,
    total_com_loja_carteira: totalComLojaCarteira,
    total_atribuidos_automaticamente: totalAtribuidosAutomaticamente,
    total_sem_responsavel_disponivel: totalSemResponsavelDisponivel,
  });
}
