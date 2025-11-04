import { Badge } from "@/components/ui/badge";

interface IAConversationStatusBadgeProps {
  status: 'active' | 'paused' | 'inactive';
}

export function IAConversationStatusBadge({ status }: IAConversationStatusBadgeProps) {
  const statusConfig = {
    active: {
      variant: "success" as const,
      text: "IA Ativa",
    },
    paused: {
      variant: "warning" as const,
      text: "IA Pausada",
    },
    inactive: {
      variant: "secondary" as const,
      text: "IA Inativa",
    },
  };

  const { variant, text } = statusConfig[status];

  return (
    <Badge variant={variant} className="cursor-default">
      {text}
    </Badge>
  );
}
