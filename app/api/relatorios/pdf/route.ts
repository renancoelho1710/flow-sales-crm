import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AnyRecord = Record<string, any>;

type Filtros = {
  inicio: string;
  fim: string;
  usuarioId: string;
  loja: string;
  origem: string;
  tipo: string;
  aba: string;
  orientacao: "paisagem" | "vertical";
  inicioIso: string;
  fimIso: string;
};

type DadosRelatorio = {
  filtros: Filtros;
  usuarioInterno: AnyRecord;
  resumo: Record<string, number>;
  porUsuario: AnyRecord[];
  porLoja: AnyRecord[];
  porVendedor: AnyRecord[];
  importacoes: AnyRecord[];
  fontes: Record<string, boolean>;
};

const AZUL_ESCURO = rgb(0.025, 0.08, 0.20);
const AZUL = rgb(0.05, 0.22, 0.58);
const AZUL_MEDIO = rgb(0.08, 0.32, 0.82);
const AZUL_CLARO = rgb(0.90, 0.95, 1);
const CINZA_TEXTO = rgb(0.10, 0.13, 0.20);
const CINZA = rgb(0.42, 0.48, 0.58);
const BORDA = rgb(0.82, 0.87, 0.94);
const FUNDO_SUAVE = rgb(0.97, 0.985, 1);
const BRANCO = rgb(1, 1, 1);
const VERDE = rgb(0.03, 0.50, 0.26);
const LARANJA = rgb(0.82, 0.35, 0.04);

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "suporte", "gerente", "supervisor"].includes(String(perfil || "").toLowerCase());
}

function normalizar(valor?: string | null) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filtrosDaUrl(request: Request): Filtros {
  const url = new URL(request.url);
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicio = String(url.searchParams.get("inicio") || primeiroDia.toISOString().slice(0, 10));
  const fim = String(url.searchParams.get("fim") || hoje.toISOString().slice(0, 10));
  const orientacaoParam = String(url.searchParams.get("orientacao") || "paisagem").toLowerCase();
  const abaParam = String(url.searchParams.get("aba") || "geral").toLowerCase();

  return {
    inicio,
    fim,
    usuarioId: String(url.searchParams.get("usuario_id") || "todos"),
    loja: String(url.searchParams.get("loja") || "todas"),
    origem: String(url.searchParams.get("origem") || "todas"),
    tipo: String(url.searchParams.get("tipo") || "detalhado"),
    aba: abaParam === "colaboradores" || abaParam === "unidades" ? "colaboradores" : abaParam === "equipe" ? "equipe" : "geral",
    orientacao: orientacaoParam === "vertical" ? "vertical" : "paisagem",
    inicioIso: new Date(`${inicio}T00:00:00.000`).toISOString(),
    fimIso: new Date(`${fim}T23:59:59.999`).toISOString(),
  };
}

async function safeSelect(supabase: any, table: string, select: string, apply?: (query: any) => any) {
  try {
    let query = supabase.from(table).select(select);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

function minutosEntre(inicio?: string | null, fim?: string | null) {
  if (!inicio || !fim) return 0;
  const diff = new Date(fim).getTime() - new Date(inicio).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function segundos(valor?: number) {
  const v = Number(valor || 0);
  const m = Math.floor(v / 60);
  const s = v % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function dataBR(valor: string) {
  if (!valor) return "-";
  const [a, m, d] = valor.split("-");
  return `${d}/${m}/${a}`;
}

function dataHoraBR(data = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function dataArquivo(data = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  })
    .format(data)
    .replace(/\//g, "-");
}

function labelTipo(tipo: string) {
  const valor = normalizar(tipo);
  if (valor === "simples") return "Simples";
  if (valor === "personalizado") return "Personalizado";
  return "Detalhado";
}

function scoreLabel(valor: number) {
  if (valor >= 80) return "Excelente";
  if (valor >= 55) return "Adequado";
  if (valor >= 30) return "Atenção";
  return "Crítico";
}

function nomeSeguro(valor?: string | null, fallback = "Não informado") {
  const texto = textoSeguro(valor);
  return texto && texto !== "-" ? texto : fallback;
}

function chaveLoja(item?: string | null) {
  return nomeSeguro(item, "Sem loja/carteira");
}

function chaveVendedor(item?: string | null) {
  return nomeSeguro(item, "Sem vendedor C2S");
}

function textoSeguro(texto?: string | number | null) {
  return String(texto ?? "-")
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
}

function cortar(texto: string, max: number) {
  const limpo = textoSeguro(texto);
  return limpo.length > max ? `${limpo.slice(0, Math.max(0, max - 3))}...` : limpo;
}

function wrapTexto(texto: string, font: PDFFont, size: number, maxWidth: number) {
  const words = textoSeguro(texto).split(" ");
  const linhas: string[] = [];
  let linha = "";

  for (const word of words) {
    const tentativa = linha ? `${linha} ${word}` : word;
    if (font.widthOfTextAtSize(tentativa, size) > maxWidth && linha) {
      linhas.push(linha);
      linha = word;
    } else {
      linha = tentativa;
    }
  }

  if (linha) linhas.push(linha);
  return linhas.length ? linhas : [""];
}

function carregarLogoBytes() {
  const caminhos = [
    join(process.cwd(), "public", "logo-slogan.png"),
    join(process.cwd(), "public", "logo-slogan.PNG"),
  ];

  const caminho = caminhos.find((item) => existsSync(item));
  if (!caminho) return null;
  return readFileSync(caminho);
}

class RelatorioPdf {
  private page!: PDFPage;
  private y = 0;
  private pageNo = 0;
  private width: number;
  private height: number;
  private margin = 42;

  constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
    private logo: PDFImage | null,
    private titulo: string,
    private geradoEm: string,
    private orientacao: "paisagem" | "vertical"
  ) {
    this.width = orientacao === "vertical" ? 595.28 : 841.89;
    this.height = orientacao === "vertical" ? 841.89 : 595.28;
    this.novaPagina();
  }

  private corHex(hex: string) {
    const limpa = hex.replace("#", "");
    const r = parseInt(limpa.slice(0, 2), 16) / 255;
    const g = parseInt(limpa.slice(2, 4), 16) / 255;
    const b = parseInt(limpa.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  }

  private texto(text: string, x: number, y: number, size = 10, font: PDFFont = this.regular, color: RGB = CINZA_TEXTO) {
    this.page.drawText(textoSeguro(text), { x, y, size, font, color });
  }

  private rodape() {
    this.texto("Flow Sales CRM | Relatório gerencial | Documento gerado automaticamente", this.margin, 24, 8, this.regular, CINZA);
    this.texto(`Página ${this.pageNo}`, this.width - this.margin - 45, 24, 8, this.regular, CINZA);
  }

  private cabecalho() {
    this.page.drawRectangle({ x: 0, y: this.height - 90, width: this.width, height: 90, color: AZUL_ESCURO });

    // Faixa em degradê simulado: área clara atrás da logo e transição bem suave para o azul escuro.
    const faixaW = this.orientacao === "vertical" ? 380 : 470;
    const areaClara = this.orientacao === "vertical" ? 210 : 270;
    const passos = 96;
    const passoW = faixaW / passos;

    for (let i = 0; i < passos; i++) {
      const x = passoW * i;
      const raw = Math.max(0, Math.min(1, (x - areaClara) / (faixaW - areaClara)));
      const t = raw * raw * (3 - 2 * raw);
      const luz = Math.min(1, x / areaClara);

      const rInicial = 0.90 - 0.06 * luz;
      const gInicial = 0.96 - 0.05 * luz;
      const bInicial = 1.00;

      const r = rInicial * (1 - t) + 0.025 * t;
      const g = gInicial * (1 - t) + 0.08 * t;
      const b = bInicial * (1 - t) + 0.20 * t;

      this.page.drawRectangle({
        x,
        y: this.height - 90,
        width: passoW + 0.4,
        height: 90,
        color: rgb(r, g, b),
      });
    }

    let textX = this.margin;
    if (this.logo) {
      const maxW = this.orientacao === "vertical" ? 180 : 205;
      const maxH = 50;
      const ratio = this.logo.width / this.logo.height;
      const w = Math.min(maxW, maxH * ratio);
      const h = w / ratio;
      this.page.drawImage(this.logo, { x: this.margin, y: this.height - 70, width: w, height: h });
      textX = this.margin + w + 34;
    } else {
      this.page.drawRectangle({ x: this.margin, y: this.height - 65, width: 42, height: 38, color: AZUL_MEDIO, borderColor: rgb(0.18, 0.45, 1), borderWidth: 0.6 });
      this.texto("F", this.margin + 15, this.height - 43, 20, this.bold, BRANCO);
      this.texto("Flow Sales CRM", this.margin + 55, this.height - 43, 17, this.bold, BRANCO);
      textX = this.margin + 205;
    }

    const infoRight = this.width - this.margin - 8;
    const tituloHeader = this.titulo;
    const geradoHeader = `Gerado em ${this.geradoEm}`;

    this.texto(
      tituloHeader,
      infoRight - this.regular.widthOfTextAtSize(tituloHeader, 10),
      this.height - 39,
      10,
      this.regular,
      rgb(0.78, 0.89, 1)
    );

    this.texto(
      geradoHeader,
      infoRight - this.regular.widthOfTextAtSize(geradoHeader, 8.5),
      this.height - 55,
      8.5,
      this.regular,
      rgb(0.78, 0.89, 1)
    );

    this.y = this.height - 120;
  }

  novaPagina() {
    if (this.page) this.rodape();
    this.page = this.doc.addPage([this.width, this.height]);
    this.pageNo++;
    this.cabecalho();
  }

  private garantir(altura: number) {
    if (this.y - altura < 60) this.novaPagina();
  }

  tituloSecao(texto: string) {
    this.garantir(34);
    this.texto(texto, this.margin, this.y, 16, this.bold, AZUL);
    this.page.drawRectangle({ x: this.margin, y: this.y - 8, width: 48, height: 2.2, color: AZUL_MEDIO });
    this.y -= 28;
  }

  paragrafo(texto: string, maxWidth = this.width - this.margin * 2, size = 9.5, color: RGB = CINZA_TEXTO) {
    const linhas = wrapTexto(texto, this.regular, size, maxWidth);
    this.garantir(linhas.length * 13 + 8);
    for (const linha of linhas) {
      this.texto(linha, this.margin, this.y, size, this.regular, color);
      this.y -= 13;
    }
    this.y -= 5;
  }

  blocoMetadados(items: Array<{ label: string; value: string }>) {
    const h = this.orientacao === "vertical" ? 112 : 72;
    this.garantir(h + 18);
    const x = this.margin;
    const y = this.y - h;
    const w = this.width - this.margin * 2;
    this.page.drawRectangle({ x, y, width: w, height: h, color: AZUL_CLARO, borderColor: rgb(0.69, 0.79, 0.95), borderWidth: 0.7 });

    const cols = this.orientacao === "vertical" ? 2 : 5;
    const colW = w / cols;
    items.forEach((item, index) => {
      const cx = x + (index % cols) * colW + 14;
      const cy = y + h - 24 - Math.floor(index / cols) * 38;
      this.texto(item.label.toUpperCase(), cx, cy, 7.2, this.bold, rgb(0.22, 0.34, 0.58));
      this.texto(cortar(item.value, Math.floor(colW / 5.4)), cx, cy - 15, 10, this.bold, AZUL_ESCURO);
    });
    this.y = y - 20;
  }

  resumoNarrativo(titulo: string, texto: string, bullets: string[]) {
    const maxWidth = this.width - this.margin * 2 - 28;
    const linhas = wrapTexto(texto, this.regular, 9.2, maxWidth);
    const bulletLinhas = bullets.flatMap((item) => wrapTexto(`- ${item}`, this.regular, 8.8, maxWidth));
    const h = 42 + linhas.length * 12 + bulletLinhas.length * 11;
    this.garantir(h + 14);
    const x = this.margin;
    const y = this.y - h;
    const w = this.width - this.margin * 2;
    this.page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.96, 0.985, 1), borderColor: rgb(0.72, 0.82, 0.97), borderWidth: 0.8 });
    this.texto(titulo, x + 14, y + h - 22, 12, this.bold, AZUL);
    let yy = y + h - 40;
    linhas.forEach((linha) => {
      this.texto(linha, x + 14, yy, 9.2, this.regular, CINZA_TEXTO);
      yy -= 12;
    });
    yy -= 3;
    bulletLinhas.forEach((linha) => {
      this.texto(linha, x + 14, yy, 8.8, this.regular, CINZA_TEXTO);
      yy -= 11;
    });
    this.y = y - 18;
  }

  kpiGrid(items: Array<{ label: string; value: string; note: string; tone?: "blue" | "green" | "orange" | "red" }>) {
    const cols = this.orientacao === "vertical" ? 2 : 4;
    const gap = 10;
    const cardW = (this.width - this.margin * 2 - gap * (cols - 1)) / cols;
    const cardH = 68;
    const rows = Math.ceil(items.length / cols);
    this.garantir(rows * (cardH + gap) + 12);

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = this.margin + col * (cardW + gap);
      const y = this.y - cardH - row * (cardH + gap);
      const color = item.tone === "green" ? rgb(0.91, 0.98, 0.94) : item.tone === "orange" ? rgb(1, 0.96, 0.90) : item.tone === "red" ? rgb(1, 0.93, 0.93) : rgb(0.94, 0.97, 1);
      const accent = item.tone === "green" ? VERDE : item.tone === "orange" ? LARANJA : item.tone === "red" ? rgb(0.78, 0.10, 0.10) : AZUL_MEDIO;
      this.page.drawRectangle({ x, y, width: cardW, height: cardH, color, borderColor: BORDA, borderWidth: 0.6 });
      this.page.drawRectangle({ x, y, width: 4, height: cardH, color: accent });
      this.texto(item.label.toUpperCase(), x + 13, y + cardH - 18, 7, this.bold, CINZA);
      this.texto(item.value, x + 13, y + 27, 19, this.bold, AZUL_ESCURO);
      this.texto(cortar(item.note, Math.floor(cardW / 5.4)), x + 13, y + 12, 7.3, this.regular, CINZA);
    });

    this.y -= rows * (cardH + gap) + 12;
  }

  tabela(headers: string[], rows: string[][], widths: number[], titulo?: string) {
    if (titulo) this.tituloSecao(titulo);
    const rowH = 21;
    const tableW = widths.reduce((acc, value) => acc + value, 0);
    this.garantir(45 + Math.min(rows.length, 5) * rowH);

    const drawHeader = () => {
      this.page.drawRectangle({ x: this.margin, y: this.y - rowH + 4, width: tableW, height: rowH, color: AZUL });
      let x = this.margin;
      headers.forEach((header, index) => {
        this.texto(cortar(header, 20), x + 5, this.y - 10, 7.5, this.bold, BRANCO);
        x += widths[index];
      });
      this.y -= rowH;
    };

    drawHeader();
    rows.forEach((row, rowIndex) => {
      if (this.y - rowH < 62) {
        this.novaPagina();
        drawHeader();
      }
      const bg = rowIndex % 2 === 0 ? FUNDO_SUAVE : BRANCO;
      this.page.drawRectangle({ x: this.margin, y: this.y - rowH + 4, width: tableW, height: rowH, color: bg });
      let x = this.margin;
      row.forEach((cell, index) => {
        this.texto(cortar(cell, Math.floor(widths[index] / 4.9)), x + 5, this.y - 10, 7.4, this.regular, CINZA_TEXTO);
        x += widths[index];
      });
      this.y -= rowH;
    });
    this.y -= 14;
  }

  finalizar() {
    this.rodape();
  }
}

async function montarDados(request: Request): Promise<DadosRelatorio> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuarioInterno) throw new Error("Usuário interno não localizado.");

  const filtros = filtrosDaUrl(request);
  const gestao = perfilGestao(usuarioInterno.perfil);
  const usuarioFiltro = !gestao ? usuarioInterno.id : filtros.usuarioId;

  const usuariosResp = await safeSelect(supabase, "usuarios_internos", "id, nome, email, perfil, ativo, recebe_leads, status_operacional, status_administrativo", (q) => q.eq("ativo", true).order("nome", { ascending: true }));
  const usuarios = usuariosResp.data as AnyRecord[];

  const leadsResp = await safeSelect(supabase, "leads", "id, nome, origem, etapa, responsavel_id, atendente_resgate_id, vendedor_c2s_nome, loja_carteira_c2s_nome, loja_visita_nome, arquivado, venda_pendente_validacao, venda_validada, criado_em, data_primeiro_contato", (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(8000));
  let leads = leadsResp.data as AnyRecord[];
  if (usuarioFiltro !== "todos") leads = leads.filter((lead) => lead.responsavel_id === usuarioFiltro || lead.atendente_resgate_id === usuarioFiltro);
  if (filtros.loja !== "todas") leads = leads.filter((lead) => normalizar(lead.loja_carteira_c2s_nome || lead.loja_visita_nome) === normalizar(filtros.loja));
  if (filtros.origem !== "todas") leads = leads.filter((lead) => normalizar(lead.origem) === normalizar(filtros.origem));

  const leadIds = leads.map((lead) => lead.id);
  const interacoesResp = leadIds.length ? await safeSelect(supabase, "lead_interacoes", "id, lead_id, usuario_id, tipo, canal, resultado, criado_em", (q) => q.in("lead_id", leadIds).gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(15000)) : { data: [], error: null };
  let interacoes = interacoesResp.data as AnyRecord[];
  if (usuarioFiltro !== "todos") interacoes = interacoes.filter((item) => item.usuario_id === usuarioFiltro);

  const agendamentosResp = await safeSelect(supabase, "lead_agendamentos", "id, lead_id, usuario_id, criado_por, inicio, fim, status, loja_carteira_c2s_nome, loja_visita_nome, criado_em", (q) => q.gte("inicio", filtros.inicioIso).lte("inicio", filtros.fimIso).limit(10000));
  let agendamentos = agendamentosResp.data as AnyRecord[];
  if (usuarioFiltro !== "todos") agendamentos = agendamentos.filter((item) => item.usuario_id === usuarioFiltro || item.criado_por === usuarioFiltro);

  const ligacoesResp = await safeSelect(supabase, "ligacoes_3cx", "id, usuario_id, colaborador_id, operador_id, nome_operador, duracao_segundos, tempo_atendimento_segundos, criado_em", (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(20000));
  let ligacoes = ligacoesResp.data as AnyRecord[];
  if (usuarioFiltro !== "todos") ligacoes = ligacoes.filter((item) => item.usuario_id === usuarioFiltro || item.colaborador_id === usuarioFiltro || item.operador_id === usuarioFiltro);

  const whatsappConversasResp = await safeSelect(supabase, "whatsapp_conversas", "id, usuario_id, atendente_id, operador_id, criado_em", (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(15000));
  const whatsappMensagensResp = await safeSelect(supabase, "whatsapp_mensagens", "id, conversa_id, usuario_id, atendente_id, operador_id, direcao, criado_em", (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(30000));
  let whatsappConversas = whatsappConversasResp.data as AnyRecord[];
  let whatsappMensagens = whatsappMensagensResp.data as AnyRecord[];
  if (usuarioFiltro !== "todos") {
    whatsappConversas = whatsappConversas.filter((item) => item.usuario_id === usuarioFiltro || item.atendente_id === usuarioFiltro || item.operador_id === usuarioFiltro);
    whatsappMensagens = whatsappMensagens.filter((item) => item.usuario_id === usuarioFiltro || item.atendente_id === usuarioFiltro || item.operador_id === usuarioFiltro);
  }

  const statusResp = await safeSelect(supabase, "usuarios_status_historico", "id, usuario_id, status_anterior, status_novo, motivo, criado_em, encerrado_em", (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).limit(15000));
  let statusHistorico = statusResp.data as AnyRecord[];
  if (usuarioFiltro !== "todos") statusHistorico = statusHistorico.filter((item) => item.usuario_id === usuarioFiltro);

  const importacoesResp = await safeSelect(supabase, "importacoes_c2s", "id, usuario_id, total_recebidos, total_importados, total_atualizados, total_sem_telefone, status, observacao, criado_em", (q) => q.gte("criado_em", filtros.inicioIso).lte("criado_em", filtros.fimIso).order("criado_em", { ascending: false }).limit(100));

  const ligacoesFallback = interacoes.filter((item) => ["telefone", "ligacao", "3cx"].includes(normalizar(item.canal)) || ["telefone", "ligacao"].includes(normalizar(item.tipo)));
  const whatsappFallback = interacoes.filter((item) => normalizar(item.canal) === "whatsapp" || normalizar(item.tipo) === "whatsapp");
  const totalLigacoes = ligacoes.length || ligacoesFallback.length;
  const duracao = ligacoes.reduce((total, item) => total + Number(item.duracao_segundos || item.tempo_atendimento_segundos || 0), 0);
  const tma = totalLigacoes && duracao ? Math.round(duracao / totalLigacoes) : 0;
  const pausasMinutos = statusHistorico.reduce((total, item) => {
    const status = normalizar(item.status_novo || item.motivo);
    if (!status.includes("pausa") && !status.includes("offline") && !status.includes("ocupado")) return total;
    return total + minutosEntre(item.criado_em, item.encerrado_em || new Date().toISOString());
  }, 0);

  const resumo = {
    leads_recebidos: leads.length,
    leads_trabalhados: new Set(interacoes.map((item) => item.lead_id)).size,
    leads_sem_contato: leads.filter((lead) => !lead.data_primeiro_contato).length,
    leads_arquivados: leads.filter((lead) => Boolean(lead.arquivado)).length,
    agendamentos: agendamentos.length,
    vendas_pendentes: leads.filter((lead) => Boolean(lead.venda_pendente_validacao)).length,
    vendas_confirmadas: leads.filter((lead) => Boolean(lead.venda_validada)).length,
    ligacoes: totalLigacoes,
    ligacoes_validas: ligacoes.length ? ligacoes.filter((item) => Number(item.duracao_segundos || item.tempo_atendimento_segundos || 0) >= 20).length : ligacoesFallback.length,
    tma_segundos: tma,
    whatsapp_conversas: whatsappConversas.length,
    whatsapp_mensagens: whatsappMensagens.length || whatsappFallback.length,
    pausas_minutos: pausasMinutos,
    conversao_agendamento: leads.length ? Math.round((agendamentos.length / leads.length) * 1000) / 10 : 0,
    conversao_venda: leads.length ? Math.round((leads.filter((lead) => Boolean(lead.venda_validada)).length / leads.length) * 1000) / 10 : 0,
  };

  const porUsuario = usuarios.map((usuario) => {
    const userLeads = leads.filter((lead) => lead.responsavel_id === usuario.id || lead.atendente_resgate_id === usuario.id);
    const userInteracoes = interacoes.filter((item) => item.usuario_id === usuario.id);
    const userAgendamentos = agendamentos.filter((item) => item.usuario_id === usuario.id || item.criado_por === usuario.id);
    const userLigacoes = ligacoes.filter((item) => item.usuario_id === usuario.id || item.colaborador_id === usuario.id || item.operador_id === usuario.id);
    const userWppConv = whatsappConversas.filter((item) => item.usuario_id === usuario.id || item.atendente_id === usuario.id || item.operador_id === usuario.id);
    const userWppMsg = whatsappMensagens.filter((item) => item.usuario_id === usuario.id || item.atendente_id === usuario.id || item.operador_id === usuario.id);
    const userStatus = statusHistorico.filter((item) => item.usuario_id === usuario.id);
    const userDuracao = userLigacoes.reduce((total, item) => total + Number(item.duracao_segundos || item.tempo_atendimento_segundos || 0), 0);
    const userTma = userLigacoes.length && userDuracao ? Math.round(userDuracao / userLigacoes.length) : 0;
    const userPausas = userStatus.reduce((total, item) => {
      const status = normalizar(item.status_novo || item.motivo);
      if (!status.includes("pausa") && !status.includes("offline") && !status.includes("ocupado")) return total;
      return total + minutosEntre(item.criado_em, item.encerrado_em || new Date().toISOString());
    }, 0);

    return {
      id: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
      status_operacional: usuario.status_operacional,
      leads: userLeads.length,
      leads_trabalhados: new Set(userInteracoes.map((item) => item.lead_id)).size,
      ligacoes: userLigacoes.length || userInteracoes.filter((item) => ["telefone", "ligacao", "3cx"].includes(normalizar(item.canal))).length,
      ligacoes_validas: userLigacoes.length ? userLigacoes.filter((item) => Number(item.duracao_segundos || item.tempo_atendimento_segundos || 0) >= 20).length : userInteracoes.filter((item) => ["telefone", "ligacao", "3cx"].includes(normalizar(item.canal))).length,
      tma_segundos: userTma,
      whatsapp_conversas: userWppConv.length,
      whatsapp_mensagens: userWppMsg.length || userInteracoes.filter((item) => normalizar(item.canal) === "whatsapp").length,
      agendamentos: userAgendamentos.length,
      vendas_confirmadas: userLeads.filter((lead) => Boolean(lead.venda_validada)).length,
      pausas_minutos: userPausas,
      produtividade_score: userLeads.length + userAgendamentos.length * 3 + userLigacoes.length + userWppMsg.length,
    };
  }).filter((usuario) => usuario.leads || usuario.ligacoes || usuario.whatsapp_mensagens || usuario.agendamentos || usuario.vendas_confirmadas || usuario.id === usuarioFiltro);

  const agendamentosPorLead = new Map<string, AnyRecord[]>();
  for (const agendamento of agendamentos) {
    const id = String(agendamento.lead_id || "");
    if (!id) continue;
    if (!agendamentosPorLead.has(id)) agendamentosPorLead.set(id, []);
    agendamentosPorLead.get(id)?.push(agendamento);
  }

  const lojasMap = new Map<string, AnyRecord>();
  function lojaRegistro(nome: string) {
    const chave = chaveLoja(nome);
    if (!lojasMap.has(chave)) lojasMap.set(chave, { loja: chave, leads: 0, agendamentos: 0, vendas: 0, sem_contato: 0, perdas: 0, conversao_agendamento: 0, conversao_venda: 0 });
    return lojasMap.get(chave)!;
  }

  for (const lead of leads) {
    const nomeLoja = chaveLoja(lead.loja_visita_nome || lead.loja_carteira_c2s_nome);
    const item = lojaRegistro(nomeLoja);
    item.leads += 1;
    if (!lead.data_primeiro_contato) item.sem_contato += 1;
    if (lead.arquivado) item.perdas += 1;
    if (lead.venda_validada) item.vendas += 1;
    item.agendamentos += agendamentosPorLead.get(lead.id)?.length || 0;
  }

  for (const agendamento of agendamentos) {
    if (agendamento.lead_id && leads.some((lead) => lead.id === agendamento.lead_id)) continue;
    const item = lojaRegistro(agendamento.loja_visita_nome || agendamento.loja_carteira_c2s_nome);
    item.agendamentos += 1;
  }

  const porLoja: AnyRecord[] = Array.from(lojasMap.values())
    .map((item: AnyRecord) => ({
      ...item,
      conversao_agendamento: item.leads ? Math.round((item.agendamentos / item.leads) * 1000) / 10 : 0,
      conversao_venda: item.leads ? Math.round((item.vendas / item.leads) * 1000) / 10 : 0,
    }))
    .sort((a: AnyRecord, b: AnyRecord) => Number(b.agendamentos || 0) - Number(a.agendamentos || 0));

  const vendedoresMap = new Map<string, AnyRecord>();
  function vendedorRegistro(nome: string) {
    const chave = chaveVendedor(nome);
    if (!vendedoresMap.has(chave)) vendedoresMap.set(chave, { vendedor: chave, leads: 0, agendamentos: 0, vendas: 0, sem_contato: 0, perdas: 0, agendas_sem_venda: 0, conversao_agendamento: 0, conversao_venda: 0 });
    return vendedoresMap.get(chave)!;
  }

  for (const lead of leads) {
    const item = vendedorRegistro(lead.vendedor_c2s_nome);
    const ags = agendamentosPorLead.get(lead.id)?.length || 0;
    item.leads += 1;
    item.agendamentos += ags;
    if (!lead.data_primeiro_contato) item.sem_contato += 1;
    if (lead.arquivado) item.perdas += 1;
    if (lead.venda_validada) item.vendas += 1;
    if (ags > 0 && !lead.venda_validada) item.agendas_sem_venda += ags;
  }

  const porVendedor: AnyRecord[] = Array.from(vendedoresMap.values())
    .map((item: AnyRecord) => ({
      ...item,
      conversao_agendamento: item.leads ? Math.round((item.agendamentos / item.leads) * 1000) / 10 : 0,
      conversao_venda: item.leads ? Math.round((item.vendas / item.leads) * 1000) / 10 : 0,
    }))
    .sort(
      (a: AnyRecord, b: AnyRecord) =>
        Number(b.vendas || 0) - Number(a.vendas || 0) ||
        Number(b.agendamentos || 0) - Number(a.agendamentos || 0)
    );

  return {
    filtros,
    usuarioInterno,
    resumo,
    porUsuario,
    porLoja,
    porVendedor,
    importacoes: importacoesResp.data as AnyRecord[],
    fontes: {
      ligacoes_3cx: !ligacoesResp.error,
      whatsapp_conversas: !whatsappConversasResp.error,
      whatsapp_mensagens: !whatsappMensagensResp.error,
      status_historico: !statusResp.error,
    },
  };
}

function resumoExecutivo(dados: DadosRelatorio) {
  const r = dados.resumo;
  const totalConversas = r.whatsapp_conversas || 0;
  const texto = `No período analisado, o Flow Sales CRM registrou ${r.leads_recebidos || 0} lead(s), ${r.leads_trabalhados || 0} lead(s) com interação, ${r.agendamentos || 0} agendamento(s) e ${r.vendas_confirmadas || 0} venda(s) confirmada(s). A leitura executiva abaixo separa atividade operacional, conversão e pontos de risco sem estimar resultado financeiro que ainda não esteja registrado no CRM.`;
  const bullets = [
    `${r.leads_sem_contato || 0} lead(s) sem primeiro contato identificado.`,
    `Conversão para agendamento: ${r.conversao_agendamento || 0}%. Conversão para venda confirmada: ${r.conversao_venda || 0}%.`,
    `${r.ligacoes || 0} ligação(ões), ${r.ligacoes_validas || 0} válida(s), TMA de ${segundos(r.tma_segundos)}.`,
    totalConversas ? `${totalConversas} conversa(s) e ${r.whatsapp_mensagens || 0} mensagem(ns) registradas no WhatsApp.` : "WhatsApp sem conversas detalhadas no período; verificar conector antes de usar este indicador em decisão.",
  ];
  return { texto, bullets };
}

function planoAcao(dados: DadosRelatorio) {
  const r = dados.resumo;
  const acoes: string[] = [];
  const lojas = dados.porLoja || [];
  const vendedores = dados.porVendedor || [];
  const operadores = dados.porUsuario || [];
  const lojaMaisAgenda = [...lojas].sort((a, b) => Number(b.agendamentos || 0) - Number(a.agendamentos || 0))[0];
  const lojaMenorAproveitamento = [...lojas].filter((l) => Number(l.leads || 0) > 0).sort((a, b) => Number(a.conversao_agendamento || 0) - Number(b.conversao_agendamento || 0))[0];
  const vendedorMaisVendeu = [...vendedores].sort((a, b) => Number(b.vendas || 0) - Number(a.vendas || 0))[0];
  const vendedorMaisPerdeuAgenda = [...vendedores].sort((a, b) => Number(b.agendas_sem_venda || 0) - Number(a.agendas_sem_venda || 0))[0];
  const operadorMaisAgendou = [...operadores].sort((a, b) => Number(b.agendamentos || 0) - Number(a.agendamentos || 0))[0];
  const operadorMenosAgendou = [...operadores].filter((o) => Number(o.leads || 0) > 0 || Number(o.ligacoes || 0) > 0 || Number(o.whatsapp_mensagens || 0) > 0).sort((a, b) => Number(a.agendamentos || 0) - Number(b.agendamentos || 0))[0];

  if ((r.leads_sem_contato || 0) > 0) acoes.push(`Reduzir o volume de ${r.leads_sem_contato} lead(s) sem primeiro contato, priorizando fila de resposta rápida e cobrança de SLA por operador.`);
  if ((r.conversao_agendamento || 0) === 0 && (r.leads_recebidos || 0) > 0) acoes.push("Revisar abordagem de conversão para agendamento: houve entrada de leads sem geração de agenda no período.");
  if (lojaMaisAgenda) acoes.push(`Manter e replicar o padrão da loja/carteira com maior volume de agenda: ${lojaMaisAgenda.loja} (${lojaMaisAgenda.agendamentos} agendamento(s)).`);
  if (lojaMenorAproveitamento) acoes.push(`Acompanhar loja/carteira com menor aproveitamento de agendamento: ${lojaMenorAproveitamento.loja} (${lojaMenorAproveitamento.conversao_agendamento}% de conversão para agenda).`);
  if (vendedorMaisVendeu && Number(vendedorMaisVendeu.vendas || 0) > 0) acoes.push(`Usar ${vendedorMaisVendeu.vendedor} como referência de fechamento no período (${vendedorMaisVendeu.vendas} venda(s) confirmada(s)).`);
  if (vendedorMaisPerdeuAgenda && Number(vendedorMaisPerdeuAgenda.agendas_sem_venda || 0) > 0) acoes.push(`Revisar agendas sem venda do vendedor ${vendedorMaisPerdeuAgenda.vendedor} (${vendedorMaisPerdeuAgenda.agendas_sem_venda} agenda(s) ainda sem conversão registrada).`);
  if (operadorMaisAgendou) acoes.push(`Reconhecer e estudar a rotina do operador que mais agendou: ${operadorMaisAgendou.nome} (${operadorMaisAgendou.agendamentos} agendamento(s)).`);
  if (operadorMenosAgendou) acoes.push(`Apoiar operador com menor geração de agenda no período: ${operadorMenosAgendou.nome} (${operadorMenosAgendou.agendamentos} agendamento(s)).`);
  if (!dados.fontes.whatsapp_conversas || !dados.fontes.whatsapp_mensagens) acoes.push("Validar se o conector WhatsApp está ativo e sincronizando conversas/mensagens antes de usar WhatsApp como indicador final de produtividade.");
  if (!dados.fontes.ligacoes_3cx) acoes.push("Validar alimentação das ligações 3CX para leitura completa de tentativas, ligações válidas, perdidas e TMA.");
  if (!acoes.length) acoes.push("Manter acompanhamento de produtividade, conversão, lojas/carteiras e qualidade dos dados nas próximas reuniões.");
  return acoes;
}

async function montarPdf(dados: DadosRelatorio) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;

  const logoBytes = carregarLogoBytes();
  if (logoBytes) {
    try {
      logo = await doc.embedPng(logoBytes);
    } catch {
      logo = null;
    }
  }

  const geradoEm = dataHoraBR();
  const pdf = new RelatorioPdf(doc, regular, bold, logo, "Relatório gerencial Flow Sales CRM", geradoEm, dados.filtros.orientacao);
  const tipo = labelTipo(dados.filtros.tipo);
  pdf.tituloSecao("Relatório gerencial de performance comercial");
  pdf.blocoMetadados([
    { label: "Período", value: `${dataBR(dados.filtros.inicio)} a ${dataBR(dados.filtros.fim)}` },
    { label: "Gerado em", value: geradoEm },
    { label: "Tipo", value: tipo },
    { label: "Visão", value: dados.filtros.aba === "colaboradores" ? "Colaboradores" : dados.filtros.aba === "equipe" ? "Equipe" : "Geral" },
  ]);

  const resumo = resumoExecutivo(dados);
  pdf.resumoNarrativo("Leitura executiva", resumo.texto, resumo.bullets);

  pdf.tituloSecao("Indicadores principais");
  pdf.kpiGrid([
    { label: "Leads recebidos", value: String(dados.resumo.leads_recebidos || 0), note: "Entrada no período", tone: "blue" },
    { label: "Leads trabalhados", value: String(dados.resumo.leads_trabalhados || 0), note: "Com interação", tone: "green" },
    { label: "Sem contato", value: String(dados.resumo.leads_sem_contato || 0), note: "Risco operacional", tone: (dados.resumo.leads_sem_contato || 0) > 0 ? "red" : "green" },
    { label: "Agendamentos", value: String(dados.resumo.agendamentos || 0), note: `${dados.resumo.conversao_agendamento || 0}% sobre leads`, tone: "blue" },
    { label: "Vendas", value: String(dados.resumo.vendas_confirmadas || 0), note: `${dados.resumo.conversao_venda || 0}% confirmada`, tone: "green" },
    { label: "Ligações", value: String(dados.resumo.ligacoes || 0), note: `${dados.resumo.ligacoes_validas || 0} válidas`, tone: "orange" },
    { label: "TMA", value: segundos(dados.resumo.tma_segundos), note: "Tempo médio atendimento", tone: "orange" },
    { label: "WhatsApp", value: String(dados.resumo.whatsapp_mensagens || 0), note: `${dados.resumo.whatsapp_conversas || 0} conversas`, tone: dados.resumo.whatsapp_mensagens ? "blue" : "orange" },
  ]);

  if (dados.filtros.tipo !== "simples") {
    const plano = planoAcao(dados);
    pdf.resumoNarrativo("Plano de ação recomendado", "Prioridades recomendadas a partir dos dados efetivamente registrados no CRM e nas fontes conectadas.", plano);

    pdf.tituloSecao("Indicadores operacionais detalhados");
    pdf.kpiGrid([
      { label: "Tentativas", value: String(dados.resumo.ligacoes || 0), note: "Ligações/tentativas", tone: "orange" },
      { label: "Ligações válidas", value: String(dados.resumo.ligacoes_validas || 0), note: "Acima da regra mínima", tone: "green" },
      { label: "Ligações perdidas", value: String(Math.max(0, (dados.resumo.ligacoes || 0) - (dados.resumo.ligacoes_validas || 0))), note: "Tentativas sem validade", tone: "red" },
      { label: "Leads perdidos", value: String(dados.resumo.leads_arquivados || 0), note: "Arquivados/perdas", tone: "red" },
      { label: "Lucro real", value: "A validar", note: "Exige valor/margem", tone: "green" },
      { label: "Lucro perdido", value: "A validar", note: "Exige motivo/perda", tone: "orange" },
      { label: "Conversão agenda", value: `${dados.resumo.conversao_agendamento || 0}%`, note: "Agendas sobre leads", tone: "blue" },
      { label: "Conversão venda", value: `${dados.resumo.conversao_venda || 0}%`, note: "Vendas sobre leads", tone: "green" },
    ]);

    const vertical = dados.filtros.orientacao === "vertical";
    const colaboradores = dados.porUsuario.slice(0, vertical ? 28 : 22);
    pdf.tabela(
      vertical ? ["Colaborador", "Leads", "Lig.", "Wpp", "Ag.", "Vendas", "Score"] : ["Colaborador", "Leads", "Trab.", "Lig.", "Vál.", "TMA", "Wpp", "Ag.", "Vendas", "Pausas", "Score"],
      colaboradores.map((u) => vertical
        ? [u.nome, String(u.leads), String(u.ligacoes), String(u.whatsapp_mensagens), String(u.agendamentos), String(u.vendas_confirmadas), String(u.produtividade_score)]
        : [u.nome, String(u.leads), String(u.leads_trabalhados), String(u.ligacoes), String(u.ligacoes_validas), segundos(u.tma_segundos), String(u.whatsapp_mensagens), String(u.agendamentos), String(u.vendas_confirmadas), `${u.pausas_minutos || 0}m`, `${u.produtividade_score} ${scoreLabel(Number(u.produtividade_score || 0))}`]
      ),
      vertical ? [142, 48, 44, 48, 44, 54, 64] : [140, 44, 44, 44, 44, 54, 52, 44, 54, 54, 95],
      "Performance por colaborador"
    );
  }

  if (dados.filtros.tipo === "detalhado" || dados.filtros.tipo === "personalizado") {
    const importacoes = dados.importacoes || [];
    if (importacoes.length) {
      const vertical = dados.filtros.orientacao === "vertical";
      pdf.tabela(
        ["Data", "Recebidos", "Importados", "Atualizados", "Sem tel.", "Status"],
        importacoes.slice(0, 14).map((item) => [
          new Date(item.criado_em).toLocaleDateString("pt-BR"),
          String(item.total_recebidos || 0),
          String(item.total_importados || 0),
          String(item.total_atualizados || 0),
          String(item.total_sem_telefone || 0),
          String(item.status || "-"),
        ]),
        vertical ? [74, 70, 70, 72, 68, 105] : [110, 90, 90, 90, 90, 135],
        "Importações C2S no período"
      );
    }

    const vertical = dados.filtros.orientacao === "vertical";
    const lojas = dados.porLoja || [];
    if (lojas.length) {
      pdf.tabela(
        vertical ? ["Loja/carteira", "Leads", "Ag.", "Vendas", "Conv."] : ["Loja/carteira", "Leads", "Agend.", "Vendas", "Sem contato", "Perdas", "Conv. agenda", "Conv. venda"],
        lojas.slice(0, vertical ? 12 : 10).map((l) => vertical
          ? [l.loja, String(l.leads || 0), String(l.agendamentos || 0), String(l.vendas || 0), `${l.conversao_agendamento || 0}%`]
          : [l.loja, String(l.leads || 0), String(l.agendamentos || 0), String(l.vendas || 0), String(l.sem_contato || 0), String(l.perdas || 0), `${l.conversao_agendamento || 0}%`, `${l.conversao_venda || 0}%`]
        ),
        vertical ? [150, 46, 46, 54, 70] : [150, 58, 58, 58, 74, 58, 88, 88],
        "Leitura por loja/carteira"
      );
    }

    const vendedores = dados.porVendedor || [];
    if (vendedores.length) {
      pdf.tabela(
        vertical ? ["Vendedor C2S", "Leads", "Ag.", "Vendas", "Perdas"] : ["Vendedor C2S", "Leads", "Agend.", "Vendas", "Agenda sem venda", "Sem contato", "Conv. venda"],
        vendedores.slice(0, vertical ? 12 : 10).map((v) => vertical
          ? [v.vendedor, String(v.leads || 0), String(v.agendamentos || 0), String(v.vendas || 0), String(v.agendas_sem_venda || 0)]
          : [v.vendedor, String(v.leads || 0), String(v.agendamentos || 0), String(v.vendas || 0), String(v.agendas_sem_venda || 0), String(v.sem_contato || 0), `${v.conversao_venda || 0}%`]
        ),
        vertical ? [150, 46, 46, 54, 70] : [165, 58, 58, 58, 92, 80, 82],
        "Vendedores C2S e fechamento"
      );
    }

    pdf.resumoNarrativo(
      "Qualidade dos dados e fontes",
      "A leitura financeira depende de venda validada, valor e margem cadastrados. Quando esses dados não existem, o documento apresenta resultado operacional confirmado, resultado previsto e oportunidades de perda, sem estimar lucro não informado.",
      [
        `3CX: ${dados.fontes.ligacoes_3cx ? "fonte conectada" : "fonte ausente/fallback"}.`,
        `WhatsApp conversas: ${dados.fontes.whatsapp_conversas ? "fonte conectada" : "fonte ausente/fallback"}.`,
        `WhatsApp mensagens: ${dados.fontes.whatsapp_mensagens ? "fonte conectada" : "fonte ausente/fallback"}.`,
        `Histórico de status/pausas: ${dados.fontes.status_historico ? "fonte conectada" : "fonte ausente/fallback"}.`,
      ]
    );
  }

  pdf.finalizar();
  return await doc.save();
}

export async function GET(request: Request) {
  try {
    const dados = await montarDados(request);
    const pdfBytes = await montarPdf(dados);
    const nomeTipo = labelTipo(dados.filtros.tipo).replace(/\s+/g, "_");
    const nomeArquivo = `Relatorio_${nomeTipo}_Flow_Sales_CRM_${dataArquivo()}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF gerencial:", error);
    return NextResponse.json({ ok: false, erro: error instanceof Error ? error.message : "Não foi possível gerar o PDF." }, { status: 500 });
  }
}
