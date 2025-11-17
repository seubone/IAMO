import { Check, CheckCheck, Clock, XCircle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface MessageStatusProps {
  status?: string;
  fromMe: boolean;
}

const statusConfig = {
  PENDING: {
    icon: Clock,
    color: "text-muted-foreground",
    label: "Enviando...",
    tooltip: "Mensagem sendo processada",
    animation: "animate-spin",
    text: "⏱️",
  },
  SENDING: {
    icon: Clock,
    color: "text-muted-foreground",
    label: "Enviando...",
    tooltip: "Mensagem sendo processada",
    animation: "animate-spin",
    text: "⏱️",
  },
  SENT: {
    icon: Check,
    color: "text-muted-foreground",
    label: "Enviada",
    tooltip: "Mensagem enviada",
    animation: "",
    text: "✓",
  },
  DELIVERED: {
    icon: CheckCheck,
    color: "text-muted-foreground",
    label: "Entregue (no banco de dados)",
    tooltip: "Mensagem recebida no banco de dados",
    animation: "",
    text: "✓✓",
  },
  READ: {
    icon: CheckCheck,
    color: "text-blue-600 dark:text-blue-400",
    label: "Lida",
    tooltip: "Mensagem lida pelo destinatário",
    animation: "",
    text: "✓✓",
  },
  FAILED: {
    icon: AlertCircle,
    color: "text-destructive",
    label: "Falha ao enviar",
    tooltip: "Falha ao enviar. Toque para reenviar.",
    animation: "",
    text: "✗",
  },
  ERROR: {
    icon: AlertCircle,
    color: "text-destructive",
    label: "Erro",
    tooltip: "Erro ao enviar. Toque para reenviar.",
    animation: "",
    text: "✗",
  },
};

export function MessageStatus({ status, fromMe }: MessageStatusProps) {
  // Só mostrar status para mensagens enviadas por mim
  if (!fromMe || !status) {
    return null;
  }

  const statusUpper = status?.toUpperCase() || "PENDING";
  const config =
    statusConfig[statusUpper as keyof typeof statusConfig] ||
    statusConfig.PENDING;

  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {config.text ? (
            // Mostrar texto (✓, ✓✓, etc)
            <span className={`inline-flex items-center text-xs transition-all duration-200 ${config.animation} ${config.color}`} data-testid={`status-${statusUpper.toLowerCase()}`}>
              {config.text}
            </span>
          ) : (
            // Fallback para ícone
            <span className={`inline-flex items-center transition-all duration-200 ${config.animation}`}>
              <Icon
                className={`h-3 w-3 ${config.color}`}
                data-testid={`status-${statusUpper.toLowerCase()}`}
              />
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
