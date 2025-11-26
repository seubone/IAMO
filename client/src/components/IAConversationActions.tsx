import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, PlayCircle, PauseCircle, XCircle } from "lucide-react";

interface IAConversationActionsProps {
  status: 'active' | 'paused' | 'inactive';
  onActivate: () => void;
  onPause: (duration?: number) => void;
  onDeactivate: () => void;
}

export function IAConversationActions({ status, onActivate, onPause, onDeactivate }: IAConversationActionsProps) {
  const statusLabel = {
    active: 'IA Ativa',
    paused: 'IA Pausada',
    inactive: 'IA Inativa',
  };

  const statusColor = {
    active: 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20',
    paused: 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20',
    inactive: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1 ${statusColor[status]}`}
        >
          <span className="font-medium">{statusLabel[status]}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {status !== 'active' && (
          <>
            <DropdownMenuItem onClick={onActivate}>
              <PlayCircle className="mr-2 h-4 w-4" />
              <span>Ativar IA</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {status === 'active' && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PauseCircle className="mr-2 h-4 w-4" />
                <span>Pausar IA por</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {[
                  { value: 300000, label: "5 minutos" },
                  { value: 900000, label: "15 minutos" },
                  { value: 1800000, label: "30 minutos" },
                  { value: 3600000, label: "1 hora" },
                  { value: 7200000, label: "2 horas" },
                ].map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onPause(option.value)}
                  >
                    <span>{option.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}

        {status !== 'inactive' && (
          <DropdownMenuItem onClick={onDeactivate} className="text-destructive">
            <XCircle className="mr-2 h-4 w-4" />
            <span>Desativar IA</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
