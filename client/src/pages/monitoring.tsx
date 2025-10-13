import { useState } from "react";
import { IAStatusTicker, type IATickerItem } from "@/components/IAStatusTicker";
import { TicketCard, type Ticket } from "@/components/TicketCard";
import { IADetailPanel, type IAAction } from "@/components/IADetailPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Monitoring() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // TODO: Remove mock data
  const mockIAs: IATickerItem[] = [
    { id: "1", name: "IA Vendas WhatsApp", status: "active" },
    { id: "2", name: "IA Suporte Email", status: "paused" },
    { id: "3", name: "IA Marketing", status: "active" },
    { id: "4", name: "IA Cobrança", status: "inactive" },
    { id: "5", name: "IA Onboarding", status: "active" },
  ];

  // TODO: Remove mock data
  const mockTickets: Ticket[] = [
    {
      id: "TCK-001",
      iaName: "IA Vendas WhatsApp",
      attendanceId: "ATD-12345",
      errorType: "prompt",
      severity: "high",
      message: "IA não está respondendo corretamente às objeções de preço.",
      suggestion: "Verificar se o prompt inclui instruções sobre política de descontos.",
      origin: "N8N Webhook",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      status: "new",
    },
    {
      id: "TCK-002",
      iaName: "IA Suporte Email",
      attendanceId: "ATD-12346",
      errorType: "automation",
      severity: "critical",
      message: "Falha ao enviar email automático de confirmação de pedido.",
      suggestion: "Verificar configuração do servidor SMTP no N8N.",
      origin: "N8N Webhook",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      status: "in_progress",
    },
    {
      id: "TCK-003",
      iaName: "IA Marketing",
      attendanceId: "ATD-12347",
      errorType: "negotiation",
      severity: "medium",
      message: "Cliente não recebeu proposta de upgrade solicitada.",
      origin: "N8N Webhook",
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      status: "new",
    },
  ];

  // TODO: Remove mock data
  const mockActions: IAAction[] = [
    {
      id: "1",
      action: "IA Pausada",
      user: "João Silva",
      reason: "Taxa de conversão abaixo de 20%",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  return (
    <div className="flex flex-col h-screen">
      <IAStatusTicker items={mockIAs} />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-background">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tickets..."
                  className="pl-10"
                  data-testid="input-search-tickets"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-48" data-testid="select-severity">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" data-testid="button-filters">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mockTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        </div>

        {selectedTicket && (
          <div className="w-96 border-l bg-card">
            <IADetailPanel
              iaName={selectedTicket.iaName}
              status="paused"
              onActivate={() => console.log('Ativar IA')}
              onPause={() => console.log('Pausar IA')}
              onDeactivate={() => console.log('Inativar IA')}
              actions={mockActions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
