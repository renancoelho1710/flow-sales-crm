import Image from "next/image";

function iniciais(nome?: string | null) {
  return String(nome || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("") || "U";
}

function corStatus(status?: string | null) {
  const valor = String(status || "").toLowerCase();
  if (valor === "disponivel") return "bg-emerald-500 ring-emerald-100";
  if (valor === "em_ligacao" || valor === "bloqueado") return "bg-red-500 ring-red-100";
  if (valor === "em_atendimento") return "bg-blue-500 ring-blue-100";
  if (valor === "ausente" || valor === "feedback" || valor === "ferias" || valor === "atestado" || valor === "ausente_administrativo") return "bg-amber-500 ring-amber-100";
  return "bg-slate-300 ring-slate-100";
}

export function AvatarStatus({ nome, avatarUrl, status, size = "md" }: { nome?: string | null; avatarUrl?: string | null; status?: string | null; size?: "sm" | "md" | "lg" }) {
  const dimensao = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const bolinha = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div className={`relative ${dimensao} shrink-0`}>
      {avatarUrl ? (
        <Image src={avatarUrl} alt={nome || "Usuário"} width={64} height={64} className={`${dimensao} rounded-full object-cover ring-2 ring-white`} />
      ) : (
        <div className={`${dimensao} flex items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600 ring-2 ring-white`}>
          {iniciais(nome)}
        </div>
      )}
      <span className={`absolute bottom-0 right-0 ${bolinha} rounded-full border-2 border-white ring-2 ${corStatus(status)}`} />
    </div>
  );
}
