import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface InstanceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceNumber: string;
  instanceName?: string;
}

export function InstanceSettingsDialog({
  open,
  onOpenChange,
  instanceNumber,
  instanceName,
}: InstanceSettingsDialogProps) {
  const [apiToken, setApiToken] = useState("");
  const { toast } = useToast();

  const saveTokenMutation = useMutation({
    mutationFn: async (data: { instanceNumber: string; apiToken: string }) => {
      return await apiRequest("/api/uazapi/instances", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Token salvo",
        description: "Token Uazapi configurado com sucesso!",
      });
      setApiToken("");
      queryClient.invalidateQueries({ queryKey: ["/api/uazapi/instances", instanceNumber] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o token",
      });
    },
  });

  const handleSave = () => {
    if (!apiToken.trim()) {
      toast({
        variant: "destructive",
        title: "Token obrigatório",
        description: "Digite o token da instância no Uazapi",
      });
      return;
    }

    saveTokenMutation.mutate({
      instanceNumber,
      apiToken: apiToken.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Instância Uazapi</DialogTitle>
          <DialogDescription>
            Configure o token da API Uazapi para {instanceName || instanceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="instance-number">Número da Instância</Label>
            <Input
              id="instance-number"
              value={instanceNumber}
              disabled
              className="bg-muted"
              data-testid="input-instance-number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-token">Token da API Uazapi</Label>
            <Input
              id="api-token"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Digite o token da instância..."
              disabled={saveTokenMutation.isPending}
              data-testid="input-api-token"
            />
            <p className="text-xs text-muted-foreground">
              Este token será usado para enviar mensagens via Uazapi
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveTokenMutation.isPending}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveTokenMutation.isPending}
            data-testid="button-save-token"
          >
            {saveTokenMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              "Salvar Token"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
