import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  nome_indicado?: string;
  telefone_indicado?: string;
  email_indicado?: string;
  nome_indicador?: string;
  telefone_indicador?: string;
  veiculo_interesse?: string;
  observacao_atendente?: string;
};

function texto(valor?: string | null) {
  return String(valor || "").trim();
}

function somenteNumeros(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;

    const nomeIndicado = texto(body.nome_indicado);
    const telefoneIndicado = texto(body.telefone_indicado);
    const emailIndicado = texto(body.email_indicado);
    const nomeIndicador = texto(body.nome_indicador);
    const telefoneIndicador = texto(body.telefone_indicador);
    const veiculoInteresse = texto(body.veiculo_interesse);
    const observacaoAtendente = texto(body.observacao_atendente);

    const telefoneIndicadoNormalizado = somenteNumeros(telefoneIndicado);
    const telefoneIndicadorNormalizado = somenteNumeros(telefoneIndicador);

    if (!nomeIndicado || !telefoneIndicadoNormalizado || !observacaoAtendente) {
      return NextResponse.json(
        { ok: false, erro: "Preencha nome, telefone do indicado e observação da solicitação." },
        { status: 400 }
      );
    }

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

    if (!usuarioInterno) {
      return NextResponse.json({ ok: false, erro: "Usuário interno não encontrado ou inativo." }, { status: 403 });
    }

    const { data: leadExistente } = await supabase
      .from("leads")
      .select("id, nome, telefone")
      .eq("telefone_normalizado", telefoneIndicadoNormalizado)
      .maybeSingle();

    if (leadExistente) {
      return NextResponse.json({ ok: false, erro: "Já existe um lead cadastrado com esse telefone." }, { status: 409 });
    }

    const { data: solicitacaoPendente } = await supabase
      .from("lead_solicitacoes")
      .select("id")
      .eq("telefone_indicado_normalizado", telefoneIndicadoNormalizado)
      .in("status", ["pendente", "em_analise"])
      .maybeSingle();

    if (solicitacaoPendente) {
      return NextResponse.json({ ok: false, erro: "Já existe uma solicitação pendente para esse telefone." }, { status: 409 });
    }

    const { error } = await supabase.from("lead_solicitacoes").insert({
      nome_indicado: nomeIndicado,
      telefone_indicado: telefoneIndicado,
      telefone_indicado_normalizado: telefoneIndicadoNormalizado,
      email_indicado: emailIndicado || null,
      nome_indicador: nomeIndicador || null,
      telefone_indicador: telefoneIndicador || null,
      telefone_indicador_normalizado: telefoneIndicadorNormalizado || null,
      veiculo_interesse: veiculoInteresse || null,
      observacao_atendente: observacaoAtendente,
      solicitado_por: usuarioInterno.id,
      status: "pendente",
    });

    if (error) {
      console.error("Erro ao criar solicitação de novo lead:", error);
      return NextResponse.json({ ok: false, erro: "Não foi possível registrar a solicitação." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensagem: "Solicitação enviada para supervisão." });
  } catch (error) {
    console.error("Erro inesperado na solicitação de novo lead:", error);
    return NextResponse.json({ ok: false, erro: "Erro inesperado ao solicitar novo lead." }, { status: 500 });
  }
}
