import { ChatMessageComponent } from '../ChatMessage';

export default function ChatMessageExample() {
  const mockMessages = [
    {
      id: "1",
      sender: "ia" as const,
      content: "Olá! Como posso ajudar você hoje?",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "2",
      sender: "user" as const,
      content: "Quero saber mais sobre o produto",
      timestamp: new Date(Date.now() - 3500000).toISOString(),
      tags: ["engaged" as const],
    },
    {
      id: "3",
      sender: "ia" as const,
      content: "Claro! Nosso produto oferece diversas funcionalidades...",
      timestamp: new Date(Date.now() - 3400000).toISOString(),
    },
    {
      id: "4",
      sender: "user" as const,
      content: "Quanto custa?",
      timestamp: new Date(Date.now() - 3300000).toISOString(),
    },
    {
      id: "5",
      sender: "ia" as const,
      content: "O investimento é R$ 297/mês. Aqui está o link para pagamento: link.com/pagar",
      timestamp: new Date(Date.now() - 3200000).toISOString(),
      tags: ["payment_link" as const],
    },
  ];

  return (
    <div className="max-w-2xl space-y-4 p-4">
      {mockMessages.map((msg) => (
        <ChatMessageComponent key={msg.id} message={msg} />
      ))}
    </div>
  );
}
