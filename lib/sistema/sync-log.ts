import { createClient } from "@/lib/supabase/server";

type IniciarSyncInput = {
  modulo: string;
  origem: string;
  iniciado_por?: string | null;
  iniciado_por_nome?: string | null;
  iniciado_por_email?: string | null;
  detalhes?: Record<string, unknown>;
};

type FinalizarSyncInput = {
  id: string;
  status: "concluido" | "erro";
  total_lidos?: number;
  total_processados?: number;
  total_criados?: number;
  total_atualizados?: number;
  total_erros?: number;
  detalhes?: Record<string, unknown>;
  erro?: string | null;
};

export async function iniciarSincronizacao(input: IniciarSyncInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sistema_sincronizacoes")
    .insert({
      modulo: input.modulo,
      origem: input.origem,
      status: "processando",
      iniciado_por: input.iniciado_por || null,
      iniciado_por_nome: input.iniciado_por_nome || null,
      iniciado_por_email: input.iniciado_por_email || null,
      detalhes: input.detalhes || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao iniciar sincronização:", error.message);
    return null;
  }

  return data?.id as string;
}

export async function finalizarSincronizacao(input: FinalizarSyncInput) {
  try {
    const supabase = await createClient();

    await supabase
      .from("sistema_sincronizacoes")
      .update({
        status: input.status,
        finalizado_em: new Date().toISOString(),
        total_lidos: input.total_lidos || 0,
        total_processados: input.total_processados || 0,
        total_criados: input.total_criados || 0,
        total_atualizados: input.total_atualizados || 0,
        total_erros: input.total_erros || 0,
        detalhes: input.detalhes || {},
        erro: input.erro || null,
      })
      .eq("id", input.id);
  } catch (error) {
    console.error("Erro ao finalizar sincronização:", error);
  }
}
