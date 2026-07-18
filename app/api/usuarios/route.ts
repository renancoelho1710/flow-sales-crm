import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Perfil = "adm" | "suporte" | "colaborador";

async function usuarioAtual() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, usuario: null };

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  return { supabase, usuario };
}

function podeGerenciar(perfil?: string | null) {
  return perfil === "adm" || perfil === "suporte";
}

async function usuarioCompleto(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, auth_user_id, nome, email, perfil, ativo, telefone, cargo, avatar_url, unidade_padrao_id, recebe_leads, status_operacional, status_administrativo, status_administrativo_motivo, em_ferias, ferias_inicio, ferias_fim, motivo_ferias, ultimo_lead_recebido_em, criado_em, atualizado_em, unidade:unidade_padrao_id(id,nome,codigo)")
    .eq("id", id)
    .single();

  if (!usuario) return null;

  const { data: permissoes } = await supabase
    .from("usuario_permissoes")
    .select("modulo_chave, permitido")
    .eq("usuario_id", id);

  return {
    ...usuario,
    permissoes: Object.fromEntries((permissoes || []).map((p) => [p.modulo_chave, p.permitido])),
  };
}

export async function POST(request: Request) {
  const { supabase, usuario } = await usuarioAtual();
  if (!usuario) return NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 });
  if (!podeGerenciar(usuario.perfil)) return NextResponse.json({ ok: false, erro: "Sem permissão." }, { status: 403 });

  const body = await request.json();
  const nome = String(body.nome || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const senha = String(body.senha || "");
  const perfil = String(body.perfil || "colaborador") as Perfil;

  if (!nome || !email || !senha) return NextResponse.json({ ok: false, erro: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (authError) return NextResponse.json({ ok: false, erro: authError.message }, { status: 400 });

  const { data: novo, error } = await supabase
    .from("usuarios_internos")
    .insert({
      auth_user_id: authData.user?.id,
      nome,
      email,
      perfil,
      telefone: body.telefone || null,
      cargo: body.cargo || null,
      unidade_padrao_id: body.unidade_padrao_id || null,
      recebe_leads: Boolean(body.recebe_leads) && perfil === "colaborador",
      ativo: true,
      status_operacional: "offline",
      status_administrativo: "disponivel",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });

  const { data: modulos } = await supabase.from("modulos_sistema").select("chave").eq("ativo", true);
  if (modulos?.length) {
    await supabase.from("usuario_permissoes").insert(modulos.map((modulo) => ({
      usuario_id: novo.id,
      modulo_chave: modulo.chave,
      permitido: perfil === "adm" || perfil === "suporte" || ["dashboard", "leads", "kanban", "agenda"].includes(modulo.chave),
    })));
  }

  const completo = await usuarioCompleto(supabase, novo.id);
  return NextResponse.json({ ok: true, usuario: completo });
}

export async function PATCH(request: Request) {
  const { supabase, usuario } = await usuarioAtual();
  if (!usuario) return NextResponse.json({ ok: false, erro: "Usuário não autenticado." }, { status: 401 });
  if (!podeGerenciar(usuario.perfil)) return NextResponse.json({ ok: false, erro: "Sem permissão." }, { status: 403 });

  const body = await request.json();
  const id = String(body.id || "");
  const acao = String(body.acao || "");
  if (!id) return NextResponse.json({ ok: false, erro: "ID do usuário não informado." }, { status: 400 });

  if (acao === "ativo") {
    await supabase.from("usuarios_internos").update(Boolean(body.ativo) ? {
      ativo: true,
      status_administrativo: "disponivel",
    } : {
      ativo: false,
      status_administrativo: "bloqueado",
      recebe_leads: false,
    }).eq("id", id);
  }

  if (acao === "recebe_leads") {
    const { data: alvo } = await supabase.from("usuarios_internos").select("status_administrativo, perfil").eq("id", id).single();
    if (alvo?.status_administrativo !== "disponivel" || alvo?.perfil !== "colaborador") {
      return NextResponse.json({ ok: false, erro: "Usuário não está disponível para receber leads." }, { status: 400 });
    }
    await supabase.from("usuarios_internos").update({ recebe_leads: Boolean(body.recebe_leads) }).eq("id", id);
  }

  if (acao === "status_administrativo") {
    const status = String(body.status_administrativo || "disponivel");
    await supabase.from("usuarios_internos").update(status === "disponivel" ? {
      status_administrativo: status,
      em_ferias: false,
    } : {
      status_administrativo: status,
      recebe_leads: false,
      em_ferias: status === "ferias",
    }).eq("id", id);
  }

  if (acao === "ferias") {
    await supabase.rpc("marcar_usuario_ferias", {
      usuario_id_param: id,
      inicio_param: body.ferias_inicio,
      fim_param: body.ferias_fim,
      motivo_param: body.motivo_ferias || null,
    });
  }

  if (acao === "remover_ferias") {
    await supabase.rpc("remover_usuario_ferias", { usuario_id_param: id });
  }

  if (acao === "permissao") {
    await supabase.from("usuario_permissoes").upsert({
      usuario_id: id,
      modulo_chave: String(body.modulo_chave),
      permitido: Boolean(body.permitido),
    }, { onConflict: "usuario_id,modulo_chave" });
  }

  if (acao === "resetar_senha") {
    const { data: alvo } = await supabase.from("usuarios_internos").select("email").eq("id", id).single();
    if (alvo?.email) {
      const admin = createAdminClient();
      await admin.auth.resetPasswordForEmail(alvo.email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/resetar-senha` });
    }
  }

  const completo = await usuarioCompleto(supabase, id);
  return NextResponse.json({ ok: true, usuario: completo });
}
