import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, PlayCircle, PauseCircle, XCircle } from "lucide-react";

interface IAConversationActionsProps {
  status: 'active' | 'paused' | 'inactive';
  onActivate: () => void;
  onPause: () => void;
  onDeactivate: () => void;
}

export function IAConversationActions({ status, onActivate, onPause, onDeactivate }: IAConversationActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === 'active' && (
          <>
            <DropdownMenuItem onClick={onPause}>
              <PauseCircle className="mr-2 h-4 w-4" />
              <span>Pausar IA na Conversa</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeactivate} className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" />
              <span>Desativar IA na Conversa</span>
            </DropdownMenuItem>
          </>
        )}
        {status === 'paused' && (
          <>
            <DropdownMenuItem onClick={onActivate}>
              <PlayCircle className="mr-2 h-4 w-4" />
              <span>Ativar IA na Conversa</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeactivate} className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" />
              <span>Desativar IA na Conversa</span>
            </DropdownMenuItem>
          </>
        )}
        {status === 'inactive' && (
          <DropdownMenuItem onClick={onActivate}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Ativar IA na Conversa</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
