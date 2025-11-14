import React, { useState } from "react";
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
import { getAuthHeaders } from "@/lib/api";
import { Loader2, Plus, AlertCircle, Smartphone, Settings2, QrCode as QrCodeIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateInstancePayload {
  instanceName: string;
  number?: string;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
  qrcode: boolean; // Sempre true
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  rejectCall?: boolean;
}

interface EvolutionInstanceResponse {
  success: boolean;
  instance: {
    instanceId: string;
    instanceName: string;
    instanceNumber?: string;
    status: string;
    qrcode?: {
      code?: string;
      base64?: string;
    };
    error?: string;
  };
  message: string;
}

export function CreateInstanceDialog({
  open,
  onOpenChange,
}: CreateInstanceDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    instanceName: "",
    number: "",
    integration: "WHATSAPP-BAILEYS" as "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS",
    qrcode: true, // Sempre true - QR Code é obrigatório
    alwaysOnline: true,
    readMessages: true,
    readStatus: true,
    rejectCall: false,
  });

  const [qrcodeDisplayed, setQrcodeDisplayed] = useState<string>("");

  const createInstanceMutation = useMutation({
    mutationFn: async (payload: CreateInstancePayload) => {
      const response = await fetch("/api/instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Erro ao criar instância"
        );
      }

      return response.json() as Promise<EvolutionInstanceResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: `Instância "${data.instance.instanceName}" criada com sucesso`,
      });

      // Mostrar QR Code se disponível
      if (data.instance.qrcode?.base64) {
        setQrcodeDisplayed(data.instance.qrcode.base64);
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-data"] });

      // Resetar formulário
      setFormData({
        instanceName: "",
        number: "",
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: true,
        rejectCall: false,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar instância",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.instanceName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da instância é obrigatório",
        variant: "destructive",
      });
      return;
    }

    createInstanceMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCloseDialog = () => {
    if (!createInstanceMutation.isPending) {
      setQrcodeDisplayed("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Nova Instância
          </DialogTitle>
          <DialogDescription>
            Configure uma nova instância WhatsApp via Evolution API
          </DialogDescription>
        </DialogHeader>

        {qrcodeDisplayed ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl border border-green-200 dark:border-green-800">
                  <QrCodeIcon className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-xl text-gray-900 dark:text-gray-100">QR Code para conectar</h3>
                </div>
              </div>

              <div className="flex justify-center p-6 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700">
                <img
                  src={`data:image/png;base64,${qrcodeDisplayed}`}
                  alt="QR Code"
                  className="w-72 h-72 rounded-lg"
                />
              </div>

              <div className="space-y-3 text-center bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Próximos passos:</p>
                <ol className="text-sm text-amber-800 dark:text-amber-300 space-y-2">
                  <li className="flex items-center justify-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-xs font-semibold">1</span>
                    <span>Abra o WhatsApp no seu celular</span>
                  </li>
                  <li className="flex items-center justify-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-xs font-semibold">2</span>
                    <span>Escaneie o código acima</span>
                  </li>
                  <li className="flex items-center justify-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-xs font-semibold">3</span>
                    <span>Aguarde a conexão ser estabelecida</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button
                onClick={() => {
                  setQrcodeDisplayed("");
                  setFormData({
                    instanceName: "",
                    number: "",
                    integration: "WHATSAPP-BAILEYS",
                    qrcode: true, // Sempre true
                    alwaysOnline: true,
                    readMessages: true,
                    readStatus: true,
                    rejectCall: false,
                  });
                }}
                variant="outline"
                className="w-full h-10 font-semibold"
              >
                Criar Outra Instância
              </Button>
              <Button
                onClick={() => {
                  setQrcodeDisplayed("");
                  onOpenChange(false);
                }}
                className="w-full h-10 font-semibold"
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="ml-2 text-blue-800 dark:text-blue-300">
                Credenciais necessárias: Configure <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-sm font-mono">EVOLUTION_API_URL</code> e <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-sm font-mono">EVOLUTION_API_KEY</code> no servidor
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1">
                <TabsTrigger value="basic" className="flex items-center justify-center gap-2 py-2 text-sm font-medium">
                  <Smartphone className="h-4 w-4" />
                  <span>Configuração Básica</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center justify-center gap-2 py-2 text-sm font-medium">
                  <Settings2 className="h-4 w-4" />
                  <span>Avançado</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-5 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="instanceName" className="text-sm font-semibold">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    placeholder="bot-vendas-001"
                    value={formData.instanceName}
                    onChange={(e) =>
                      handleInputChange("instanceName", e.target.value)
                    }
                    disabled={createInstanceMutation.isPending}
                    required
                    className="h-10 placeholder-gray-600 dark:placeholder-gray-400"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Identificador único da instância. Use apenas letras, números e hífens.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number" className="text-sm font-semibold">Número do WhatsApp (Opcional)</Label>
                  <Input
                    id="number"
                    type="tel"
                    placeholder="551199999999"
                    value={formData.number}
                    onChange={(e) => handleInputChange("number", e.target.value)}
                    disabled={createInstanceMutation.isPending}
                    className="h-10 placeholder-gray-600 dark:placeholder-gray-400"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Se deixar em branco, você receberá um QR Code para conectar.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="integration" className="text-sm font-semibold">Tipo de Integração</Label>
                  <Select
                    value={formData.integration}
                    onValueChange={(value) =>
                      handleInputChange(
                        "integration",
                        value as "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS"
                      )
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHATSAPP-BAILEYS">
                        WhatsApp Baileys - Conta Pessoal
                      </SelectItem>
                      <SelectItem value="WHATSAPP-BUSINESS">
                        WhatsApp Business - Conta Comercial
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escolha conforme o tipo de conta que você possui.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="h-5 w-5 rounded mt-0.5 bg-green-500 dark:bg-green-600 flex items-center justify-center text-white">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <Label className="cursor-pointer font-semibold text-sm">
                      QR Code será Gerado
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Após criar a instância, você receberá um QR Code para escanear com seu celular.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-3 mt-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Comportamento da Instância
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition">
                    <div className="flex-1">
                      <Label className="font-medium text-sm cursor-default">
                        Sempre Online
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status será exibido como disponível o tempo todo
                      </p>
                    </div>
                    <Switch
                      checked={formData.alwaysOnline}
                      onCheckedChange={(checked) =>
                        handleInputChange("alwaysOnline", checked)
                      }
                      disabled={createInstanceMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition">
                    <div className="flex-1">
                      <Label className="font-medium text-sm cursor-default">
                        Marcar Mensagens como Lido
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mensagens recebidas serão marcadas automaticamente como lidas
                      </p>
                    </div>
                    <Switch
                      checked={formData.readMessages}
                      onCheckedChange={(checked) =>
                        handleInputChange("readMessages", checked)
                      }
                      disabled={createInstanceMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition">
                    <div className="flex-1">
                      <Label className="font-medium text-sm cursor-default">
                        Ler Status de Contatos
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permitir acesso aos stories de contatos
                      </p>
                    </div>
                    <Switch
                      checked={formData.readStatus}
                      onCheckedChange={(checked) =>
                        handleInputChange("readStatus", checked)
                      }
                      disabled={createInstanceMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/30 transition">
                    <div className="flex-1">
                      <Label className="font-medium text-sm cursor-default">
                        Rejeitar Chamadas Automaticamente
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Todas as chamadas serão rejeitadas automaticamente
                      </p>
                    </div>
                    <Switch
                      checked={formData.rejectCall}
                      onCheckedChange={(checked) =>
                        handleInputChange("rejectCall", checked)
                      }
                      disabled={createInstanceMutation.isPending}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCloseDialog()}
                disabled={createInstanceMutation.isPending}
                className="h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createInstanceMutation.isPending}
                className="flex-1 h-10 font-semibold"
              >
                {createInstanceMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createInstanceMutation.isPending
                  ? "Criando Instância..."
                  : "Criar Instância"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
