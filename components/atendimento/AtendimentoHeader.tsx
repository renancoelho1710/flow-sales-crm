"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  FileInput,
  FolderArchive,
  GitBranch,
  Headphones,
  MessageCircle,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { ReactNode } from "react";

type ActiveArea =
  | "fila"
  | "prioridades"
  | "funil"
  | "conversas"
  | "indicar"
  | "solicitacoes"
  | "sincronizar"
  | "arquivados";

type Action = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type Props = {
  active: ActiveArea;
  title: string;
  description: string;
  eyebrow?: string;
  canManage?: boolean;
  primaryAction?: Action;
  secondaryAction?: Action;
  aside?: ReactNode;
};

const coreItems = [
  { key: "fila" as const, label: "Fila", href: "/dashboard/leads", icon: Headphones },
  { key: "prioridades" as const, label: "Prioridades", href: "/dashboard/leads/tarefas", icon: BellRing },
  { key: "funil" as const, label: "Funil", href: "/dashboard/kanban", icon: GitBranch },
  { key: "conversas" as const, label: "Conversas", href: "/dashboard/3cx/whatsapp", icon: MessageCircle },
  { key: "indicar" as const, label: "Indicar cliente", href: "/dashboard/leads/novo", icon: UserPlus },
];

const managementItems = [
  { key: "solicitacoes" as const, label: "Aprovações", href: "/dashboard/leads/solicitacoes", icon: Sparkles },
  { key: "sincronizar" as const, label: "Sincronizar C2S", href: "/dashboard/c2s", icon: FileInput },
  { key: "arquivados" as const, label: "Arquivados", href: "/dashboard/leads?filtro=arquivados", icon: FolderArchive },
];

export function AtendimentoHeader({
  active,
  title,
  description,
  eyebrow = "Central de atendimento",
  canManage = false,
  primaryAction,
  secondaryAction,
  aside,
}: Props) {
  const items = canManage ? [...coreItems, ...managementItems] : coreItems;

  return (
    <section className={`fs-attention-hero fs-attention-hero--${active}`}>
      <div className="fs-attention-hero__glow" aria-hidden="true" />

      <div className="fs-attention-hero__content">
        <div className="fs-attention-hero__copy">
          <p className="fs-attention-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="fs-attention-description">{description}</p>

          <nav className="fs-attention-journey" aria-label="Fluxo do atendimento">
            {items.map((item) => {
              const Icon = item.icon;
              const selected = item.key === active;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={selected ? "is-active" : ""}
                  aria-current={selected ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="fs-attention-hero__actions">
          {aside}
          <div className="fs-attention-action-row">
            {secondaryAction ? (
              <Link href={secondaryAction.href} className="fs-attention-button fs-attention-button--secondary">
                {secondaryAction.label}
              </Link>
            ) : null}

            {primaryAction ? (
              <Link href={primaryAction.href} className="fs-attention-button fs-attention-button--primary">
                {primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
