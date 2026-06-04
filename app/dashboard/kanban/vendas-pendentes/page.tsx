import { redirect } from "next/navigation";

export default function Page() {
  redirect("/dashboard/kanban?filtro=vendas-pendentes");
}
