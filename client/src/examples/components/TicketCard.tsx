import { TicketCard } from '../TicketCard';

export default function TicketCardExample() {
  const mockTicket = {
    id: "TCK-001",
    iaName: "IA Vendas WhatsApp",
    attendanceId: "ATD-12345",
    errorType: "prompt" as const,
    severity: "high" as const,
    message: "IA não está respondendo corretamente às objeções de preço. Cliente mencionou 'muito caro' e a IA não ofereceu desconto configurado.",
    suggestion: "Verificar se o prompt inclui instruções sobre política de descontos para objeções de preço.",
    origin: "N8N Webhook",
    createdAt: new Date().toISOString(),
    status: "new" as const,
  };

  return (
    <div className="max-w-2xl">
      <TicketCard ticket={mockTicket} onClick={() => console.log('Ticket clicked')} />
    </div>
  );
}
