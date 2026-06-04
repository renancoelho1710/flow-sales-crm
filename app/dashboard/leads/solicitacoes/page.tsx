import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SolicitacoesLeadsClient } from "./SolicitacoesLeadsClient";

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
    .select("id, nome, email, perfil, ativo")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuarioInterno) {
    redirect("/login");
  }

  const perfil = String(usuarioInterno.perfil || "").toLowerCase();
  const podeAnalisar = ["adm", "admin", "supervisor", "gerente", "suporte"].includes(perfil);

  const { data: solicitacoes, error } = await supabase
    .from("lead_solicitacoes")
    .select("*")
    .order("solicitado_em", { ascending: false })
    .limit(80);

  return (
    
      <SolicitacoesLeadsClient
        usuario={usuarioInterno}
        podeAnalisar={podeAnalisar}
        solicitacoes={solicitacoes || []}
        erroInicial={error?.message || ""}
      />
    
  );
}

