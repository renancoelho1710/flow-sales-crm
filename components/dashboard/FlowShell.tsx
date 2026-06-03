"use client";

import type React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

type UsuarioShell = {
  id?: string;
  nome: string;
  email?: string | null;
  perfil: string;
  ativo?: boolean;
  avatar_url?: string | null;
  status_operacional?: string | null;
  status_administrativo?: string | null;
};

export function FlowShell({ children, usuario }: { children: React.ReactNode; usuario: UsuarioShell }) {
  return <DashboardShell usuario={usuario}>{children}</DashboardShell>;
}
