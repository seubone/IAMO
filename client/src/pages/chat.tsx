import { useState } from "react";
import { ChatMessageComponent, type ChatMessage } from "@/components/ChatMessage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, StickyNote, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Chat() {
  const [iaEnabled, setIaEnabled] = useState(true);
  const [message, setMessage] = useState("");

  // TODO: Remove mock data
  const mockMessages: ChatMessage[] = [
    {
      id: "1",
      sender: "ia",
      content: "Olá! Como posso ajudar você hoje?",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "2",
      sender: "user",
      content: "Quero saber mais sobre o produto",
      timestamp: new Date(Date.now() - 3500000).toISOString(),
      tags: ["engaged"],
    },
    {
      id: "3",
      sender: "ia",
      content: "Claro! Nosso produto oferece diversas funcionalidades incríveis...",
      timestamp: new Date(Date.now() - 3400000).toISOString(),
    },
    {
      id: "4",
      sender: "user",
      content: "Quanto custa?",
      timestamp: new Date(Date.now() - 3300000).toISOString(),
    },
    {
      id: "5",
      sender: "ia",
      content: "O investimento é R$ 297/mês. Aqui está o link: link.com/pagar",
      timestamp: new Date(Date.now() - 3200000).toISOString(),
      tags: ["payment_link"],
    },
  ];

  const handleSend = () => {
    console.log('Mensagem enviada:', message);
    setMessage("");
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold font-heading">Chat com Lead</h1>
            <p className="text-sm text-muted-foreground">Atendimento #ATD-12345</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Label htmlFor="ia-toggle" className="text-sm">IA</Label>
            <Switch
              id="ia-toggle"
              checked={iaEnabled}
              onCheckedChange={setIaEnabled}
              data-testid="switch-ia-enabled"
            />
            <Bot className={`h-5 w-5 ${iaEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mockMessages.map((msg) => (
            <ChatMessageComponent key={msg.id} message={msg} />
          ))}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              data-testid="input-chat-message"
            />
            <Button onClick={handleSend} data-testid="button-send-message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-80 border-l p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notas
          </h3>
          <Card className="p-3">
            <Textarea
              placeholder="Adicionar nota sobre a conversa..."
              className="min-h-32 resize-none"
              data-testid="textarea-notes"
            />
            <Button className="w-full mt-2" size="sm" data-testid="button-save-note">
              Salvar Nota
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
