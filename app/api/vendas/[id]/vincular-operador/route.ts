import { NextResponse } from "next/server";
import { registrarAuditoria } from "@/lib/sistema/auditoria";
import { createClient } from "@/lib/supabase/server";

type VendaRegistro = Record<string, any>;

function texto(valor: unknown) {
  return String(valor || "").trim();
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

async function buscarVendaAlvo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  placa: string,
) {
  const campos = [
    "id",
    "placa",
    "cliente",
    "veiculo",
    "operador_id",
    "operador_nome",
    "operador_email",
    "validacao_status",
    "elegivel_comissao",
    "motivo_recusa",
    "agendamento_id",
    "lead_id",
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
  ].join(",");

  const { data: porId, error: erroPorId } = await supabase
    .from("vendas_acompanhamento")
    .select(campos)
    .eq("id", id)
    .maybeSingle();

  if (erroPorId) throw new Error(erroPorId.message);
  if (porId) return porId as VendaRegistro;

  if (!placa) return null;

  const { data: porPlaca, error: erroPorPlaca } = await supabase
    .from("vendas_acompanhamento")
    .select(campos)
    .eq("placa", placa)
    .order("atualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroPorPlaca) throw new Error(erroPorPlaca.message);

  return (porPlaca || null) as VendaRegistro | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
        { ok: false, erro: "Sem permissão para vincular operador." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const operadorNome = texto(body.operador_nome);
    const operadorEmail = texto(body.operador_email).toLowerCase();
    const placaBody = texto(body.placa).toUpperCase();

    if (!operadorNome && !operadorEmail) {
      return NextResponse.json(
        { ok: false, erro: "Informe o nome ou e-mail do operador de resgate." },
        { status: 400 },
      );
    }

    const vendaAtual = await buscarVendaAlvo(supabase, id, placaBody);

    if (!vendaAtual) {
      return NextResponse.json(
        { ok: false, erro: "Venda não encontrada." },
        { status: 404 },
      );
    }

    let operadorId: string | null = null;
    let nomeFinal = operadorNome || null;
    let emailFinal = operadorEmail || null;

    if (operadorEmail) {
      const { data: operador } = await supabase
        .from("usuarios_internos")
        .select("id, nome, email")
        .ilike("email", operadorEmail)
        .eq("ativo", true)
        .maybeSingle();

      if (operador) {
        operadorId = operador.id;
        nomeFinal = operador.nome || nomeFinal;
        emailFinal = operador.email || emailFinal;
      }
    }

    if (!operadorId && operadorNome) {
      const { data: operador } = await supabase
        .from("usuarios_internos")
        .select("id, nome, email")
        .ilike("nome", `%${operadorNome}%`)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (operador) {
        operadorId = operador.id;
        nomeFinal = operador.nome || nomeFinal;
        emailFinal = operador.email || emailFinal;
      }
    }

    const agora = new Date().toISOString();
    const usuarioNome =
      usuario.nome || usuario.email || "Usuário não identificado";
    const usuarioEmail = usuario.email || user.email || null;
    const primeiroVinculo =
      !vendaAtual.operador_vinculado_por && !vendaAtual.operador_vinculado_em;

    const payload: Record<string, unknown> = {
      operador_id: operadorId,
      operador_nome: nomeFinal,
      operador_email: emailFinal,
      validacao_status: "pendente",
      elegivel_comissao: false,
      motivo_recusa: null,

      operador_vinculo_atualizado_por: usuario.id,
      operador_vinculo_atualizado_por_nome: usuarioNome,
      operador_vinculo_atualizado_em: agora,

      operador_vinculo_removido_por: null,
      operador_vinculo_removido_por_nome: null,
      operador_vinculo_removido_em: null,
      operador_vinculo_remocao_motivo: null,

      atualizado_por: usuario.id,
      atualizado_em: agora,
    };

    if (primeiroVinculo) {
      payload.operador_vinculado_por = usuario.id;
      payload.operador_vinculado_por_nome = usuarioNome;
      payload.operador_vinculado_em = agora;
    }

    const { data: dataRaw, error } = await supabase
      .from("vendas_acompanhamento")
      .update(payload)
      .eq("id", vendaAtual.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const data = (dataRaw || {}) as VendaRegistro;

    await registrarAuditoria({
      modulo: "vendas_resgate",
      acao: primeiroVinculo
        ? "vincular_operador_resgate"
        : "editar_vinculo_operador_resgate",
      entidade: "vendas_acompanhamento",
      entidade_id: data.id,
      usuario_id: usuario.id,
      usuario_nome: usuarioNome,
      usuario_email: usuarioEmail,
      descricao: primeiroVinculo
        ? `Vinculou operador de resgate na venda ${data.placa || vendaAtual.placa}.`
        : `Editou vínculo do operador de resgate na venda ${data.placa || vendaAtual.placa}.`,
      antes: vendaAtual,
      depois: data,
      metadata: {
        placa: data.placa || vendaAtual.placa,
        operador_id: operadorId,
        operador_nome: nomeFinal,
        operador_email: emailFinal,
      },
    });

    return NextResponse.json({
      ok: true,
      venda: data,
      mensagem: primeiroVinculo
        ? "Operador de resgate vinculado à venda."
        : "Vínculo do operador de resgate atualizado.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao vincular operador de resgate.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
        { ok: false, erro: "Sem permissão para remover vínculo." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const motivo = texto(body.motivo) || "Vínculo removido manualmente.";
    const placaBody = texto(body.placa).toUpperCase();
    const agora = new Date().toISOString();
    const usuarioNome =
      usuario.nome || usuario.email || "Usuário não identificado";
    const usuarioEmail = usuario.email || user.email || null;

    const vendaAtual = await buscarVendaAlvo(supabase, id, placaBody);

    if (!vendaAtual) {
      return NextResponse.json(
        { ok: false, erro: "Venda não encontrada." },
        { status: 404 },
      );
    }

    const { data: dataRaw, error } = await supabase
      .from("vendas_acompanhamento")
      .update({
        operador_id: null,
        operador_nome: null,
        operador_email: null,
        validacao_status: "pendente",
        elegivel_comissao: false,
        motivo_recusa: null,

        operador_vinculo_removido_por: usuario.id,
        operador_vinculo_removido_por_nome: usuarioNome,
        operador_vinculo_removido_em: agora,
        operador_vinculo_remocao_motivo: motivo,

        operador_vinculo_atualizado_por: usuario.id,
        operador_vinculo_atualizado_por_nome: usuarioNome,
        operador_vinculo_atualizado_em: agora,

        atualizado_por: usuario.id,
        atualizado_em: agora,
      })
      .eq("id", vendaAtual.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const data = (dataRaw || {}) as VendaRegistro;

    await registrarAuditoria({
      modulo: "vendas_resgate",
      acao: "remover_vinculo_operador_resgate",
      entidade: "vendas_acompanhamento",
      entidade_id: data.id,
      usuario_id: usuario.id,
      usuario_nome: usuarioNome,
      usuario_email: usuarioEmail,
      descricao: `Removeu vínculo do operador de resgate na venda ${data.placa || vendaAtual.placa}.`,
      antes: vendaAtual,
      depois: data,
      metadata: {
        placa: data.placa || vendaAtual.placa,
        motivo,
        operador_anterior_id: vendaAtual.operador_id,
        operador_anterior_nome: vendaAtual.operador_nome,
        operador_anterior_email: vendaAtual.operador_email,
      },
    });

    return NextResponse.json({
      ok: true,
      venda: data,
      mensagem: "Vínculo do operador de resgate removido.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao remover vínculo do operador de resgate.",
      },
      { status: 500 },
    );
  }
}
