import { createClient } from "@/lib/supabase/server";

type RegistrarAuditoriaInput = {
  modulo: string;
  acao: string;
  entidade?: string | null;
  entidade_id?: string | null;
  usuario_id?: string | null;
  usuario_nome?: string | null;
  usuario_email?: string | null;
  descricao?: string | null;
  antes?: unknown;
  depois?: unknown;
  metadata?: Record<string, unknown>;
};

export async function registrarAuditoria(input: RegistrarAuditoriaInput) {
  try {
    const supabase = await createClient();

    await supabase.from("sistema_auditoria").insert({
      modulo: input.modulo,
      acao: input.acao,
      entidade: input.entidade || null,
      entidade_id: input.entidade_id || null,
      usuario_id: input.usuario_id || null,
      usuario_nome: input.usuario_nome || null,
      usuario_email: input.usuario_email || null,
      descricao: input.descricao || null,
      antes: input.antes ?? null,
      depois: input.depois ?? null,
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.error("Erro ao registrar auditoria:", error);
  }
}

type RegistrarErroInput = {
  modulo: string;
  origem?: string | null;
  mensagem: string;
  stack?: string | null;
  usuario_id?: string | null;
  usuario_email?: string | null;
  metadata?: Record<string, unknown>;
};

export async function registrarErroSistema(input: RegistrarErroInput) {
  try {
    const supabase = await createClient();

    await supabase.from("sistema_erros").insert({
      modulo: input.modulo,
      origem: input.origem || null,
      mensagem: input.mensagem,
      stack: input.stack || null,
      usuario_id: input.usuario_id || null,
      usuario_email: input.usuario_email || null,
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.error("Erro ao registrar erro do sistema:", error);
  }
}
