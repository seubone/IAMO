import { KanbanColumn } from '../KanbanColumn';

export default function KanbanColumnExample() {
  const mockTickets = [
    {
      id: "1",
      title: "IA não respondendo objeções de preço",
      iaName: "IA Vendas",
      type: "prompt" as const,
      priority: "high" as const,
    },
    {
      id: "2",
      title: "Erro ao enviar mensagem programada",
      iaName: "IA Marketing",
      type: "automation" as const,
      priority: "medium" as const,
    },
    {
      id: "3",
      title: "Cliente não recebendo proposta",
      iaName: "IA Comercial",
      type: "negotiation" as const,
      priority: "high" as const,
    },
  ];

  return (
    <div className="h-96 p-4">
      <KanbanColumn
        title="Novo Ticket"
        count={mockTickets.length}
        tickets={mockTickets}
        color="bg-chart-1"
      />
    </div>
  );
}
