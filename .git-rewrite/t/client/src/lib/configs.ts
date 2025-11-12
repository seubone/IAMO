import { Circle } from "lucide-react";
import type { IAStatus } from "@/components/IAStatusTicker";
import type { TicketSeverity, TicketType } from "@/components/TicketCard";

// Configurações de Status de IA
export const IA_STATUS_CONFIG = {
  active: {
    icon: Circle,
    color: "text-chart-3 fill-chart-3",
    badgeColor: "bg-chart-3 text-white",
    label: "Ativo",
  },
  paused: {
    icon: Circle,
    color: "text-chart-1 fill-chart-1",
    badgeColor: "bg-chart-1 text-primary-foreground",
    label: "Pausado",
  },
  inactive: {
    icon: Circle,
    color: "text-destructive fill-destructive",
    badgeColor: "bg-destructive text-destructive-foreground",
    label: "Inativo",
  },
} as const;

export function getIAStatusConfig(status: IAStatus) {
  return IA_STATUS_CONFIG[status];
}

// Configurações de Severidade de Ticket
export const TICKET_SEVERITY_CONFIG = {
  low: {
    color: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    label: "Baixa",
  },
  medium: {
    color: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    label: "Média",
  },
  high: {
    color: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    label: "Alta",
  },
  critical: {
    color: "bg-destructive/10 text-destructive border-destructive/20",
    label: "Crítica",
  },
} as const;

export function getTicketSeverityConfig(severity: TicketSeverity) {
  return TICKET_SEVERITY_CONFIG[severity] || TICKET_SEVERITY_CONFIG.medium;
}

// Configurações de Tipo de Ticket
export const TICKET_TYPE_CONFIG = {
  automation: {
    label: "Falha na Automação",
    borderColor: "border-l-destructive",
  },
  prompt: {
    label: "Falha no Prompt",
    borderColor: "border-l-chart-1",
  },
  negotiation: {
    label: "Falha de Negociação",
    borderColor: "border-l-chart-2",
  },
  unknown: {
    label: "Erro Desconhecido",
    borderColor: "border-l-muted-foreground",
  },
} as const;

export function getTicketTypeConfig(type: TicketType) {
  return TICKET_TYPE_CONFIG[type] || TICKET_TYPE_CONFIG.unknown;
}
