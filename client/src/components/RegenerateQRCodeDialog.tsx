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
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode as QrCodeIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RegenerateQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  instanceName: string;
  onQRCodeGenerated?: (qrCodeBase64: string) => void;
}

export function RegenerateQRCodeDialog({
  open,
  onOpenChange,
  instanceId,
  instanceName,
  onQRCodeGenerated,
}: RegenerateQRCodeDialogProps) {
  const { toast } = useToast();
  const [qrcodeDisplayed, setQrcodeDisplayed] = useState<string>("");

  const generateQRCodeMutation = useMutation({
    mutationFn: async () => {
      // Conectar instância para gerar QR Code
      const response = await fetch(`/api/instances/${instanceId}/connect`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Erro ao gerar QR Code"
        );
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.qrcode?.base64) {
        setQrcodeDisplayed(data.qrcode.base64);
        onQRCodeGenerated?.(data.qrcode.base64);
        toast({
          title: "QR Code Gerado",
          description: "Escaneie o código para conectar a instância",
        });
      } else {
        toast({
          title: "Aviso",
          description: "QR Code não foi gerado. Tente novamente.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao gerar QR Code",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setQrcodeDisplayed("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5" />
            Gerar QR Code para Conexão
          </DialogTitle>
          <DialogDescription>
            Instância: {instanceName}
          </DialogDescription>
        </DialogHeader>

        {qrcodeDisplayed ? (
          <div className="space-y-6 py-4">
            <Alert variant="default" className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                A instância está desconectada. Escaneie o QR Code abaixo para reconectar.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl border border-green-200 dark:border-green-800">
                  <QrCodeIcon className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-xl text-gray-900 dark:text-gray-100">
                    QR Code para Conexão
                  </h3>
                </div>
              </div>

              <div className="flex justify-center p-6 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700">
                <img
                  src={`data:image/png;base64,${qrcodeDisplayed}`}
                  alt="QR Code"
                  className="w-72 h-72 rounded-lg"
                />
              </div>

              <div className="space-y-3 text-center bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Como conectar:
                </p>
                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                  <li className="flex items-center justify-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs font-semibold">
                      1
                    </span>
                    <span>Abra WhatsApp no seu celular</span>
                  </li>
                  <li className="flex items-center justify-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs font-semibold">
                      2
                    </span>
                    <span>Escaneie o código acima</span>
                  </li>
                  <li className="flex items-center justify-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs font-semibold">
                      3
                    </span>
                    <span>Aguarde a conexão ser estabelecida</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setQrcodeDisplayed("");
                  generateQRCodeMutation.mutate();
                }}
                variant="outline"
                className="flex-1 h-10 font-semibold"
                disabled={generateQRCodeMutation.isPending}
              >
                Gerar Novo QR Code
              </Button>
              <Button onClick={handleClose} className="flex-1 h-10 font-semibold">
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                Clique no botão abaixo para gerar um novo QR Code de conexão.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={() => generateQRCodeMutation.mutate()}
                disabled={generateQRCodeMutation.isPending}
                className="flex-1 h-10 font-semibold"
              >
                {generateQRCodeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {generateQRCodeMutation.isPending ? "Gerando..." : "Gerar QR Code"}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="h-10 font-semibold"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
