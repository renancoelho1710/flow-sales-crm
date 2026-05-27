export function StatusBadge({ texto, tipo = "gray" }: { texto: string; tipo?: "blue" | "green" | "red" | "gray" | "amber" | "purple" }) {
  const classes = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    gray: "bg-slate-100 text-slate-600 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    purple: "bg-purple-50 text-purple-700 ring-purple-100",
  }[tipo];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes}`}>{texto}</span>;
}

export function statusCor(status?: string | null) {
  const valor = String(status || "").toLowerCase();
  if (["disponivel", "ativo", "online"].includes(valor)) return "green";
  if (["em_ligacao", "ocupado", "bloqueado", "inativo"].includes(valor)) return "red";
  if (["ausente", "pausa", "feedback", "ausente_administrativo", "ferias", "atestado"].includes(valor)) return "amber";
  if (["em_atendimento"].includes(valor)) return "blue";
  return "gray";
}

export function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    disponivel: "Disponível",
    em_ligacao: "Em ligação",
    em_atendimento: "Em atendimento",
    ausente: "Ausente",
    offline: "Offline",
    ferias: "Férias",
    atestado: "Atestado",
    feedback: "Feedback",
    ausente_administrativo: "Ausente administrativo",
    bloqueado: "Bloqueado",
  };

  return labels[String(status || "")] || "—";
}
