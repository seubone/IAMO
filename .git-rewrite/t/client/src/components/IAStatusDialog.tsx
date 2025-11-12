import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface IAStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  iaName: string;
  action: "activate" | "pause" | "deactivate";
  isLoading?: boolean;
}

const actionConfig = {
  activate: {
    title: "Ativar IA",
    description: "Por favor, informe o motivo para ativar esta IA:",
    confirmText: "Ativar",
  },
  pause: {
    title: "Pausar IA",
    description: "Por favor, informe o motivo para pausar esta IA:",
    confirmText: "Pausar",
  },
  deactivate: {
    title: "Inativar IA",
    description: "Por favor, informe o motivo para inativar esta IA:",
    confirmText: "Inativar",
  },
};

export function IAStatusDialog({
  isOpen,
  onClose,
  onConfirm,
  iaName,
  action,
  isLoading = false,
}: IAStatusDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason("");
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const config = actionConfig[action];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent data-testid="dialog-ia-status-change">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
            <br />
            <span className="font-semibold">{iaName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo</Label>
          <Textarea
            id="reason"
            placeholder="Ex: Taxa de conversão baixa, ajustes no prompt, campanha finalizada..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            data-testid="input-status-reason"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            data-testid="button-confirm-status-change"
          >
            {isLoading ? "Processando..." : config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
