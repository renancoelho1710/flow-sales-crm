import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlowShell } from "@/components/dashboard/FlowShell";
import { WhatsAppMonitorClient } from "./WhatsAppMonitorClient";

export default async function WhatsAppMonitorPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuarioInterno } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo, status_operacional, status_administrativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!usuarioInterno) {
    redirect("/login");
  }

  return (
    <FlowShell usuario={usuarioInterno}>
      <WhatsAppMonitorClient usuario={usuarioInterno} />
    </FlowShell>
  );
}
