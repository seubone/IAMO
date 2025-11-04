import { useState, useEffect, useMemo } from "react";
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
import { useSelectedInstance } from "@/hooks/use-selected-instance";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarDataUri } from "@/lib/avatar-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BotConfigDialog } from "./BotConfigDialog";
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
import type { EvolutionInstance } from "@/types/whatsapp";

interface InstanceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceNumber?: string;
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
  const selectedInstance = useSelectedInstance((state) => state.selectedInstance);
  const setSelectedInstance = useSelectedInstance((state) => state.setSelectedInstance);

  const persistedInstanceNumber = useMemo(() => {
    if (typeof window === "undefined" || !open) return "";
    try {
      const persisted = localStorage.getItem("selected-instance-storage");
      if (persisted) {
        const parsed = JSON.parse(persisted);
        return parsed?.state?.selectedInstance?.number?.trim() || "";
      }
    } catch (error) {
      console.warn("Não foi possível recuperar instância persistida:", error);
    }
    return "";
  }, [open]);

  const baseInstanceNumber = useMemo(() => {
    return (
      instanceNumber?.trim() ||
      selectedInstance?.number?.trim() ||
      persistedInstanceNumber ||
      ""
    );
  }, [instanceNumber, selectedInstance?.number, persistedInstanceNumber]);

  const baseInstanceName = useMemo(() => {
    return (
      instanceName ||
      selectedInstance?.name ||
      selectedInstance?.number ||
      baseInstanceNumber
    );
  }, [instanceName, selectedInstance?.name, selectedInstance?.number, baseInstanceNumber]);

  const [manualInstanceNumber, setManualInstanceNumber] = useState("");
  const [manualInstanceName, setManualInstanceName] = useState("");

  useEffect(() => {
    if (baseInstanceNumber && manualInstanceNumber !== baseInstanceNumber) {
      setManualInstanceNumber(baseInstanceNumber);
      setManualInstanceName(baseInstanceName || baseInstanceNumber);
    }
  }, [baseInstanceNumber, baseInstanceName, manualInstanceNumber]);

  const resolvedInstanceNumber = manualInstanceNumber || baseInstanceNumber;
  const effectiveInstanceName = manualInstanceName || baseInstanceName || resolvedInstanceNumber;
  const isInstanceAvailable = Boolean(resolvedInstanceNumber);

  // Get profile picture from selected instance
  const profilePicUrl = useMemo(() => {
    return selectedInstance?.profilePicUrl || null;
  }, [selectedInstance?.profilePicUrl]);

  // Generate avatar fallback
  const avatarFallback = useMemo(() => {
    if (!effectiveInstanceName) return "?";
    const trimmed = effectiveInstanceName.trim();
    if (trimmed.length === 0) return "?";
    const digitsOnly = trimmed.replace(/\D/g, "");
    const hasLetters = /[A-Za-z]/.test(trimmed);
    if (digitsOnly && !hasLetters) {
      return digitsOnly.length >= 2 ? digitsOnly.slice(-2) : digitsOnly;
    }
    const tokens = trimmed.split(/\s+/).map((token) => token.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean);
    if (tokens.length === 0) {
      const letters = trimmed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      return letters.slice(0, 2) || "?";
    }
    const initials = tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() || "").join("");
    return initials || "?";
  }, [effectiveInstanceName]);

  // Generate fallback avatar URI if no profile picture
  const fallbackAvatarUri = useMemo(() => {
    if (profilePicUrl) return null;
    return generateAvatarDataUri(avatarFallback);
  }, [profilePicUrl, avatarFallback]);

  const { data: availableInstances = [] } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/whatsapp/instances", { modal: "settings" }],
    enabled: open,
  });


  useEffect(() => {
    if (!isInstanceAvailable && showDeleteDialog) {
      setShowDeleteDialog(false);
    }
  }, [isInstanceAvailable, showDeleteDialog]);
  // Check if instance has a token
  const { data: instanceData } = useQuery({
    queryKey: ["/api/uazapi/instances", resolvedInstanceNumber],
    queryFn: async () => {
      if (!resolvedInstanceNumber) return null;
      const response = await apiRequest(`/api/uazapi/instances/${resolvedInstanceNumber}`);
      return response;
    },
    enabled: open && isInstanceAvailable,
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
      if (resolvedInstanceNumber) {
        queryClient.invalidateQueries({ queryKey: ["/api/uazapi/instances", resolvedInstanceNumber] });
        // Recarrega chats da instância para refletir a mudança
        queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/instances/${resolvedInstanceNumber}/chats`] });
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
      if (resolvedInstanceNumber) {
        queryClient.invalidateQueries({ queryKey: ["/api/uazapi/instances", resolvedInstanceNumber] });
        // Recarrega chats da instância para refletir a mudança
        queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/instances/${resolvedInstanceNumber}/chats`] });
      }
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

    if (!isInstanceAvailable) {
      toast({
        variant: "destructive",
        title: "Instância não selecionada",
        description: "Selecione uma instância antes de salvar o token.",
      });
      return;
    }

    saveTokenMutation.mutate({
      instanceNumber: resolvedInstanceNumber,
      apiToken: apiToken.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurações da Instância</DialogTitle>
          <DialogDescription>
            Configure o token da API e o bot para {effectiveInstanceName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/10 p-3">
            {isInstanceAvailable ? (
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={profilePicUrl || fallbackAvatarUri || undefined} alt={effectiveInstanceName} />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Instância selecionada</p>
                  <p className="text-sm font-medium text-foreground truncate">{effectiveInstanceName}</p>
                  <p className="text-xs text-muted-foreground">Número: {resolvedInstanceNumber}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                ⚠️ Instância não carregada. Escolha uma instância na lista acima.
              </p>
            )}
          </div>

          <Tabs defaultValue="token" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="token">Token Uazapi</TabsTrigger>
              <TabsTrigger value="bot">Bot/IA</TabsTrigger>
            </TabsList>

            {/* Token Tab */}
            <TabsContent value="token" className="space-y-4">
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

              <div className="flex justify-between items-center gap-2">
                {instanceData?.hasToken && isInstanceAvailable && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={saveTokenMutation.isPending || deleteTokenMutation.isPending || !isInstanceAvailable}
                    data-testid="button-delete-token"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover Token
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={saveTokenMutation.isPending || deleteTokenMutation.isPending}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveTokenMutation.isPending || deleteTokenMutation.isPending || !isInstanceAvailable}
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
            </TabsContent>

            {/* Bot Tab */}
            <TabsContent value="bot">
              {isInstanceAvailable ? (
                <BotConfigDialog
                  instanceNumber={resolvedInstanceNumber}
                  instanceId={selectedInstance?.id || ""}
                  instanceName={effectiveInstanceName}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  Selecione uma instância para configurar o bot
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Token Uazapi</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o token da instância {effectiveInstanceName}?
              A instância ficará sem token e não será possível enviar mensagens via Uazapi até
              configurar um novo token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTokenMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!isInstanceAvailable) {
                  toast({
                    variant: "destructive",
                    title: "Instância não selecionada",
                    description: "Selecione uma instância antes de remover o token.",
                  });
                  return;
                }
                deleteTokenMutation.mutate(resolvedInstanceNumber);
              }}
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
