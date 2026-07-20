import { NextResponse } from "next/server";
import {
  iniciarSincronizacao,
  finalizarSincronizacao,
} from "@/lib/sistema/sync-log";
import {
  registrarAuditoria,
  registrarErroSistema,
} from "@/lib/sistema/auditoria";
import { createClient } from "@/lib/supabase/server";
import {
  lerGoogleSheetPublicoPorAba,
  lerGoogleSheetPublicoPorGid,
} from "@/lib/google/sheets-public";

type FinanceiroDetalhe = {
  parcela: string;
  valor: number;
  instituicao: string | null;
};

type AcompanhamentoItem = {
  placa: string;
  vendedor_nome: string | null;
  loja: string | null;
  cliente: string | null;
  data_venda: string | null;
  instituicao: string | null;
  total_linhas: number;
  total_valor: number;
  parcela_tipo: string | null;
  valor_parcela: number;
  financeiro_detalhes: FinanceiroDetalhe[];
};

type StatusItem = {
  placa: string;
  numero_proposta: string | null;
  data_proposta: string | null;
  status_proposta: string | null;
  veiculo: string | null;
  total_venda: number;
  data_aprovacao: string | null;
  responsavel_aprovacao: string | null;
  vendedor_nome: string | null;
  cliente: string | null;
  loja: string | null;
  origem_status: string | null;
};

type VendidoItem = {
  placa: string;
  veiculo: string | null;
  valor: number;
};

type FiltroSincronizacao = {
  data_inicio?: string | null;
  data_fim?: string | null;
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function normalizar(valor: unknown) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function placaLimpa(valor: unknown) {
  return texto(valor)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function placaValida(valor: string) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(valor);
}

function dinheiroNumero(valor: unknown) {
  const bruto = texto(valor);

  if (!bruto) return 0;

  const limpo = bruto
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(limpo);

  return Number.isFinite(numero) ? numero : 0;
}

function converterData(valor: unknown) {
  const bruto = texto(valor).split(" ")[0];

  if (!bruto) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return bruto;

  const partes = bruto.split("/");

  if (partes.length === 3) {
    const [dia, mes, ano] = partes.map((parte) => parte.padStart(2, "0"));

    if (ano && mes && dia) return `${ano}-${mes}-${dia}`;
  }

  return null;
}

function maiorData(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;

  return a > b ? a : b;
}

function dentroDoPeriodo(data: string | null, filtros: FiltroSincronizacao) {
  if (!data) return false;

  if (filtros.data_inicio && data < filtros.data_inicio) return false;
  if (filtros.data_fim && data > filtros.data_fim) return false;

  return true;
}

function statusVendido(status: string | null | undefined) {
  const s = normalizar(status);

  return (
    s.includes("comercial") ||
    s.includes("fatur") ||
    s.includes("vendido") ||
    s.includes("aprov")
  );
}

function indiceCabecalho(cabecalho: string[], opcoes: string[]) {
  const normalizados = cabecalho.map((item) => normalizar(item));

  return normalizados.findIndex((coluna) =>
    opcoes.some((opcao) => coluna.includes(normalizar(opcao))),
  );
}

function encontrarLinhaCabecalho(linhas: string[][], obrigatorias: string[]) {
  return linhas.findIndex((linha) => {
    const normalizada = linha.map((item) => normalizar(item)).join(" ");

    return obrigatorias.every((obrigatoria) =>
      normalizada.includes(normalizar(obrigatoria)),
    );
  });
}

function escolher<T>(...valores: (T | null | undefined | "" | 0)[]) {
  for (const valor of valores) {
    if (valor !== null && valor !== undefined && valor !== "" && valor !== 0) {
      return valor as T;
    }
  }

  return null;
}

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

function agruparAcompanhamento(
  linhas: string[][],
  filtros: FiltroSincronizacao,
) {
  const mapa = new Map<string, AcompanhamentoItem>();

  for (const linha of linhas.slice(1)) {
    const placa = placaLimpa(linha[0]);

    if (!placaValida(placa)) continue;

    const dataVendaLinha = converterData(linha[4]);

    if (
      (filtros.data_inicio || filtros.data_fim) &&
      !dentroDoPeriodo(dataVendaLinha, filtros)
    ) {
      continue;
    }

    const atual = mapa.get(placa) || {
      placa,
      vendedor_nome: null,
      loja: null,
      cliente: null,
      data_venda: null,
      instituicao: null,
      total_linhas: 0,
      total_valor: 0,
      parcela_tipo: null,
      valor_parcela: 0,
      financeiro_detalhes: [],
    };

    const instituicaoLinha = texto(linha[6]) || null;
    const parcelaLinha = texto(linha[7]) || "";
    const valorLinha = dinheiroNumero(linha[8]);

    atual.vendedor_nome = atual.vendedor_nome || texto(linha[1]) || null;
    atual.loja = atual.loja || texto(linha[2]) || null;
    atual.cliente = atual.cliente || texto(linha[3]) || null;
    atual.data_venda = maiorData(atual.data_venda, dataVendaLinha);
    atual.instituicao = atual.instituicao || instituicaoLinha;
    atual.parcela_tipo = atual.parcela_tipo || parcelaLinha || null;
    atual.valor_parcela = atual.valor_parcela || valorLinha;
    atual.total_linhas += 1;
    atual.total_valor += valorLinha;

    if (parcelaLinha || valorLinha > 0 || instituicaoLinha) {
      atual.financeiro_detalhes.push({
        parcela: parcelaLinha || "Não informado",
        valor: valorLinha,
        instituicao: instituicaoLinha,
      });
    }

    mapa.set(placa, atual);
  }

  return mapa;
}

function agruparVendidos(linhas: string[][]) {
  const mapa = new Map<string, VendidoItem>();

  for (const linha of linhas.slice(1)) {
    const placa = [linha[10], linha[0], linha[1]]
      .map((item) => placaLimpa(item))
      .find((item) => placaValida(item));

    if (!placa) continue;

    const marca = texto(linha[3]);
    const modelo = texto(linha[4]);
    const ano = texto(linha[6]);

    mapa.set(placa, {
      placa,
      veiculo: [marca, modelo, ano].filter(Boolean).join(" ") || null,
      valor: dinheiroNumero(linha[11]),
    });
  }

  return mapa;
}

function agruparStatusPorCabecalho(linhas: string[][], origem: string) {
  const mapa = new Map<string, StatusItem>();
  const headerIndex = encontrarLinhaCabecalho(linhas, ["placa"]);

  if (headerIndex < 0) return mapa;

  const cabecalho = linhas[headerIndex];

  const iNumero = indiceCabecalho(cabecalho, ["numero", "número", "proposta"]);
  const iDataProposta = indiceCabecalho(cabecalho, ["data proposta"]);
  const iStatus = indiceCabecalho(cabecalho, ["status proposta", "status"]);
  const iPlaca = indiceCabecalho(cabecalho, ["placa"]);
  const iVeiculo = indiceCabecalho(cabecalho, [
    "veiculo",
    "veículo",
    "marca modelo",
    "marca/modelo",
    "modelo",
  ]);
  const iTotal = indiceCabecalho(cabecalho, [
    "total venda",
    "valor venda",
    "valor ve",
    "valor",
    "preco",
    "preço",
  ]);
  const iDataAprovacao = indiceCabecalho(cabecalho, [
    "data aprovacao",
    "data aprovação",
  ]);
  const iResponsavel = indiceCabecalho(cabecalho, [
    "responsavel aprovacao",
    "responsável aprovação",
  ]);
  const iVendedor = indiceCabecalho(cabecalho, [
    "vendedor",
    "captador",
    "vendedor captador",
  ]);
  const iCliente = indiceCabecalho(cabecalho, ["cliente"]);
  const iLoja = indiceCabecalho(cabecalho, ["loja", "localizado"]);

  for (const linha of linhas.slice(headerIndex + 1)) {
    const placa = placaLimpa(linha[iPlaca]);

    if (!placaValida(placa)) continue;

    const novo: StatusItem = {
      placa,
      numero_proposta: iNumero >= 0 ? texto(linha[iNumero]) || null : null,
      data_proposta:
        iDataProposta >= 0 ? converterData(linha[iDataProposta]) : null,
      status_proposta: iStatus >= 0 ? texto(linha[iStatus]) || null : null,
      veiculo: iVeiculo >= 0 ? texto(linha[iVeiculo]) || null : null,
      total_venda: iTotal >= 0 ? dinheiroNumero(linha[iTotal]) : 0,
      data_aprovacao:
        iDataAprovacao >= 0 ? converterData(linha[iDataAprovacao]) : null,
      responsavel_aprovacao:
        iResponsavel >= 0 ? texto(linha[iResponsavel]) || null : null,
      vendedor_nome: iVendedor >= 0 ? texto(linha[iVendedor]) || null : null,
      cliente: iCliente >= 0 ? texto(linha[iCliente]) || null : null,
      loja: iLoja >= 0 ? texto(linha[iLoja]) || null : null,
      origem_status: origem,
    };

    const atual = mapa.get(placa);

    if (!atual) {
      mapa.set(placa, novo);
      continue;
    }

    mapa.set(placa, {
      placa,
      numero_proposta: escolher(novo.numero_proposta, atual.numero_proposta),
      data_proposta: maiorData(atual.data_proposta, novo.data_proposta),
      status_proposta: escolher(novo.status_proposta, atual.status_proposta),
      veiculo: escolher(novo.veiculo, atual.veiculo),
      total_venda: escolher(novo.total_venda, atual.total_venda) || 0,
      data_aprovacao: maiorData(atual.data_aprovacao, novo.data_aprovacao),
      responsavel_aprovacao: escolher(
        novo.responsavel_aprovacao,
        atual.responsavel_aprovacao,
      ),
      vendedor_nome: escolher(novo.vendedor_nome, atual.vendedor_nome),
      cliente: escolher(novo.cliente, atual.cliente),
      loja: escolher(novo.loja, atual.loja),
      origem_status: escolher(novo.origem_status, atual.origem_status),
    });
  }

  return mapa;
}

function agruparStatusCorreioFixo(linhas: string[][]) {
  const mapa = new Map<string, StatusItem>();

  for (const linha of linhas.slice(1)) {
    // statuscorreio:
    // A numero
    // B data proposta
    // C status proposta
    // D placa
    // E veiculo
    // F total venda
    // G data aprovação
    // H responsável aprovação
    // I vendedor
    const placa = placaLimpa(linha[3]);

    if (!placaValida(placa)) continue;

    mapa.set(placa, {
      placa,
      numero_proposta: texto(linha[0]) || null,
      data_proposta: converterData(linha[1]),
      status_proposta: texto(linha[2]) || null,
      veiculo: texto(linha[4]) || null,
      total_venda: dinheiroNumero(linha[5]),
      data_aprovacao: converterData(linha[6]),
      responsavel_aprovacao: texto(linha[7]) || null,
      vendedor_nome: texto(linha[8]) || null,
      cliente: null,
      loja: null,
      origem_status: "statuscorreio",
    });
  }

  return mapa;
}

function agruparFlashFixo(linhas: string[][]) {
  const mapa = new Map<string, StatusItem>();

  const headerIndex = encontrarLinhaCabecalho(linhas, ["placa"]);
  const cabecalho = headerIndex >= 0 ? linhas[headerIndex] : [];

  const iPlaca = indiceCabecalho(cabecalho, ["placa"]);
  const iData = indiceCabecalho(cabecalho, ["data"]);
  const iLoja = indiceCabecalho(cabecalho, ["loja", "localizado"]);
  const iVendedorCaptador = indiceCabecalho(cabecalho, [
    "vendedor captador",
    "vendedor/captador",
    "captador",
    "vendedor",
  ]);
  const iCarro = indiceCabecalho(cabecalho, [
    "carro",
    "veiculo",
    "veículo",
    "marca modelo",
    "marca/modelo",
    "marca",
  ]);
  const iCliente = indiceCabecalho(cabecalho, ["cliente"]);
  const iVendedorGerente = indiceCabecalho(cabecalho, [
    "vendedor gerente",
    "vendedor/gerente",
    "gerente",
  ]);
  const iValor = indiceCabecalho(cabecalho, [
    "valor",
    "preco",
    "preço",
    "preço cm",
    "valor ve",
  ]);
  const iStatus = indiceCabecalho(cabecalho, [
    "status",
    "situacao",
    "situação",
  ]);

  const inicio = headerIndex >= 0 ? headerIndex + 1 : 1;

  for (const linha of linhas.slice(inicio)) {
    // Modelo 1 informado:
    // A data | B loja | C vendedor/captador | D placa | E carro | H cliente | M vendedor/gerente
    //
    // Modelo 2 encontrado no CSV:
    // A placa | demais colunas por cabeçalho
    const placa =
      (iPlaca >= 0 ? placaLimpa(linha[iPlaca]) : "") ||
      [linha[3], linha[0]]
        .map((item) => placaLimpa(item))
        .find((item) => placaValida(item)) ||
      "";

    if (!placaValida(placa)) continue;

    const vendedorCaptador =
      (iVendedorCaptador >= 0 ? texto(linha[iVendedorCaptador]) : "") ||
      texto(linha[2]) ||
      null;

    const vendedorGerente =
      (iVendedorGerente >= 0 ? texto(linha[iVendedorGerente]) : "") ||
      texto(linha[12]) ||
      null;

    const cliente =
      (iCliente >= 0 ? texto(linha[iCliente]) : "") || texto(linha[7]) || null;

    const veiculo =
      (iCarro >= 0 ? texto(linha[iCarro]) : "") || texto(linha[4]) || null;

    const loja =
      (iLoja >= 0 ? texto(linha[iLoja]) : "") || texto(linha[1]) || null;

    const data =
      (iData >= 0 ? converterData(linha[iData]) : null) ||
      converterData(linha[0]);

    const valor = iValor >= 0 ? dinheiroNumero(linha[iValor]) : 0;
    const status = iStatus >= 0 ? texto(linha[iStatus]) || null : null;

    mapa.set(placa, {
      placa,
      numero_proposta: null,
      data_proposta: data,
      status_proposta: status,
      veiculo,
      total_venda: valor,
      data_aprovacao: null,
      responsavel_aprovacao: null,
      vendedor_nome: vendedorGerente || vendedorCaptador,
      cliente,
      loja,
      origem_status: "Flash",
    });
  }

  return mapa;
}

function juntarStatus(...mapas: Map<string, StatusItem>[]) {
  const final = new Map<string, StatusItem>();

  for (const mapa of mapas) {
    for (const [placa, novo] of mapa.entries()) {
      const atual = final.get(placa);

      if (!atual) {
        final.set(placa, novo);
        continue;
      }

      final.set(placa, {
        placa,
        numero_proposta: escolher(atual.numero_proposta, novo.numero_proposta),
        data_proposta: maiorData(atual.data_proposta, novo.data_proposta),
        status_proposta: escolher(atual.status_proposta, novo.status_proposta),
        veiculo: escolher(atual.veiculo, novo.veiculo),
        total_venda: escolher(atual.total_venda, novo.total_venda) || 0,
        data_aprovacao: maiorData(atual.data_aprovacao, novo.data_aprovacao),
        responsavel_aprovacao: escolher(
          atual.responsavel_aprovacao,
          novo.responsavel_aprovacao,
        ),
        vendedor_nome: escolher(atual.vendedor_nome, novo.vendedor_nome),
        cliente: escolher(atual.cliente, novo.cliente),
        loja: escolher(atual.loja, novo.loja),
        origem_status: [atual.origem_status, novo.origem_status]
          .filter(Boolean)
          .join("+"),
      });
    }
  }

  return final;
}

function montarVendas(
  acompanhamento: ReturnType<typeof agruparAcompanhamento>,
  vendidos: ReturnType<typeof agruparVendidos>,
  statusConsolidado: Map<string, StatusItem>,
) {
  const placas = new Set<string>([
    ...Array.from(acompanhamento.keys()),
    ...Array.from(vendidos.keys()),
    ...Array.from(statusConsolidado.keys()),
  ]);

  return Array.from(placas).map((placa) => {
    const itemAcompanhamento = acompanhamento.get(placa);
    const itemVendido = vendidos.get(placa);
    const itemStatus = statusConsolidado.get(placa);

    const presenteAcompanhamento = Boolean(itemAcompanhamento);
    const presenteVendidos = Boolean(
      itemVendido || statusVendido(itemStatus?.status_proposta),
    );

    let status: "pendente" | "faturado" = "pendente";
    let conferenciaStatus:
      "confirmado" | "so_acompanhamento" | "so_vendidos" | "divergente" =
      "divergente";

    if (presenteAcompanhamento && presenteVendidos) {
      status = "faturado";
      conferenciaStatus = "confirmado";
    } else if (presenteAcompanhamento && !presenteVendidos) {
      conferenciaStatus = "so_acompanhamento";
    } else if (!presenteAcompanhamento && presenteVendidos) {
      conferenciaStatus = "so_vendidos";
    }

    const totalFinanceiro = itemAcompanhamento?.total_valor || 0;
    const totalVenda = itemStatus?.total_venda || itemVendido?.valor || 0;
    const valorPrincipal = totalVenda || totalFinanceiro || 0;

    return {
      placa,
      veiculo: escolher(itemStatus?.veiculo, itemVendido?.veiculo),
      cliente: escolher(itemAcompanhamento?.cliente, itemStatus?.cliente),
      vendedor_nome: escolher(
        itemAcompanhamento?.vendedor_nome,
        itemStatus?.vendedor_nome,
      ),
      vendedor_email: null,
      loja: escolher(itemAcompanhamento?.loja, itemStatus?.loja),
      data_venda:
        itemAcompanhamento?.data_venda || itemStatus?.data_proposta || null,
      instituicao: itemAcompanhamento?.instituicao || null,
      status,
      conferencia_status: conferenciaStatus,
      presente_acompanhamento: presenteAcompanhamento,
      presente_vendidos: presenteVendidos,
      total_linhas_acompanhamento: itemAcompanhamento?.total_linhas || 0,
      total_valor_acompanhamento: valorPrincipal,
      parcela_tipo: itemAcompanhamento?.parcela_tipo || null,
      valor_parcela: itemAcompanhamento?.valor_parcela || 0,
      financeiro_resumo: itemAcompanhamento
        ? `${itemAcompanhamento.parcela_tipo || "Não informado"} · R$ ${(
            itemAcompanhamento.valor_parcela ||
            itemAcompanhamento.total_valor ||
            0
          ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : null,
      financeiro_detalhes: itemAcompanhamento?.financeiro_detalhes || [],
      numero_proposta: itemStatus?.numero_proposta || null,
      data_proposta: itemStatus?.data_proposta || null,
      status_proposta: itemStatus?.status_proposta || null,
      data_aprovacao: itemStatus?.data_aprovacao || null,
      responsavel_aprovacao: itemStatus?.responsavel_aprovacao || null,
      total_venda: totalVenda,
      origem_status: itemStatus?.origem_status || null,
      origem: "google_sheets",
      observacao: null,
    };
  });
}

export async function POST(request: Request) {
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
        { ok: false, erro: "Sem permissão para sincronizar vendas." },
        { status: 403 },
      );
    }

    const syncId = await iniciarSincronizacao({
      modulo: "vendas",
      origem: "google_sheets",
      iniciado_por: usuario.id,
      iniciado_por_nome: usuario.nome,
      iniciado_por_email: usuario.email,
      detalhes: {
        rotina: "sincronizar_vendas",
      },
    });

    const body = await request.json().catch(() => ({}));

    const filtros: FiltroSincronizacao = {
      data_inicio: texto(body.data_inicio) || null,
      data_fim: texto(body.data_fim) || null,
    };

    const acompanhamentoGid =
      process.env.GOOGLE_SHEETS_ACOMPANHAMENTO_GID || "";
    const vendidosGid = process.env.GOOGLE_SHEETS_VENDIDOS_GID || "";

    if (!acompanhamentoGid || !vendidosGid) {
      return NextResponse.json(
        {
          ok: false,
          erro: "Faltam GIDs das abas no .env.local.",
        },
        { status: 400 },
      );
    }

    const [
      linhasAcompanhamento,
      linhasVendidos,
      linhasStatusCorreio,
      linhasDadosStatusCorreio,
      linhasFlash,
    ] = await Promise.all([
      lerGoogleSheetPublicoPorGid(acompanhamentoGid),
      lerGoogleSheetPublicoPorGid(vendidosGid),
      lerGoogleSheetPublicoPorAba("statuscorreio"),
      lerGoogleSheetPublicoPorAba("dadosstatuscorreio").catch(() => []),
      lerGoogleSheetPublicoPorAba("Flash").catch(() => []),
    ]);

    const acompanhamento = agruparAcompanhamento(linhasAcompanhamento, filtros);
    const vendidos = agruparVendidos(linhasVendidos);

    const statusCorreio = agruparStatusCorreioFixo(linhasStatusCorreio);

    const dadosStatusCorreio = agruparStatusPorCabecalho(
      linhasDadosStatusCorreio,
      "dadosstatuscorreio",
    );

    const flash = agruparFlashFixo(linhasFlash);

    const statusConsolidado = juntarStatus(
      statusCorreio,
      dadosStatusCorreio,
      flash,
    );

    const vendas = montarVendas(acompanhamento, vendidos, statusConsolidado);
    const agora = new Date().toISOString();

    const placasSincronizadas = Array.from(
      new Set(
        vendas.map((venda) => texto(venda.placa).toUpperCase()).filter(Boolean),
      ),
    );

    const preservaveisPorPlaca = new Map<string, Record<string, unknown>>();

    if (placasSincronizadas.length > 0) {
      const { data: vendasAtuais, error: erroBuscaAtuais } = await supabase
        .from("vendas_acompanhamento")
        .select(
          [
            "id",
            "placa",
            "operador_id",
            "operador_nome",
            "operador_email",
            "validacao_status",
            "elegivel_comissao",
            "motivo_recusa",
            "agendamento_id",
            "lead_id",
            "validado_por",
            "validado_em",
            "operador_vinculado_por",
            "operador_vinculado_por_nome",
            "operador_vinculado_em",
            "operador_vinculo_atualizado_por",
            "operador_vinculo_atualizado_por_nome",
            "operador_vinculo_atualizado_em",
            "operador_vinculo_removido_por",
            "operador_vinculo_removido_por_nome",
            "operador_vinculo_removido_em",
            "operador_vinculo_remocao_motivo",
            "criado_por",
            "criado_em",
          ].join(","),
        )
        .eq("origem", "google_sheets")
        .in("placa", placasSincronizadas);

      if (erroBuscaAtuais) throw new Error(erroBuscaAtuais.message);

      for (const vendaAtualRaw of vendasAtuais || []) {
        const vendaAtual = vendaAtualRaw as Record<string, any>;
        const placa = texto(vendaAtual.placa).toUpperCase();

        if (!placa || preservaveisPorPlaca.has(placa)) continue;

        preservaveisPorPlaca.set(placa, {
          id: vendaAtual.id,
          operador_id: vendaAtual.operador_id,
          operador_nome: vendaAtual.operador_nome,
          operador_email: vendaAtual.operador_email,
          validacao_status: vendaAtual.validacao_status,
          elegivel_comissao: vendaAtual.elegivel_comissao,
          motivo_recusa: vendaAtual.motivo_recusa,
          agendamento_id: vendaAtual.agendamento_id,
          lead_id: vendaAtual.lead_id,
          validado_por: vendaAtual.validado_por,
          validado_em: vendaAtual.validado_em,
          operador_vinculado_por: vendaAtual.operador_vinculado_por,
          operador_vinculado_por_nome: vendaAtual.operador_vinculado_por_nome,
          operador_vinculado_em: vendaAtual.operador_vinculado_em,
          operador_vinculo_atualizado_por:
            vendaAtual.operador_vinculo_atualizado_por,
          operador_vinculo_atualizado_por_nome:
            vendaAtual.operador_vinculo_atualizado_por_nome,
          operador_vinculo_atualizado_em:
            vendaAtual.operador_vinculo_atualizado_em,
          operador_vinculo_removido_por:
            vendaAtual.operador_vinculo_removido_por,
          operador_vinculo_removido_por_nome:
            vendaAtual.operador_vinculo_removido_por_nome,
          operador_vinculo_removido_em: vendaAtual.operador_vinculo_removido_em,
          operador_vinculo_remocao_motivo:
            vendaAtual.operador_vinculo_remocao_motivo,
          criado_por: vendaAtual.criado_por,
          criado_em: vendaAtual.criado_em,
        });
      }
    }

    const { error: erroLimpeza } = await supabase
      .from("vendas_acompanhamento")
      .delete()
      .eq("origem", "google_sheets");

    if (erroLimpeza) throw new Error(erroLimpeza.message);

    if (vendas.length > 0) {
      const { error: erroInsert } = await supabase
        .from("vendas_acompanhamento")
        .insert(
          vendas.map((venda) => {
            const placa = texto(venda.placa).toUpperCase();
            const preservado = preservaveisPorPlaca.get(placa) || {};

            return {
              ...venda,
              ...preservado,
              criado_por: preservado.criado_por || usuario.id,
              atualizado_por: usuario.id,
              criado_em: preservado.criado_em || agora,
              atualizado_em: agora,
              ultima_sincronizacao: agora,
            };
          }),
        );

      if (erroInsert) throw new Error(erroInsert.message);
    }

    const confirmadas = vendas.filter(
      (venda) => venda.conferencia_status === "confirmado",
    ).length;

    const soAcompanhamento = vendas.filter(
      (venda) => venda.conferencia_status === "so_acompanhamento",
    ).length;

    const soVendidos = vendas.filter(
      (venda) => venda.conferencia_status === "so_vendidos",
    ).length;

    const divergentes = vendas.filter(
      (venda) => venda.conferencia_status === "divergente",
    ).length;

    return NextResponse.json({
      ok: true,
      acompanhamento_placas: acompanhamento.size,
      vendidos_placas: vendidos.size,
      status_correio_placas: statusCorreio.size,
      dados_status_correio_placas: dadosStatusCorreio.size,
      flash_placas: flash.size,
      status_consolidado_placas: statusConsolidado.size,
      total_processadas: vendas.length,
      criadas: vendas.length,
      confirmadas,
      so_acompanhamento: soAcompanhamento,
      so_vendidos: soVendidos,
      divergentes,
      sincronizado_em: agora,
      periodo: filtros,
      regra:
        "A sincronização cruza acompanhamento financeiro, status de proposta, Flash e lista de vendidos para montar a conferência de vendas.",
    });
  } catch (error) {
    await registrarErroSistema({
      modulo: "vendas",
      origem: "sincronizar_google_sheets",
      mensagem:
        error instanceof Error
          ? error.message
          : "Erro na sincronização de vendas.",
      stack: error instanceof Error ? error.stack || null : null,
      metadata: {
        rotina: "sincronizar_vendas",
      },
    });

    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao sincronizar vendas.",
      },
      { status: 500 },
    );
  }
}
