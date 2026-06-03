import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  lead_id?: string;
  vendedor_id?: string;
  motivo?: string;
};

function texto(valor?: string | null) {
  return String(valor || "").trim();
}

function perfilPodeAlterar(perfil?: string | null) {
  return ["adm", "admin", "supervisor", "gerente", "suporte"].includes(
    String(perfil || "").toLowerCase()
  );
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const leadId = texto(body.lead_id);
    const vendedorId = texto(body.vendedor_id);
    const motivo = texto(body.motivo);

    if (!leadId) {
      return NextResponse.json(
        { ok: false, erro: "Lead não informado." },
        { status: 400 }
      );
    }

    if (!vendedorId) {
      return NextResponse.json(
        { ok: false, erro: "Vendedor não informado." },
        { status: 400 }
      );
    }

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
      .select("id, nome, perfil, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    if (!usuarioInterno) {
      return NextResponse.json(
        { ok: false, erro: "Usuário interno não encontrado ou inativo." },
        { status: 403 }
      );
    }

    if (!perfilPodeAlterar(usuarioInterno.perfil)) {
      return NextResponse.json(
        { ok: false, erro: "Somente supervisão/ADM pode vincular ou trocar vendedor." },
        { status: 403 }
      );
    }

    const { data: leadAtual } = await supabase
      .from("leads")
      .select("id, nome, vendedor_id, vendedor_nome, vendedor_email")
      .eq("id", leadId)
      .single();

    if (!leadAtual) {
      return NextResponse.json(
        { ok: false, erro: "Lead não encontrado." },
        { status: 404 }
      );
    }

    const { data: vendedor } = await supabase
      .from("usuarios_internos")
      .select("id, nome, email, perfil, ativo")
      .eq("id", vendedorId)
      .eq("ativo", true)
      .single();

    if (!vendedor) {
      return NextResponse.json(
        { ok: false, erro: "Vendedor não encontrado ou inativo." },
        { status: 404 }
      );
    }

    const agora = new Date().toISOString();

    const { data: leadAtualizado, error: erroLead } = await supabase
      .from("leads")
      .update({
        vendedor_id: vendedor.id,
        vendedor_nome: vendedor.nome,
        vendedor_email: vendedor.email || null,
        vendedor_definido_em: agora,
        vendedor_definido_por: usuarioInterno.id,
        vendedor_troca_bloqueada: true,
        atualizado_em: agora,
      })
      .eq("id", leadId)
      .select("*")
      .single();

    if (erroLead) {
      console.error("Erro ao vincular vendedor ao lead:", erroLead);

      return NextResponse.json(
        { ok: false, erro: "Não foi possível vincular o vendedor ao lead." },
        { status: 500 }
      );
    }

    const vendedorMudou =
      leadAtual.vendedor_id &&
      leadAtual.vendedor_id !== vendedor.id;

    await supabase.from("lead_vendedor_trocas").insert({
      lead_id: leadId,
      vendedor_anterior_id: leadAtual.vendedor_id || null,
      vendedor_anterior_nome: leadAtual.vendedor_nome || null,
      vendedor_novo_id: vendedor.id,
      vendedor_novo_nome: vendedor.nome,
      solicitado_por: usuarioInterno.id,
      aprovado_por: usuarioInterno.id,
      motivo:
        motivo ||
        (vendedorMudou
          ? "Troca de vendedor realizada pela supervisão/ADM."
          : "Vendedor vinculado pela supervisão/ADM."),
      origem: "flow",
    });

    await supabase.from("lead_interacoes").insert({
      lead_id: leadId,
      usuario_id: usuarioInterno.id,
      tipo: "observacao",
      canal: "sistema",
      resultado: "observacao",
      observacao:
        motivo ||
        (vendedorMudou
          ? `Vendedor alterado de ${leadAtual.vendedor_nome || "não informado"} para ${vendedor.nome}.`
          : `Vendedor vinculado ao lead: ${vendedor.nome}.`),
    });

    const { error: erroAgendamentos } = await supabase
      .from("lead_agendamentos")
      .update({
        vendedor_id: vendedor.id,
        vendedor_nome: vendedor.nome,
        vendedor_email: vendedor.email || null,
        atualizado_por: usuarioInterno.id,
        atualizado_em: agora,
      })
      .eq("lead_id", leadId)
      .in("status", ["agendado", "confirmado", "remarcado"]);

    if (erroAgendamentos) {
      console.error("Erro ao atualizar vendedor nos agendamentos:", erroAgendamentos);
    }

    return NextResponse.json({
      ok: true,
      lead: leadAtualizado,
      vendedor,
      aviso_agendamentos: erroAgendamentos
        ? "Vendedor salvo no lead, mas não foi possível atualizar todos os agendamentos."
        : null,
    });
  } catch (error) {
    console.error("Erro inesperado ao vincular vendedor:", error);

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao vincular vendedor." },
      { status: 500 }
    );
  }
}
