import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function statusLegivel(status: string | null) {
  if (status === "confirmado") return "Venda confirmada";
  if (status === "so_acompanhamento") return "Conferir financeiro";
  if (status === "so_vendidos") return "Conferir estoque";
  if (status === "divergente") return "Divergência";
  return "Pendente";
}

function dataBr(valor: string | null) {
  if (!valor) return "";

  const data = new Date(`${valor}T12:00:00`);

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleDateString("pt-BR");
}

function dinheiro(valor: unknown) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const formato = texto(searchParams.get("formato")) || "xls";
    const status = texto(searchParams.get("status"));
    const validacao = texto(searchParams.get("validacao"));
    const loja = texto(searchParams.get("loja"));
    const busca = texto(searchParams.get("busca"));
    const dataInicio = texto(searchParams.get("data_inicio"));
    const dataFim = texto(searchParams.get("data_fim"));

    let query = supabase
      .from("vendas_acompanhamento")
      .select("*")
      .order("placa", { ascending: true })
      .limit(5000);

    if (validacao && validacao !== "todos") {
      query = query.eq("validacao_status", validacao);
    }

    if (status && status !== "todos") {
      query = query.eq("conferencia_status", status);
    }

    if (loja && loja !== "todas") {
      query = query.eq("loja", loja);
    }

    if (dataInicio) {
      query = query.gte("data_venda", dataInicio);
    }

    if (dataFim) {
      query = query.lte("data_venda", dataFim);
    }

    if (busca) {
      query = query.or(
        [
          `placa.ilike.%${busca}%`,
          `veiculo.ilike.%${busca}%`,
          `cliente.ilike.%${busca}%`,
          `vendedor_nome.ilike.%${busca}%`,
        ].join(","),
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, erro: error.message },
        { status: 500 },
      );
    }

    const vendas = data || [];

    const linhas = vendas.map((venda) => ({
      Placa: venda.placa || "",
      Veículo: venda.veiculo || "",
      Cliente: venda.cliente || "",
      Vendedor: venda.vendedor_nome || "",
      Loja: venda.loja || "",
      "Data venda": dataBr(venda.data_venda),
      Instituição: venda.instituicao || "",
      Status: statusLegivel(venda.conferencia_status),
      "Qtd. registros": venda.total_linhas_acompanhamento || 0,
      "Valor localizado": dinheiro(venda.total_valor_acompanhamento),
    }));

    if (formato === "pdf") {
      const total = vendas.length;
      const confirmadas = vendas.filter(
        (venda) => venda.conferencia_status === "confirmado",
      ).length;
      const financeiro = vendas.filter(
        (venda) => venda.conferencia_status === "so_acompanhamento",
      ).length;
      const estoque = vendas.filter(
        (venda) => venda.conferencia_status === "so_vendidos",
      ).length;
      const divergencias = vendas.filter(
        (venda) => venda.conferencia_status === "divergente",
      ).length;

      const linhasHtml = linhas
        .map(
          (linha) => `
            <tr>
              <td>${linha.Placa}</td>
              <td>${linha.Veículo}</td>
              <td>${linha.Cliente}</td>
              <td>${linha.Vendedor}</td>
              <td>${linha.Loja}</td>
              <td>${linha["Data venda"]}</td>
              <td>${linha.Status}</td>
              <td>${linha["Valor localizado"]}</td>
            </tr>
          `,
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>Relatório de Vendas</title>
            <style>
              * { box-sizing: border-box; }
              body {
                font-family: Arial, sans-serif;
                color: #0f172a;
                margin: 32px;
                background: #fff;
              }
              .topo {
                border-bottom: 3px solid #1d4ed8;
                padding-bottom: 18px;
                margin-bottom: 22px;
              }
              .eyebrow {
                color: #1d4ed8;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 4px;
                text-transform: uppercase;
              }
              h1 {
                margin: 8px 0 6px;
                font-size: 28px;
              }
              .sub {
                color: #475569;
                font-size: 13px;
                font-weight: 700;
              }
              .cards {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 10px;
                margin: 20px 0;
              }
              .card {
                border: 1px solid #dbe3ef;
                border-radius: 14px;
                padding: 12px;
                background: #f8fafc;
              }
              .card span {
                display: block;
                color: #64748b;
                font-size: 10px;
                font-weight: 900;
                text-transform: uppercase;
              }
              .card strong {
                display: block;
                margin-top: 6px;
                font-size: 24px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 18px;
                font-size: 11px;
              }
              th {
                background: #0f172a;
                color: white;
                text-align: left;
                padding: 9px;
              }
              td {
                border-bottom: 1px solid #e2e8f0;
                padding: 8px;
                vertical-align: top;
              }
              tr:nth-child(even) td {
                background: #f8fafc;
              }
              @media print {
                body { margin: 18px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:10px 16px;border:0;border-radius:12px;background:#1d4ed8;color:white;font-weight:900;cursor:pointer;">
              Imprimir / Salvar PDF
            </button>

            <div class="topo">
              <div class="eyebrow">Flow Sales CRM</div>
              <h1>Relatório de Vendas</h1>
              <div class="sub">Conferência comercial de vendas — ${new Date().toLocaleString("pt-BR")}</div>
            </div>

            <div class="cards">
              <div class="card"><span>Total</span><strong>${total}</strong></div>
              <div class="card"><span>Confirmadas</span><strong>${confirmadas}</strong></div>
              <div class="card"><span>Financeiro</span><strong>${financeiro}</strong></div>
              <div class="card"><span>Estoque</span><strong>${estoque}</strong></div>
              <div class="card"><span>Divergências</span><strong>${divergencias}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Veículo</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Loja</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${linhasHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(linhas);

    XLSX.utils.book_append_sheet(workbook, sheet, "Vendas");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio-vendas.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error ? error.message : "Erro ao gerar relatório.",
      },
      { status: 500 },
    );
  }
}
