import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NovoLeadClient } from "./NovoLeadClient";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuarioInterno) {
    redirect("/login");
  }

  return (
    
      <NovoLeadClient perfil={usuarioInterno.perfil} />
    
  );
}

