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
import { Loader2, Trash2, Send, CheckCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSelectedInstance } from "@/hooks/use-selected-instance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [sendAPI, setSendAPI] = useState<"evolution" | "uazapi">("evolution");
  const [testRecipient, setTestRecipient] = useState("");
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

  const resolvedInstanceNumber = manualInstanceNumber;
  const effectiveInstanceName = manualInstanceName || baseInstanceName || resolvedInstanceNumber;
  const isInstanceAvailable = Boolean(resolvedInstanceNumber);

  const { data: availableInstances = [] } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/whatsapp/instances", { modal: "settings" }],
    enabled: open,
  });

  const handleInstanceChange = (value: string) => {
    setManualInstanceNumber(value);
    const instance = availableInstances.find((item) => item.number === value);
    if (instance) {
      setManualInstanceName(instance.name || instance.number);
      setSelectedInstance(instance);
    } else {
      setManualInstanceName("");
    }
  };

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

  // Get send API config
  const { data: sendConfigData } = useQuery({
    queryKey: ["/api/send-config", resolvedInstanceNumber],
    queryFn: async () => {
      const response = await apiRequest(`/api/send-config/${resolvedInstanceNumber}`);
      return response as { sendAPI: "evolution" | "uazapi" };
    },
    enabled: open && isInstanceAvailable,
    onSuccess: (data) => {
      setSendAPI(data.sendAPI);
    },
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

  const saveSendConfigMutation = useMutation({
    mutationFn: async (api: "evolution" | "uazapi") => {
      return await apiRequest(`/api/send-config/${resolvedInstanceNumber}`, {
        method: "PUT",
        body: JSON.stringify({ sendAPI: api }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuração salva",
        description: "API de envio configurada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/send-config", resolvedInstanceNumber] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a configuração",
      });
    },
  });

  const testSendMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/whatsapp/test-send", {
        method: "POST",
        body: JSON.stringify({
          instanceNumber: resolvedInstanceNumber,
          recipientNumber: testRecipient,
          message: "Teste de envio",
        }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Teste completado",
        description: `Evolution: ${data.evolution?.success ? "✅" : "❌"} | UazAPI: ${data.uazapi?.success ? "✅" : "❌"}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro no teste",
        description: error.message || "Não foi possível testar o envio",
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Instância Uazapi</DialogTitle>
          <DialogDescription>
            Configure o token da API Uazapi para {effectiveInstanceName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">

          <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/10 p-3">
            {isInstanceAvailable ? (
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Instância selecionada</p>
                <p className="text-sm font-medium text-foreground">{effectiveInstanceName}</p>
                <p className="text-xs text-muted-foreground">Número: {resolvedInstanceNumber}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                ⚠️ Instância não carregada. Escolha uma instância na lista acima.
              </p>
            )}
          </div>

          <Tabs defaultValue="token" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="token">Token UazAPI</TabsTrigger>
              <TabsTrigger value="api">API de Envio</TabsTrigger>
            </TabsList>

            {/* Aba: Token UazAPI */}
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

            {/* Aba: API de Envio */}
            <TabsContent value="api" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label>Escolha a API para envio de mensagens</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se a API selecionada falhar, o sistema tentará automaticamente a outra como fallback
                  </p>
                </div>
                <RadioGroup value={sendAPI} onValueChange={(value: any) => setSendAPI(value)}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-muted hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="evolution" id="evolution" />
                    <Label htmlFor="evolution" className="flex-1 cursor-pointer">
                      <span className="font-medium">🔵 Evolution</span>
                      <p className="text-xs text-muted-foreground">API padrão do WhatsApp Web</p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-muted hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="uazapi" id="uazapi" />
                    <Label htmlFor="uazapi" className="flex-1 cursor-pointer">
                      <span className="font-medium">🟢 UazAPI</span>
                      <p className="text-xs text-muted-foreground">Envio direto (requer token configurado)</p>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Seção de Teste */}
                <div className="mt-6 pt-4 border-t space-y-3">
                  <Label>Testar Envio</Label>
                  <Input
                    placeholder="Número para teste (ex: 558399999999)"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    disabled={testSendMutation.isPending}
                  />
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!isInstanceAvailable) {
                        toast({
                          variant: "destructive",
                          title: "Instância não selecionada",
                          description: "Escolha uma instância antes de testar o envio.",
                        });
                        return;
                      }
                      if (!testRecipient.trim()) {
                        toast({
                          variant: "destructive",
                          title: "Campo obrigatório",
                          description: "Digite um número para teste",
                        });
                        return;
                      }
                      testSendMutation.mutate();
                    }}
                    disabled={testSendMutation.isPending}
                  >
                    {testSendMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Mensagem Teste
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saveSendConfigMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!isInstanceAvailable) {
                      toast({
                        variant: "destructive",
                        title: "Instância não selecionada",
                        description: "Selecione uma instância antes de salvar a API de envio.",
                      });
                      return;
                    }
                    saveSendConfigMutation.mutate(sendAPI);
                  }}
                  disabled={saveSendConfigMutation.isPending}
                >
                  {saveSendConfigMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Configuração"
                  )}
                </Button>
              </div>
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
