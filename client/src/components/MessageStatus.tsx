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
  },
  SENDING: {
    icon: Clock,
    color: "text-muted-foreground",
    label: "Enviando...",
    tooltip: "Mensagem sendo processada",
    animation: "animate-spin",
  },
  SENT: {
    icon: Check,
    color: "text-muted-foreground",
    label: "Enviada",
    tooltip: "Mensagem enviada",
    animation: "",
  },
  DELIVERED: {
    icon: CheckCheck,
    color: "text-green-600 dark:text-green-400",
    label: "Entregue",
    tooltip: "Mensagem entregue",
    animation: "",
  },
  READ: {
    icon: CheckCheck,
    color: "text-blue-600 dark:text-blue-400",
    label: "Lida",
    tooltip: "Mensagem lida",
    animation: "",
  },
  FAILED: {
    icon: AlertCircle,
    color: "text-destructive",
    label: "Falha ao enviar",
    tooltip: "Falha ao enviar. Toque para reenviar.",
    animation: "",
  },
  ERROR: {
    icon: AlertCircle,
    color: "text-destructive",
    label: "Erro",
    tooltip: "Erro ao enviar. Toque para reenviar.",
    animation: "",
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
          <span className={`inline-flex items-center transition-all duration-200 ${config.animation}`}>
            <Icon
              className={`h-3 w-3 ${config.color}`}
              data-testid={`status-${statusUpper.toLowerCase()}`}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
