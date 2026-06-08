import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MeusWhatsAppsClient } from "./MeusWhatsAppsClient";

export default async function MeusWhatsAppsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!usuarioInterno) {
    redirect("/login");
  }

  return <MeusWhatsAppsClient usuario={usuarioInterno} />;
}
