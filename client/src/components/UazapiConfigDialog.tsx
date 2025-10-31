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

interface UazapiConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceNumber?: string;
  instanceName?: string;
}

export function UazapiConfigDialog({
  open,
  onOpenChange,
  instanceNumber,
  instanceName,
}: UazapiConfigDialogProps) {
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
      if (instanceNumber) {
        queryClient.invalidateQueries({ queryKey: ["/api/uazapi/instances", instanceNumber] });
        queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/instances/${instanceNumber}/chats`] });
      }
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
        description: "Digite a API do Uazapi",
      });
      return;
    }

    if (!instanceNumber) {
      toast({
        variant: "destructive",
        title: "Instância não selecionada",
        description: "Selecione uma instância antes de salvar.",
      });
      return;
    }

    saveTokenMutation.mutate({
      instanceNumber: instanceNumber,
      apiToken: apiToken.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar API Uazapi</DialogTitle>
          <DialogDescription>
            Insira a API do Uazapi para {instanceName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="uazapi-token">API Uazapi</Label>
            <Input
              id="uazapi-token"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Insira a API do uazapi aqui"
              disabled={saveTokenMutation.isPending}
              data-testid="input-uazapi-token"
              autoFocus
              className="focus-visible:ring-0 focus-visible:outline-none border-0 focus:border-0"
              style={{ outline: 'none', boxShadow: 'none' }}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveTokenMutation.isPending}
              data-testid="button-cancel-uazapi"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveTokenMutation.isPending}
              data-testid="button-save-uazapi"
            >
              {saveTokenMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
