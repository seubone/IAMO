import { KanbanColumn, type KanbanTicket } from "@/components/KanbanColumn";

export default function Tickets() {
  // TODO: Remove mock data
  const newTickets: KanbanTicket[] = [
    {
      id: "1",
      title: "IA não respondendo objeções de preço",
      iaName: "IA Vendas",
      type: "prompt",
      priority: "high",
    },
    {
      id: "2",
      title: "Erro ao enviar mensagem programada",
      iaName: "IA Marketing",
      type: "automation",
      priority: "medium",
    },
  ];

  // TODO: Remove mock data
  const inProgressTickets: KanbanTicket[] = [
    {
      id: "3",
      title: "Cliente não recebeu proposta",
      iaName: "IA Comercial",
      type: "negotiation",
      priority: "high",
    },
  ];

  // TODO: Remove mock data
  const resolvedTickets: KanbanTicket[] = [
    {
      id: "4",
      title: "Correção de fluxo de pagamento",
      iaName: "IA Vendas",
      type: "automation",
      priority: "low",
    },
    {
      id: "5",
      title: "Atualização de prompt de boas-vindas",
      iaName: "IA Suporte",
      type: "prompt",
      priority: "low",
    },
  ];

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
          />
          <KanbanColumn
            title="Em Atendimento"
            count={inProgressTickets.length}
            tickets={inProgressTickets}
            color="bg-chart-2"
          />
          <KanbanColumn
            title="Resolvido"
            count={resolvedTickets.length}
            tickets={resolvedTickets}
            color="bg-chart-3"
          />
        </div>
      </div>
    </div>
  );
}
