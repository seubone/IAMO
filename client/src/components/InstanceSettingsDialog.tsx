import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  // Check if instance has a token
  const { data: instanceData } = useQuery({
    queryKey: ["/api/uazapi/instances", instanceNumber],
    enabled: open && !!instanceNumber,
  });

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

  const deleteTokenMutation = useMutation({
    mutationFn: async (instanceNumber: string) => {
      return await apiRequest(`/api/uazapi/instances/${instanceNumber}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Token removido",
        description: "Token Uazapi removido com sucesso!",
      });
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/uazapi/instances", instanceNumber] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: error.message || "Não foi possível remover o token",
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

        <div className="flex justify-between items-center gap-2">
          {instanceData?.hasToken && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={saveTokenMutation.isPending || deleteTokenMutation.isPending}
              data-testid="button-delete-token"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover Token
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveTokenMutation.isPending || deleteTokenMutation.isPending}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveTokenMutation.isPending || deleteTokenMutation.isPending}
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
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Token Uazapi</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o token da instância {instanceName || instanceNumber}?
              A instância ficará sem token e não será possível enviar mensagens via Uazapi até
              configurar um novo token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTokenMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTokenMutation.mutate(instanceNumber)}
              disabled={deleteTokenMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTokenMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
