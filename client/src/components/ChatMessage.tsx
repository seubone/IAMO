import { Badge } from "@/components/ui/badge";

export type MessageSender = "ia" | "user" | "system";
export type MessageTag = "engaged" | "payment_link" | "quote" | "paid";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
  tags?: MessageTag[];
}

interface ChatMessageProps {
  message: ChatMessage;
}

const tagConfig = {
  engaged: { label: "Lead Engajado", variant: "default" as const },
  payment_link: { label: "Link de Pagamento", variant: "default" as const },
  quote: { label: "Orçamento", variant: "secondary" as const },
  paid: { label: "Pago", variant: "default" as const },
};

export function ChatMessageComponent({ message }: ChatMessageProps) {
  const isSystem = message.sender === "system";
  const isUser = message.sender === "user";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <p className="text-xs text-muted-foreground italic" data-testid={`message-${message.id}`}>
          {message.content}
        </p>
      </div>
    );
  }

  const messageColor = isUser ? "bg-purple-700 dark:bg-purple-800 text-white" : "bg-muted";

  return (
    <div
      className="flex gap-3 flex-row"
      data-testid={`message-${message.id}`}
    >
      <div className="flex flex-col gap-1 max-w-[75%] items-start flex-1">
        <div className={`rounded-lg px-4 py-2 break-words overflow-hidden ${messageColor}`}>
          <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>

          {message.tags?.map((tag) => (
            <Badge
              key={tag}
              variant={tagConfig[tag].variant}
              className="text-xs h-5"
            >
              {tagConfig[tag].label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
