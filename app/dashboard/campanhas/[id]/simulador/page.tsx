import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SimuladorCopaAzul } from "../../components/SimuladorCopaAzul";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function podeGerenciar(perfil?: string | null) {
  return ["adm", "admin", "supervisor", "gestor"].includes(
    String(perfil || "").toLowerCase(),
  );
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios_internos")
    .select("id, perfil")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .single();

  if (!usuario) redirect("/login");

  const { data: campanha } = await supabase
    .from("campanhas_telemarketing")
    .select("id, nome, tem_simulador, simulador_liberado, simulador_tipo")
    .eq("id", id)
    .single();

  if (!campanha) redirect("/dashboard/campanhas");

  const gerencia = podeGerenciar(usuario.perfil);

  if (campanha.tem_simulador !== true) {
    redirect("/dashboard/campanhas");
  }

  if (campanha.simulador_tipo !== "copa_azul") {
    redirect("/dashboard/campanhas");
  }

  if (campanha.simulador_liberado !== true && !gerencia) {
    redirect("/dashboard/campanhas");
  }

  return (
    <SimuladorCopaAzul
      campanhaNome={campanha.nome}
      podeGerenciar={gerencia}
      bloqueadoParaOperador={campanha.simulador_liberado !== true}
    />
  );
}
