import { RelatoriosClient } from "./RelatoriosClient";

type PageProps = {
  searchParams?: Promise<{
    aba?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const abaParam = String(params?.aba || "geral").toLowerCase();

  const aba =
    abaParam === "equipe"
      ? "equipe"
      : abaParam === "colaboradores" || abaParam === "unidades" || abaParam === "usuarios"
        ? "colaboradores"
        : "geral";

  return <RelatoriosClient abaInicial={aba} />;
}
