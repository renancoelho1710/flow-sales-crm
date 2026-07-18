import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

type Payload = {
  nome?: string;
  empresa?: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  colaboradores?: string;
  segmento?: string;
  mediaLucro?: string;
  observacoes?: string;
  comunicacoes?: boolean;
};

function texto(valor?: string) {
  return String(valor || "").trim();
}

function escaparHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function criarTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || "true") === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("Configuração SMTP ausente.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;

    const nome = texto(body.nome);
    const empresa = texto(body.empresa);
    const cargo = texto(body.cargo);
    const email = texto(body.email);
    const telefone = texto(body.telefone);
    const colaboradores = texto(body.colaboradores);
    const segmento = texto(body.segmento);
    const mediaLucro = texto(body.mediaLucro);
    const observacoes = texto(body.observacoes);
    const comunicacoes = Boolean(body.comunicacoes);

    if (!nome || !email || !empresa || !telefone || !segmento || !observacoes) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const emailDestino =
      process.env.EMAIL_DEMONSTRACAO_DESTINO || "renan.azulveiculos@gmail.com";
    const smtpUser = process.env.SMTP_USER;
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    const bannerUrl = `${baseUrl}/email-flow-sales.png`;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuração do Supabase ausente." },
        { status: 500 }
      );
    }

    if (!smtpUser) {
      return NextResponse.json(
        { error: "Configuração do Gmail SMTP ausente." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const { error: erroSupabase } = await supabase
      .from("solicitacoes_demonstracao")
      .insert({
        nome_completo: nome,
        email_corporativo: email,
        empresa,
        cargo: cargo || null,
        telefone_whatsapp: telefone,
        numero_colaboradores: colaboradores || null,
        segmento_atuacao: segmento,
        media_lucro: mediaLucro || null,
        mensagem: observacoes,
        aceita_comunicacoes: comunicacoes,
      });

    if (erroSupabase) {
      console.error("Erro Supabase:", erroSupabase);
      return NextResponse.json(
        { error: "Não foi possível salvar a solicitação." },
        { status: 500 }
      );
    }

    const transporter = criarTransporter();

    const assuntoInterno = `Nova solicitação de demonstração - ${empresa}`;

    const linhasInternas = [
      "Nova solicitação de demonstração recebida pelo site Flow Sales CRM.",
      "",
      `Nome: ${nome}`,
      `Empresa: ${empresa}`,
      `Cargo: ${cargo || "Não informado"}`,
      `E-mail: ${email}`,
      `Telefone / WhatsApp: ${telefone}`,
      `Número de colaboradores: ${colaboradores || "Não informado"}`,
      `Segmento de atuação: ${segmento}`,
      `Média de lucro: ${mediaLucro || "Não informado"}`,
      "",
      "Como podemos ajudar:",
      observacoes || "Não informado",
      "",
      `Aceita comunicações: ${comunicacoes ? "Sim" : "Não"}`,
    ];

    const htmlInterno = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #0f172a;">
        <div style="background: #1d4ed8; color: white; padding: 22px 26px; border-radius: 18px 18px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">Nova solicitação de demonstração</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Flow Sales CRM</p>
        </div>

        <div style="border: 1px solid #e2e8f0; border-top: 0; padding: 26px; border-radius: 0 0 18px 18px;">
          <p style="font-size: 16px; margin-top: 0;">
            Uma nova empresa solicitou demonstração pelo site.
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr><td style="padding: 10px 0; font-weight: bold;">Nome</td><td>${escaparHtml(nome)}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Empresa</td><td>${escaparHtml(empresa)}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Cargo</td><td>${escaparHtml(cargo || "Não informado")}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">E-mail</td><td>${escaparHtml(email)}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Telefone / WhatsApp</td><td>${escaparHtml(telefone)}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Colaboradores</td><td>${escaparHtml(colaboradores || "Não informado")}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Segmento</td><td>${escaparHtml(segmento)}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Média de lucro</td><td>${escaparHtml(mediaLucro || "Não informado")}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Aceita comunicações</td><td>${comunicacoes ? "Sim" : "Não"}</td></tr>
          </table>

          <div style="margin-top: 22px; padding: 18px; background: #f8fafc; border-radius: 14px;">
            <strong>Como podemos ajudar:</strong>
            <p style="white-space: pre-wrap; margin-bottom: 0;">${escaparHtml(observacoes)}</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Flow Sales CRM" <${smtpUser}>`,
      to: emailDestino,
      replyTo: email,
      subject: assuntoInterno,
      text: linhasInternas.join("\n"),
      html: htmlInterno,
    });

    const primeiroNome = nome.split(" ")[0] || nome;

    const textoCliente = [
      `Olá, ${primeiroNome}.`,
      "",
      "Recebemos sua solicitação de demonstração do Flow Sales CRM.",
      "Logo entraremos em contato para apresentar a plataforma e entender melhor a sua operação.",
      "",
      `Acesse o site: ${baseUrl}`,
      "",
      "Equipe Flow Sales CRM",
    ].join("\n");

    const htmlCliente = `
      <div style="margin: 0; padding: 0; background: #f1f5f9;">
        <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #0f172a; padding: 24px 12px;">
          <div style="background: #ffffff; border-radius: 22px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 18px 55px rgba(15, 23, 42, 0.10);">
            <img
              src="${bannerUrl}"
              alt="Flow Sales CRM"
              width="720"
              style="display: block; width: 100%; max-width: 720px; height: auto; border: 0;"
            />

            <div style="padding: 26px 30px 30px; text-align: center;">
              <p style="font-size: 17px; line-height: 1.7; margin: 0 0 10px; color: #0f172a;">
                Olá, <strong>${escaparHtml(primeiroNome)}</strong>.
              </p>

              <p style="font-size: 16px; line-height: 1.7; margin: 0 auto 22px; color: #334155; max-width: 560px;">
                Recebemos sua solicitação. Logo entraremos em contato para apresentar a plataforma e entender melhor a sua operação.
              </p>

              <a
                href="${baseUrl}"
                style="display: inline-block; background: #1d4ed8; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 14px 24px; border-radius: 999px;"
              >
                Acessar site do Flow Sales CRM
              </a>

              <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 22px 0 0;">
                Equipe Flow Sales CRM
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Flow Sales CRM" <${smtpUser}>`,
      to: email,
      replyTo: emailDestino,
      subject: "Recebemos sua solicitação - Flow Sales CRM",
      text: textoCliente,
      html: htmlCliente,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro solicitação demonstração:", error);
    return NextResponse.json(
      { error: "Erro inesperado ao enviar a solicitação." },
      { status: 500 }
    );
  }
}
