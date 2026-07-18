import { DashboardClient, type DashboardVisao } from "./DashboardClient";

type DashboardPageProps = {
  searchParams?: Promise<{
    visao?: string;
  }>;
};

function resolverVisao(valor?: string | null): DashboardVisao {
  if (valor === "operacional") return "operacional";
  if (valor === "estrategico") return "estrategico";
  return "geral";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const visao = resolverVisao(params?.visao);

  return <DashboardClient visaoInicial={visao} />;
}
