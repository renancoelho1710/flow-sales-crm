import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlowShell } from "@/components/dashboard/FlowShell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuarioInterno, error } = await supabase
    .from("usuarios_internos")
    .select(
      "id, nome, email, perfil, ativo, avatar_url, status_operacional, status_administrativo"
    )
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (error || !usuarioInterno) {
    redirect("/login");
  }

  return <FlowShell usuario={usuarioInterno}>{children}</FlowShell>;
}