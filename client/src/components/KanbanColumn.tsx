import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface KanbanTicket {
  id: string;
  title: string;
  iaName: string;
  type: "automation" | "prompt" | "negotiation";
  priority: "low" | "medium" | "high";
}

interface KanbanColumnProps {
  title: string;
  count: number;
  tickets: KanbanTicket[];
  color?: string;
}

const typeLabels = {
  automation: "Automação",
  prompt: "Prompt",
  negotiation: "Negociação",
};

const priorityColors = {
  low: "bg-chart-2/10 text-chart-2",
  medium: "bg-chart-1/10 text-chart-1",
  high: "bg-destructive/10 text-destructive",
};

export function KanbanColumn({ title, count, tickets, color = "bg-muted" }: KanbanColumnProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <Badge variant="secondary" className="h-6">
          {count}
        </Badge>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto" data-testid={`kanban-column-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="p-3 hover-elevate cursor-pointer transition-all"
            data-testid={`kanban-ticket-${ticket.id}`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium line-clamp-2 flex-1">
                  {ticket.title}
                </h4>
                <Badge className={`text-xs shrink-0 ${priorityColors[ticket.priority]}`}>
                  {ticket.priority === "high" ? "Alta" : ticket.priority === "medium" ? "Média" : "Baixa"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{ticket.iaName}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{typeLabels[ticket.type]}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
