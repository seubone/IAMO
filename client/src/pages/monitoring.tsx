import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { IAStatusTicker, type IATickerItem } from "@/components/IAStatusTicker";
import { TicketCard, type Ticket as TicketCardType } from "@/components/TicketCard";
import { IADetailPanel, type IAAction } from "@/components/IADetailPanel";
import { IAStatusDialog } from "@/components/IAStatusDialog";
import { ContactManagementModal } from "@/components/ContactManagementModal";
import { TicketListSkeleton, IADetailSkeleton } from "@/components/MonitoringSkeletons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { aiDataAPI, ticketAPI, actionsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useClearCache } from "@/hooks/use-clear-cache";
import type { BotInstanceConfig } from "@shared/bot-instance.types";
import type { Ticket, Action } from "@shared/schema";

// Mapeia o status da API para o status do componente
const mapStatus = (ia: BotInstanceConfig): "active" | "paused" | "inactive" => {
  if (!ia.has_bot_enabled) {
    return "inactive";
  }
  if (ia.bot_paused) {
    return "paused";
  }
  return "active";
};

export default function Monitoring() {
  const [selectedTicket, setSelectedTicket] = useState<TicketCardType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedInstanceForContacts, setSelectedInstanceForContacts] = useState<{
    number: string;
    name: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<"activate" | "pause" | "deactivate" | null>(null);
  const { toast } = useToast();

  useClearCache([["/api/ai-data"], ["/api/tickets"], ["/api/actions"]]);

  const { data: ias = [], isLoading: iasLoading } = useQuery<BotInstanceConfig[]>({
    queryKey: ["/api/ai-data"],
    queryFn: () => aiDataAPI.getAll(),
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    queryFn: () => ticketAPI.getAll(),
  });

  const { data: actions = [], isLoading: actionsLoading } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
    queryFn: () => actionsAPI.getAll(),
  });

  const updateIAStatusMutation = useMutation({
    mutationFn: (data: { iaId: number; payload: Partial<BotInstanceConfig> }) =>
      aiDataAPI.update(data.iaId, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });

      toast({
        title: "Status atualizado",
        description: "O status da IA foi alterado com sucesso.",
      });
      setDialogOpen(false);
      setPendingAction(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status da IA.",
      });
    },
  });

  const iaTickerItems: IATickerItem[] = ias.map((ia) => ({
    id: String(ia.id),
    name: ia.bot_name || `Instância ${ia.instance_number}`,
    status: mapStatus(ia),
  }));

  const ticketCards: TicketCardType[] = tickets.map((ticket) => {
    const ia = ias.find((ia) => String(ia.id) === ticket.iaId || ia.instance_number === ticket.iaId);
    return {
      id: ticket.id,
      iaName: ia?.bot_name || "IA Desconhecida",
      iaId: ticket.iaId,
      attendanceId: ticket.attendanceId,
      errorType: ticket.errorType as "automation" | "prompt" | "negotiation",
      severity: ticket.severity as "low" | "medium" | "high" | "critical",
      message: ticket.message,
      suggestion: ticket.suggestion || undefined,
      origin: ticket.origin,
      createdAt: typeof ticket.createdAt === "string" ? ticket.createdAt : new Date(ticket.createdAt).toISOString(),
      status: ticket.status as "new" | "in_progress" | "resolved",
    };
  });

  const selectedIA = selectedTicket
    ? ias.find((ia) => String(ia.id) === selectedTicket.iaId || ia.instance_number === selectedTicket.iaId)
    : null;

  const selectedIAActions: IAAction[] = selectedIA
    ? actions
        .filter((action) => action.iaId === String(selectedIA.id) || action.iaId === selectedIA.instance_number)
        .map((action) => ({
          id: action.id,
          action: action.action,
          user: action.userId,
          reason: action.reason,
          timestamp: typeof action.createdAt === "string" ? action.createdAt : new Date(action.createdAt).toISOString(),
        }))
    : [];

  const handleStatusAction = (action: "activate" | "pause" | "deactivate") => {
    setPendingAction(action);
    setDialogOpen(true);
  };

  const handleConfirmStatusChange = (reason: string) => {
    if (!selectedIA || !pendingAction) return;

    let payload: Partial<BotInstanceConfig> = {};

    switch (pendingAction) {
      case "activate":
        payload = { has_bot_enabled: true, bot_paused: false };
        break;
      case "pause":
        payload = { has_bot_enabled: true, bot_paused: true };
        break;
      case "deactivate":
        payload = { has_bot_enabled: false, bot_paused: false };
        break;
    }

    updateIAStatusMutation.mutate({ iaId: selectedIA.id!, payload });
  };

  return (
    <div className="flex flex-col h-screen">
      <IAStatusTicker items={iaTickerItems} />
      
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
            {ticketsLoading ? (
              <TicketListSkeleton />
            ) : ticketCards.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground" data-testid="text-no-tickets">
                  Nenhum ticket encontrado
                </p>
              </div>
            ) : (
              ticketCards.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => setSelectedTicket(ticket)}
                />
              ))
            )}
          </div>
        </div>

        {selectedTicket && selectedIA ? (
          <div className="w-96 border-l bg-card">
            {actionsLoading ? (
              <IADetailSkeleton />
            ) : (
              <IADetailPanel
                iaName={selectedIA.bot_name || "IA Desconhecida"}
                status={mapStatus(selectedIA)}
                onActivate={() => handleStatusAction("activate")}
                onPause={() => handleStatusAction("pause")}
                onDeactivate={() => handleStatusAction("deactivate")}
                onManageContacts={() => {
                  setSelectedInstanceForContacts({
                    number: selectedIA.instance_number,
                    name: selectedIA.bot_name || `Instância ${selectedIA.instance_number}`,
                  });
                  setContactModalOpen(true);
                }}
                actions={selectedIAActions}
              />
            )}
          </div>
        ) : null}
      </div>

      {dialogOpen && selectedIA && (
        <IAStatusDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setPendingAction(null);
          }}
          onConfirm={handleConfirmStatusChange}
          iaName={selectedIA.bot_name || "IA Desconhecida"}
          action={pendingAction || "activate"}
          isLoading={updateIAStatusMutation.isPending}
        />
      )}

      {selectedInstanceForContacts && (
        <ContactManagementModal
          open={contactModalOpen}
          onOpenChange={setContactModalOpen}
          instanceNumber={selectedInstanceForContacts.number}
          instanceName={selectedInstanceForContacts.name}
        />
      )}
    </div>
  );
}

