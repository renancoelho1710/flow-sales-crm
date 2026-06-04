import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeadDetalheClient } from "./LeadDetalheClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
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

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    notFound();
  }

  const { data: interacoes } = await supabase
    .from("lead_interacoes")
    .select("*")
    .eq("lead_id", id)
    .order("criado_em", { ascending: false })
    .limit(40);

  const { data: usuariosAtivos } = await supabase
    .from("usuarios_internos")
    .select("id, nome, email, perfil, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  return (
    
      <LeadDetalheClient
        leadInicial={lead}
        interacoesIniciais={interacoes || []}
        usuario={usuarioInterno}
        usuariosAtivos={usuariosAtivos || []}
      />
    
  );
}

