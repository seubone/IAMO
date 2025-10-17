import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { IAStatusTicker, type IATickerItem } from "@/components/IAStatusTicker";
import { TicketCard, type Ticket as TicketCardType } from "@/components/TicketCard";
import { IADetailPanel, type IAAction } from "@/components/IADetailPanel";
import { IAStatusDialog } from "@/components/IAStatusDialog";
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
import { queryClient } from "@/lib/queryClient";
import { iaAPI, actionsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { IA, Ticket, Action } from "@shared/schema";

export default function Monitoring() {
  const [selectedTicket, setSelectedTicket] = useState<TicketCardType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"activate" | "pause" | "deactivate" | null>(null);
  const { toast } = useToast();

  const { data: ias = [] } = useQuery<IA[]>({
    queryKey: ["/api/ias"],
  });

  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: actions = [] } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
  });

  const updateIAStatusMutation = useMutation({
    mutationFn: ({ iaId, status, reason }: { iaId: string; status: string; reason: string }) =>
      iaAPI.updateStatus(iaId, status, reason),
    onSuccess: (_, variables) => {
      // Invalidação granular: apenas queries relacionadas a esta IA específica
      queryClient.invalidateQueries({ 
        queryKey: ["/api/ias"],
        exact: true 
      });
      
      // Invalidar apenas ações relacionadas a esta IA
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
                 key[0] === "/api/actions" && 
                 (key.length === 1 || key[1] === variables.iaId);
        }
      });
      
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

  const iaTickerItems: IATickerItem[] = useMemo(() => {
    return ias.map((ia) => ({
      id: ia.id,
      name: ia.name,
      status: ia.status as "active" | "paused" | "inactive",
    }));
  }, [ias]);

  const ticketCards: TicketCardType[] = useMemo(() => {
    return tickets.map((ticket) => {
      const ia = ias.find((ia) => ia.id === ticket.iaId);
      return {
        id: ticket.id,
        iaName: ia?.name || "IA Desconhecida",
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
  }, [tickets, ias]);

  const selectedIA = useMemo(() => {
    if (!selectedTicket) return null;
    return ias.find((ia) => ia.id === selectedTicket.iaId);
  }, [selectedTicket, ias]);

  const selectedIAActions: IAAction[] = useMemo(() => {
    if (!selectedIA) return [];
    return actions
      .filter((action) => action.iaId === selectedIA.id)
      .map((action) => ({
        id: action.id,
        action: action.action,
        user: action.userId,
        reason: action.reason,
        timestamp: typeof action.createdAt === "string" ? action.createdAt : new Date(action.createdAt).toISOString(),
      }));
  }, [selectedIA, actions]);

  const handleStatusAction = (action: "activate" | "pause" | "deactivate") => {
    setPendingAction(action);
    setDialogOpen(true);
  };

  const handleConfirmStatusChange = (reason: string) => {
    if (!selectedIA || !pendingAction) return;

    const statusMap = {
      activate: "active",
      pause: "paused",
      deactivate: "inactive",
    };

    updateIAStatusMutation.mutate({
      iaId: selectedIA.id,
      status: statusMap[pendingAction],
      reason,
    });
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
            {ticketCards.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        </div>

        {selectedTicket && selectedIA && (
          <div className="w-96 border-l bg-card">
            <IADetailPanel
              iaName={selectedIA.name}
              status={selectedIA.status as "active" | "paused" | "inactive"}
              onActivate={() => handleStatusAction("activate")}
              onPause={() => handleStatusAction("pause")}
              onDeactivate={() => handleStatusAction("deactivate")}
              actions={selectedIAActions}
            />
          </div>
        )}
      </div>

      {selectedIA && (
        <IAStatusDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setPendingAction(null);
          }}
          onConfirm={handleConfirmStatusChange}
          iaName={selectedIA.name}
          action={pendingAction || "activate"}
          isLoading={updateIAStatusMutation.isPending}
        />
      )}
    </div>
  );
}
