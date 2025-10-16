import { Check, CheckCheck, Clock, XCircle } from "lucide-react";

interface MessageStatusProps {
  status?: string;
  fromMe: boolean;
}

export function MessageStatus({ status, fromMe }: MessageStatusProps) {
  // Só mostrar status para mensagens enviadas por mim
  if (!fromMe || !status) {
    return null;
  }

  const renderIcon = () => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'SENDING':
        return <Clock className="h-3 w-3" data-testid="status-pending" />;
      
      case 'SENT':
        return <Check className="h-3 w-3" data-testid="status-sent" />;
      
      case 'DELIVERED':
        return <CheckCheck className="h-3 w-3" data-testid="status-delivered" />;
      
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-500" data-testid="status-read" />;
      
      case 'FAILED':
      case 'ERROR':
        return <XCircle className="h-3 w-3 text-destructive" data-testid="status-failed" />;
      
      default:
        return null;
    }
  };

  return (
    <span className="inline-flex items-center">
      {renderIcon()}
    </span>
  );
}
