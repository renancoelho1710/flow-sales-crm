import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  acao?: "salvar_vendedor" | "salvar_capacidade" | "salvar_bloqueio" | "desativar_bloqueio";
  vendedor?: Record<string, unknown>;
  capacidade?: Record<string, unknown>;
  bloqueio?: Record<string, unknown>;
};

function perfilGestao(perfil?: string | null) {
  return ["adm", "admin", "gerente", "supervisor", "suporte"].includes(String(perfil || "").trim().toLowerCase());
}

function texto(valor: unknown) {
  const limpo = String(valor || "").trim();
  return limpo || null;
}

function numero(valor: unknown, fallback = 0) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function bool(valor: unknown, fallback = false) {
  if (typeof valor === "boolean") return valor;
  if (valor === "true") return true;
  if (valor === "false") return false;
  return fallback;
}

async function getContexto() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, usuario: null, erro: NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 }) };
  }

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuario) {
    return { supabase, usuario: null, erro: NextResponse.json({ ok: false, erro: "Usuário interno não encontrado." }, { status: 403 }) };
  }

  return { supabase, usuario, erro: null };
}

async function auditar(supabase: Awaited<ReturnType<typeof createClient>>, usuarioId: string, acao: string, entidadeId: string | null, valorNovo: unknown) {
  await supabase
    .from("configuracoes_auditoria")
    .insert({
      usuario_id: usuarioId,
      acao,
      modulo: "agenda_vendedores",
      entidade: "vendedores_comerciais",
      entidade_id: entidadeId,
      valor_novo: valorNovo,
    })
    .then(() => null);
}

export async function GET() {
  try {
    const { supabase, erro } = await getContexto();
    if (erro) return erro;

    const [vendedores, capacidades, bloqueios, logs] = await Promise.all([
      supabase
        .from("vendedores_comerciais")
        .select("id, nome, nome_correio, nome_c2s, codigo_c2s, loja, cargo, status_planilha, origem, telefone_particular_1, telefone_particular_2, telefone_corporativo, ativo, recebe_agendamento, situacao_operacional, observacao, google_sheet_atualizado_em, atualizado_em")
        .order("ativo", { ascending: false })
        .order("nome", { ascending: true }),
      supabase
        .from("vendedores_capacidade")
        .select("id, vendedor_id, dia_semana, manha_ativo, tarde_ativo, noite_ativo, capacidade_manha, capacidade_tarde, capacidade_noite, inicio_manha, fim_manha, inicio_tarde, fim_tarde, inicio_noite, fim_noite")
        .order("dia_semana", { ascending: true }),
      supabase
        .from("vendedores_bloqueios")
        .select("id, vendedor_id, tipo, periodo, data_inicio, data_fim, motivo, ativo, criado_em")
        .eq("ativo", true)
        .order("data_inicio", { ascending: false })
        .limit(200),
      supabase
        .from("vendedores_sincronizacao_logs")
        .select("id, origem, status, mensagem, total_lidos, total_importados, total_atualizados, total_ignorados, criado_em")
        .order("criado_em", { ascending: false })
        .limit(8),
    ]);

    if (vendedores.error) throw vendedores.error;
    if (capacidades.error) throw capacidades.error;
    if (bloqueios.error) throw bloqueios.error;

    return NextResponse.json({
      ok: true,
      vendedores: vendedores.data || [],
      capacidades: capacidades.data || [],
      bloqueios: bloqueios.data || [],
      logs: logs.data || [],
    });
  } catch (error) {
    console.error("Erro ao listar vendedores da agenda:", error);
    return NextResponse.json({ ok: false, erro: "Não foi possível carregar vendedores da agenda." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const { supabase, usuario, erro } = await getContexto();
    if (erro || !usuario) return erro;
    if (!perfilGestao(usuario.perfil)) {
      return NextResponse.json({ ok: false, erro: "Apenas gestão pode cadastrar vendedor." }, { status: 403 });
    }

    const vendedor = body.vendedor || {};
    const nome = texto(vendedor.nome);
    if (!nome) {
      return NextResponse.json({ ok: false, erro: "Informe o nome do vendedor." }, { status: 400 });
    }

    const payload = {
      nome,
      nome_correio: texto(vendedor.nome_correio),
      nome_c2s: texto(vendedor.nome_c2s) || nome,
      codigo_c2s: texto(vendedor.codigo_c2s),
      loja: texto(vendedor.loja),
      cargo: texto(vendedor.cargo) || "VENDEDOR",
      origem: "manual",
      telefone_particular_1: texto(vendedor.telefone_particular_1),
      telefone_particular_2: texto(vendedor.telefone_particular_2),
      telefone_corporativo: texto(vendedor.telefone_corporativo),
      ativo: bool(vendedor.ativo, true),
      recebe_agendamento: bool(vendedor.recebe_agendamento, true),
      situacao_operacional: texto(vendedor.situacao_operacional) || "ativo",
      observacao: texto(vendedor.observacao),
      criado_por: usuario.id,
      atualizado_por: usuario.id,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("vendedores_comerciais")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    const capacidades = Array.from({ length: 7 }).map((_, dia) => ({
      vendedor_id: data.id,
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
    await auditar(supabase, usuario.id, "criar_vendedor_agenda", data.id, data);

    return NextResponse.json({ ok: true, vendedor: data });
  } catch (error) {
    console.error("Erro ao cadastrar vendedor:", error);
    return NextResponse.json({ ok: false, erro: "Não foi possível cadastrar vendedor." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const { supabase, usuario, erro } = await getContexto();
    if (erro || !usuario) return erro;
    if (!perfilGestao(usuario.perfil)) {
      return NextResponse.json({ ok: false, erro: "Apenas gestão pode alterar vendedores da agenda." }, { status: 403 });
    }

    if (body.acao === "salvar_capacidade") {
      const capacidade = body.capacidade || {};
      const vendedorId = texto(capacidade.vendedor_id);
      const diaSemana = Number(capacidade.dia_semana);
      if (!vendedorId || !Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
        return NextResponse.json({ ok: false, erro: "Capacidade inválida." }, { status: 400 });
      }

      const payload = {
        vendedor_id: vendedorId,
        dia_semana: diaSemana,
        manha_ativo: bool(capacidade.manha_ativo, true),
        tarde_ativo: bool(capacidade.tarde_ativo, true),
        noite_ativo: bool(capacidade.noite_ativo, false),
        capacidade_manha: numero(capacidade.capacidade_manha, 3),
        capacidade_tarde: numero(capacidade.capacidade_tarde, 4),
        capacidade_noite: numero(capacidade.capacidade_noite, 0),
        atualizado_por: usuario.id,
        atualizado_em: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("vendedores_capacidade")
        .upsert(payload, { onConflict: "vendedor_id,dia_semana" })
        .select("*")
        .single();

      if (error) throw error;
      await auditar(supabase, usuario.id, "atualizar_capacidade_vendedor", vendedorId, data);
      return NextResponse.json({ ok: true, capacidade: data });
    }

    if (body.acao === "salvar_bloqueio") {
      const bloqueio = body.bloqueio || {};
      const vendedorId = texto(bloqueio.vendedor_id);
      const dataInicio = texto(bloqueio.data_inicio);
      const dataFim = texto(bloqueio.data_fim) || dataInicio;
      if (!vendedorId || !dataInicio || !dataFim) {
        return NextResponse.json({ ok: false, erro: "Informe vendedor e período do bloqueio." }, { status: 400 });
      }

      const payload = {
        vendedor_id: vendedorId,
        tipo: texto(bloqueio.tipo) || "bloqueio_temporario",
        periodo: texto(bloqueio.periodo) || "dia",
        data_inicio: dataInicio,
        data_fim: dataFim,
        motivo: texto(bloqueio.motivo),
        ativo: true,
        criado_por: usuario.id,
        atualizado_por: usuario.id,
        atualizado_em: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("vendedores_bloqueios").insert(payload).select("*").single();
      if (error) throw error;
      await auditar(supabase, usuario.id, "bloquear_vendedor_agenda", vendedorId, data);
      return NextResponse.json({ ok: true, bloqueio: data });
    }

    if (body.acao === "desativar_bloqueio") {
      const bloqueioId = texto(body.bloqueio?.id);
      if (!bloqueioId) return NextResponse.json({ ok: false, erro: "Bloqueio não informado." }, { status: 400 });

      const { data, error } = await supabase
        .from("vendedores_bloqueios")
        .update({ ativo: false, atualizado_por: usuario.id, atualizado_em: new Date().toISOString() })
        .eq("id", bloqueioId)
        .select("*")
        .single();

      if (error) throw error;
      await auditar(supabase, usuario.id, "desativar_bloqueio_vendedor", data.vendedor_id, data);
      return NextResponse.json({ ok: true, bloqueio: data });
    }

    const vendedor = body.vendedor || {};
    const id = texto(vendedor.id);
    if (!id) return NextResponse.json({ ok: false, erro: "Vendedor não informado." }, { status: 400 });

    const payload = {
      nome: texto(vendedor.nome),
      nome_correio: texto(vendedor.nome_correio),
      nome_c2s: texto(vendedor.nome_c2s),
      codigo_c2s: texto(vendedor.codigo_c2s),
      loja: texto(vendedor.loja),
      cargo: texto(vendedor.cargo),
      telefone_particular_1: texto(vendedor.telefone_particular_1),
      telefone_particular_2: texto(vendedor.telefone_particular_2),
      telefone_corporativo: texto(vendedor.telefone_corporativo),
      ativo: bool(vendedor.ativo, true),
      recebe_agendamento: bool(vendedor.recebe_agendamento, true),
      situacao_operacional: texto(vendedor.situacao_operacional) || "ativo",
      observacao: texto(vendedor.observacao),
      atualizado_por: usuario.id,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("vendedores_comerciais")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    await auditar(supabase, usuario.id, "atualizar_vendedor_agenda", id, data);
    return NextResponse.json({ ok: true, vendedor: data });
  } catch (error) {
    console.error("Erro ao atualizar agenda vendedor:", error);
    return NextResponse.json({ ok: false, erro: "Não foi possível salvar alteração do vendedor." }, { status: 500 });
  }
}
