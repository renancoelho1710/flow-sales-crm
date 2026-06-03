import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  acao?: "salvar" | "rejeitar";
  origem_c2s?: string;
  campanha?: string;
  tags?: string;
  fila_vendedor?: string;
  observacao_supervisor?: string;
  motivo_rejeicao?: string;
};

function texto(valor?: string | null) {
  return String(valor || "").trim();
}

function tagsArray(valor?: string) {
  return String(valor || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Payload;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 });
    }

    const { data: usuarioInterno } = await supabase
      .from("usuarios_internos")
      .select("id, nome, perfil, ativo")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .single();

    const perfil = String(usuarioInterno?.perfil || "").toLowerCase();
    const podeAnalisar = ["adm", "admin", "supervisor", "gerente", "suporte"].includes(perfil);

    if (!usuarioInterno || !podeAnalisar) {
      return NextResponse.json({ ok: false, erro: "Usuário sem permissão para analisar solicitações." }, { status: 403 });
    }

    const acao = body.acao || "salvar";

    if (acao === "rejeitar") {
      const motivo = texto(body.motivo_rejeicao);

      if (!motivo) {
        return NextResponse.json({ ok: false, erro: "Informe o motivo da rejeição." }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("lead_solicitacoes")
        .update({
          status: "rejeitado",
          motivo_rejeicao: motivo,
          analisado_por: usuarioInterno.id,
          analisado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, erro: "Não foi possível rejeitar a solicitação." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, solicitacao: data });
    }

    const { data, error } = await supabase
      .from("lead_solicitacoes")
      .update({
        origem_c2s: texto(body.origem_c2s) || null,
        campanha: texto(body.campanha) || null,
        tags: tagsArray(body.tags),
        fila_vendedor: texto(body.fila_vendedor) || null,
        observacao_supervisor: texto(body.observacao_supervisor) || null,
        status: "em_analise",
        analisado_por: usuarioInterno.id,
        analisado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, erro: "Não foi possível salvar a análise." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, solicitacao: data });
  } catch (error) {
    console.error("Erro ao atualizar solicitação de lead:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao atualizar solicitação." }, { status: 500 });
  }
}
