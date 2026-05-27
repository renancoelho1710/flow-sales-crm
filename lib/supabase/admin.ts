import { createClient } from "@supabase/supabase-js";

function getEnv(nome: string) {
  const valor = process.env[nome];

  if (!valor) {
    throw new Error(`${nome} não foi configurada no .env.local`);
  }

  return valor;
}

export function createAdminClient() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
