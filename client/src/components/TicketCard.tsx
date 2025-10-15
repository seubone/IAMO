import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, ExternalLink } from "lucide-react";

export type TicketSeverity = "low" | "medium" | "high" | "critical";
export type TicketType = "automation" | "prompt" | "negotiation";

export interface Ticket {
  id: string;
  iaName: string;
  iaId: string;
  attendanceId: string;
  errorType: TicketType;
  severity: TicketSeverity;
  message: string;
  suggestion?: string;
  origin: string;
  createdAt: string;
  status: "new" | "in_progress" | "resolved";
}

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
}

const severityConfig = {
  low: { color: "bg-chart-2/10 text-chart-2 border-chart-2/20", label: "Baixa" },
  medium: { color: "bg-chart-1/10 text-chart-1 border-chart-1/20", label: "Média" },
  high: { color: "bg-chart-4/10 text-chart-4 border-chart-4/20", label: "Alta" },
  critical: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Crítica" },
};

const typeConfig = {
  automation: { label: "Falha na Automação", borderColor: "border-l-destructive" },
  prompt: { label: "Falha no Prompt", borderColor: "border-l-chart-1" },
  negotiation: { label: "Falha de Negociação", borderColor: "border-l-chart-2" },
  unknown: { label: "Erro Desconhecido", borderColor: "border-l-muted-foreground" },
};

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const severityStyle = severityConfig[ticket.severity] || severityConfig.medium;
  const typeStyle = typeConfig[ticket.errorType] || typeConfig.unknown;

  return (
    <Card
      className={`p-4 border-l-4 ${typeStyle.borderColor} hover-elevate cursor-pointer transition-all`}
      onClick={onClick}
      data-testid={`ticket-card-${ticket.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="shrink-0" data-testid={`ticket-severity-${ticket.id}`}>
              <AlertCircle className="h-3 w-3 mr-1" />
              {severityStyle.label}
            </Badge>
            <Badge variant="secondary" className="shrink-0">
              {typeStyle.label}
            </Badge>
            <span className="text-xs text-muted-foreground">#{ticket.id}</span>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-1" data-testid={`ticket-ia-${ticket.id}`}>
              {ticket.iaName}
            </h3>
            <p className="text-sm text-foreground/80 line-clamp-2" data-testid={`ticket-message-${ticket.id}`}>
              {ticket.message}
            </p>
          </div>

          {ticket.suggestion && (
            <div className="bg-accent/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Sugestão: </span>
                {ticket.suggestion}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(ticket.createdAt).toLocaleString('pt-BR')}
            </span>
            <span>Atendimento: {ticket.attendanceId}</span>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          data-testid={`ticket-external-${ticket.id}`}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
