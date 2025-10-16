import { useState } from "react";
import { MoreVertical, Smile, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MessageActionsProps {
  messageId: string;
  fromMe: boolean;
  onReact: (emoji: string) => void;
  onDelete: () => void;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageActions({ messageId, fromMe, onReact, onDelete }: MessageActionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-message-menu-${messageId}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setShowEmojiPicker(true)}
            data-testid={`button-react-${messageId}`}
          >
            <Smile className="h-4 w-4 mr-2" />
            Reagir
          </DropdownMenuItem>
          {fromMe && (
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive"
              data-testid={`button-delete-${messageId}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar para todos
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha uma reação</DialogTitle>
            <DialogDescription>
              Selecione um emoji para reagir à mensagem
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-6 gap-2 py-4">
            {QUICK_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="outline"
                className="text-2xl h-12 w-12 p-0"
                onClick={() => {
                  onReact(emoji);
                  setShowEmojiPicker(false);
                }}
                data-testid={`button-emoji-${emoji}`}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
