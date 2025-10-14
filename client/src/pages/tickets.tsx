import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { KanbanColumn, type KanbanTicket } from "@/components/KanbanColumn";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ticket, IA } from "@shared/schema";

export default function Tickets() {
  const { toast } = useToast();

  const { data: ticketsData = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: iasData = [] } = useQuery<IA[]>({
    queryKey: ["/api/ias"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return await apiRequest(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Status atualizado",
        description: "O ticket foi movido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status do ticket.",
        variant: "destructive",
      });
    },
  });

  const tickets = useMemo(() => {
    return ticketsData.map((ticket): KanbanTicket => {
      const ia = iasData.find((ia) => ia.id === ticket.iaId);
      return {
        id: ticket.id,
        title: ticket.message,
        iaName: ia?.name || "IA Desconhecida",
        type: ticket.errorType as "automation" | "prompt" | "negotiation",
        priority: ticket.severity === "critical" || ticket.severity === "high" 
          ? "high" 
          : ticket.severity === "medium" 
          ? "medium" 
          : "low",
        status: ticket.status as "new" | "in_progress" | "resolved",
      };
    });
  }, [ticketsData, iasData]);

  const handleTicketDrop = (ticketId: string, newStatus: "new" | "in_progress" | "resolved") => {
    updateStatusMutation.mutate({ ticketId, status: newStatus });
  };

  const newTickets = tickets.filter((t) => t.status === "new");
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");

  if (ticketsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando tickets...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold font-heading">Tickets</h1>
        <p className="text-muted-foreground">Gerencie e resolva tickets em formato Kanban</p>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          <KanbanColumn
            title="Novo Ticket"
            count={newTickets.length}
            tickets={newTickets}
            color="bg-chart-1"
            status="new"
            onTicketDrop={handleTicketDrop}
          />
          <KanbanColumn
            title="Em Atendimento"
            count={inProgressTickets.length}
            tickets={inProgressTickets}
            color="bg-chart-2"
            status="in_progress"
            onTicketDrop={handleTicketDrop}
          />
          <KanbanColumn
            title="Resolvido"
            count={resolvedTickets.length}
            tickets={resolvedTickets}
            color="bg-chart-3"
            status="resolved"
            onTicketDrop={handleTicketDrop}
          />
        </div>
      </div>
    </div>
  );
}
