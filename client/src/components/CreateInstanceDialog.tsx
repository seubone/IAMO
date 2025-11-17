import React, { useState, useEffect, useCallback } from "react";
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
import { Loader2, Plus, Smartphone, QrCode as QrCodeIcon, Copy, CheckCircle2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateInstancePayload {
  instanceName: string;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
  qrcode: boolean; // Sempre true
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

const QR_REFRESH_SECONDS = 60;

const getInitialFormState = () => ({
  instanceName: "",
  integration: "WHATSAPP-BAILEYS" as "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS",
  qrcode: true,
});

export function CreateInstanceDialog({
  open,
  onOpenChange,
}: CreateInstanceDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(() => getInitialFormState());
  const [qrcodeDisplayed, setQrcodeDisplayed] = useState<string>("");
  const [currentInstanceId, setCurrentInstanceId] = useState<string>("");
  const [qrcodeCountdown, setQrcodeCountdown] = useState<number>(0);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const requestNewQrCode = useCallback(async () => {
    if (!currentInstanceId) return;

    try {
      setIsRefreshingQr(true);
      const response = await fetch(`/api/instances/${currentInstanceId}/connect`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
        },
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Erro ao gerar novo QR Code:", await response.text());
        return;
      }

      const data = await response.json();
      let base64String =
        data?.instance?.qrcode?.base64 || data?.qrcode?.base64 || data?.qrcode;

      if (base64String?.includes("base64,")) {
        base64String = base64String.split("base64,")[1];
      }

      base64String = base64String?.trim() || "";

      if (base64String) {
        setQrcodeDisplayed(base64String);
      }
      setQrcodeCountdown(QR_REFRESH_SECONDS);
    } catch (error) {
      console.error("Erro ao gerar novo QR Code:", error);
    } finally {
      setIsRefreshingQr(false);
    }
  }, [currentInstanceId]);

  useEffect(() => {
    if (!currentInstanceId) return;

    requestNewQrCode();
    const interval = setInterval(requestNewQrCode, QR_REFRESH_SECONDS * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [currentInstanceId, requestNewQrCode]);

  useEffect(() => {
    if (!qrcodeDisplayed || qrcodeCountdown <= 0) return;

    const timer = setTimeout(() => {
      setQrcodeCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [qrcodeDisplayed, qrcodeCountdown]);

  useEffect(() => {
    if (!qrcodeDisplayed || qrcodeCountdown > 0 || isRefreshingQr) return;
    requestNewQrCode();
  }, [qrcodeCountdown, qrcodeDisplayed, isRefreshingQr, requestNewQrCode]);

  useEffect(() => {
    if (!currentInstanceId || !qrcodeDisplayed) {
      setConnectionStatus(null);
      return;
    }

    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchConnectionState = async () => {
      try {
        const response = await fetch(`/api/instances/${currentInstanceId}/connection-state`, {
          headers: {
            ...getAuthHeaders(),
          },
          credentials: "include",
        });

        if (!response.ok) return;

        const data = await response.json();
        const rawState =
          data?.connectionState?.state ||
          data?.connectionState?.status ||
          data?.connectionState?.connectionStatus ||
          (typeof data?.connectionState === "string" ? data.connectionState : null);

        if (isMounted && rawState) {
          setConnectionStatus(String(rawState));
          if (String(rawState).toLowerCase() === "connected" && interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      } catch (error) {
        console.error("Erro ao verificar conexão da instância:", error);
      }
    };

    fetchConnectionState();
    interval = setInterval(fetchConnectionState, 4000);

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentInstanceId, qrcodeDisplayed]);

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

      if (data.instance.instanceId) {
        setCurrentInstanceId(data.instance.instanceId);
      }

      // Mostrar QR Code se disponível
      if (data.instance.qrcode?.base64) {
        let base64String = data.instance.qrcode.base64;
        if (base64String.includes("base64,")) {
          base64String = base64String.split("base64,")[1];
        }
        base64String = base64String?.trim() || "";
        if (base64String) {
          setQrcodeDisplayed(base64String);
          setQrcodeCountdown(QR_REFRESH_SECONDS);
        }
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-data"] });

      // Resetar apenas os campos do formulário
      resetFormFields();
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

  const isSubmitting = createInstanceMutation.isPending;
  const qrProgress = Math.max(
    0,
    Math.min(
      100,
      qrcodeCountdown > 0
        ? (qrcodeCountdown / QR_REFRESH_SECONDS) * 100
        : 0
    )
  );
  const normalizedConnectionStatus = connectionStatus?.toLowerCase?.();
  const isInstanceConnected = normalizedConnectionStatus === "connected";

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

  const resetFormFields = () => {
    setFormData(getInitialFormState());
  };

  const resetAllState = () => {
    resetFormFields();
    setQrcodeDisplayed("");
    setCurrentInstanceId("");
    setQrcodeCountdown(0);
    setConnectionStatus(null);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return;
    resetAllState();
    onOpenChange(false);
  };

  const handleCopyInstanceId = async () => {
    if (!currentInstanceId) return;
    try {
      await navigator.clipboard.writeText(currentInstanceId);
      toast({
        title: "ID copiado",
        description: "ID da instância copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível copiar",
        description: "Copie manualmente o ID exibido.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-[640px] overflow-hidden border-0 p-0 rounded-3xl shadow-2xl">
        <div className="bg-primary/5 px-8 pb-5 pt-8 border-b border-border/60">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-primary">
            <span className="inline-flex h-12 w-12 items-center justify-center text-primary">
              <svg width="41" height="28" viewBox="0 0 41 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.9983 0.00112537C25.739 0.0639051 27.2661 1.05999 27.9664 2.5613L28.0274 2.69151C28.4489 3.68549 28.5348 6.14869 28.5027 6.16394C28.5367 7.19151 28.4752 8.51499 28.3375 9.98793C27.8548 10.0383 27.4016 10.1627 26.9776 10.3598C26.4215 10.6247 25.9639 10.9885 25.6064 11.4519V10.1214H22.8265V18.3447C22.8265 19.88 24.0711 21.1246 25.6064 21.1246V15.0472C25.6064 14.1867 25.8255 13.5313 26.2623 13.0811C26.7072 12.6232 27.3072 12.3916 28.0624 12.3862C27.5274 16.3801 26.5662 20.8375 25.4632 23.4317C25.4572 23.4477 25.0375 24.5727 24.7072 25.1325C24.2485 25.9839 23.4993 26.6495 22.6287 27.0555C21.6572 27.5085 20.6154 27.6376 19.6194 27.4266C19.4256 27.3589 18.6269 27.1348 17.9454 26.8968C13.7502 25.5947 5.67046 20.8616 2.49401 17.8939C1.99845 17.449 0.843633 16.2798 0.461985 15.5453C0.127052 14.827 -0.0268405 14.0651 0.00382302 13.2553C0.0925959 12.2222 0.525751 11.2247 1.22939 10.4607C1.72632 9.9484 3.36679 8.74725 3.39894 8.73225C5.20983 7.45198 8.33161 5.75688 11.8827 4.10099C15.2663 2.52318 18.441 1.28217 20.5853 0.639135C20.6356 0.656949 23.0466 -0.0315174 23.9983 0.00112537ZM9.3461 7.06236C8.39282 7.06238 7.54529 7.22776 6.80383 7.55877C6.06233 7.87656 5.48664 8.34044 5.07616 8.94953C4.66568 9.55863 4.46012 10.2737 4.46012 11.0947C4.46014 11.9685 4.65866 12.6703 5.05582 13.1999C5.46629 13.7163 5.94987 14.107 6.50599 14.3718C7.07533 14.6234 7.81019 14.8817 8.71054 15.1465C9.37254 15.3319 9.88924 15.5036 10.26 15.6625C10.644 15.8081 10.9622 16.0137 11.2137 16.2785C11.4652 16.5433 11.5905 16.8813 11.5905 17.2917C11.5905 17.7947 11.4054 18.2052 11.0347 18.5229C10.664 18.8274 10.1542 18.9794 9.50561 18.9795C8.87009 18.9795 8.36678 18.814 7.99603 18.4831C7.63859 18.1521 7.43931 17.7022 7.39952 17.133H4.42025C4.43355 17.9803 4.6659 18.7153 5.11604 19.3375C5.56622 19.9597 6.17513 20.4364 6.94299 20.7674C7.72423 21.0984 8.5984 21.2638 9.56501 21.2638C10.5845 21.2637 11.4651 21.0787 12.2066 20.7079C12.9481 20.324 13.5104 19.8136 13.8944 19.178C14.2783 18.5425 14.4705 17.8541 14.4705 17.1126C14.4705 16.252 14.2658 15.5565 13.8553 15.0269C13.4449 14.4974 12.9548 14.1003 12.3856 13.8355C11.8162 13.5707 11.0806 13.3061 10.1802 13.0413C9.51841 12.8427 9.0023 12.6701 8.6316 12.5245C8.27412 12.3656 7.96929 12.1671 7.71772 11.9288C7.47941 11.6773 7.3605 11.3661 7.36046 10.9954C7.36046 10.4658 7.51885 10.0617 7.83653 9.78367C8.16753 9.50562 8.60472 9.36622 9.14754 9.36619C9.76988 9.36619 10.2668 9.52528 10.6376 9.84307C11.0215 10.1476 11.2263 10.5383 11.2528 11.0149H14.3118C14.2191 9.77032 13.7222 8.80392 12.8218 8.1154C11.9346 7.41369 10.7761 7.06236 9.3461 7.06236ZM17.0901 10.1214V18.3439C17.0901 19.8796 18.3351 21.1246 19.8708 21.1246V10.1214H17.0901ZM36.4908 9.9627C37.8413 9.9627 38.9275 10.3794 39.7484 11.2135C40.5826 12.0344 41 13.1866 41 14.6696V21.1246C39.4643 21.1246 38.2193 19.8796 38.2193 18.3439V15.0472C38.2193 14.1866 38.0003 13.5313 37.5634 13.0811C37.1264 12.6177 36.531 12.3854 35.7763 12.3853C35.0215 12.3853 34.4191 12.6177 33.9689 13.0811C33.532 13.5313 33.313 14.1866 33.313 15.0472V21.1246C31.7772 21.1246 30.5323 19.8796 30.5323 18.3439V15.0472C30.5323 14.1867 30.314 13.5313 29.8772 13.0811C29.4402 12.6177 28.844 12.3853 28.0893 12.3853C28.0803 12.3853 28.0713 12.3861 28.0624 12.3862C28.1731 11.56 28.2659 10.7538 28.3375 9.98793C28.5029 9.97067 28.6721 9.9627 28.8445 9.9627C29.7051 9.96272 30.473 10.1478 31.1483 10.5185C31.8236 10.876 32.3465 11.3927 32.7173 12.068C33.0748 11.4324 33.5914 10.922 34.2667 10.538C34.9551 10.1542 35.6966 9.96276 36.4908 9.9627ZM18.4996 5.55278C18.0098 5.55287 17.5993 5.71196 17.2683 6.02966C16.9506 6.3342 16.7923 6.71858 16.7923 7.18199C16.7923 7.64532 16.9506 8.03611 17.2683 8.35384C17.5993 8.6583 18.0098 8.81029 18.4996 8.81038C18.9894 8.81038 19.3936 8.65822 19.7113 8.35384C20.0423 8.03611 20.2077 7.64532 20.2077 7.18199C20.2077 6.71854 20.0423 6.33421 19.7113 6.02966C19.3935 5.71198 18.9894 5.55278 18.4996 5.55278Z" fill="url(#paint0_linear_2485_35)"/>
                <defs>
                  <linearGradient id="paint0_linear_2485_35" x1="12.68" y1="6.59689" x2="40.3941" y2="14.8266" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3441AD" />
                    <stop offset="1" stopColor="#A9B2F4" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            Criar instância nova
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            Defina os dados básicos para ativar uma nova instância.
          </DialogDescription>
        </div>

        <div className="relative p-6">
          {qrcodeDisplayed ? (
            <div className="space-y-6">
              {connectionStatus && (
                <div
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                    isInstanceConnected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-border/60 bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {isInstanceConnected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  <span>
                    {isInstanceConnected
                      ? "Instância conectada! Você já pode fechar este QR Code."
                      : `Aguardando conexão... Status atual: ${connectionStatus}`}
                  </span>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-2xl border border-border bg-background/60 p-6 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                    <QrCodeIcon className="h-4 w-4" />
                    QR Code ativo
                  </div>
                  <div className="mt-6 flex justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
                    <img
                      src={`data:image/png;base64,${qrcodeDisplayed}`}
                      alt="QR Code"
                      className="h-72 w-72 rounded-xl bg-white p-2 shadow-inner"
                    />
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Validade</span>
                      <span>
                        {qrcodeCountdown > 0
                          ? `${qrcodeCountdown}s`
                          : isRefreshingQr
                            ? "Atualizando..."
                            : "0s"}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${qrProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Smartphone className="h-4 w-4" />
                    Como conectar
                  </div>
                  <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">1.</span>
                      Abra o WhatsApp no celular e vá em <strong>Aparelhos conectados</strong>.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">2.</span>
                      Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para este QR Code.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">3.</span>
                      Aguarde a confirmação. O status da instância será atualizado automaticamente.
                    </li>
                  </ol>
                  {currentInstanceId && (
                    <div className="mt-4 rounded-2xl border border-dashed border-primary/40 bg-background/80 p-3 text-left">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">ID da instância</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="flex-1 truncate text-sm font-semibold text-foreground">{currentInstanceId}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs"
                          onClick={handleCopyInstanceId}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-dashed pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" type="button" className="h-10" onClick={resetAllState}>
                  Criar outra instância
                </Button>
                <Button
                  type="button"
                  className="h-10"
                  onClick={() => {
                    resetAllState();
                    onOpenChange(false);
                  }}
                >
                  Voltar para lista
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              {isSubmitting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[32px] bg-background/85 backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Criando instância...
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="instanceName" className="text-base font-semibold text-foreground">
                        Nome da instância*
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Identifique com letras, números e hífens para localizar facilmente.
                      </p>
                    </div>
                    <Input
                      id="instanceName"
                      placeholder="Nome da instância aqui"
                      value={formData.instanceName}
                      onChange={(e) => handleInputChange("instanceName", e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="h-14 rounded-2xl border-0 bg-muted px-5 text-base placeholder:text-muted-foreground/70 shadow-inner"
                    />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="integration" className="text-base font-semibold text-foreground">
                        Tipo da integração*
                      </Label>
                      <p className="text-sm text-muted-foreground">Escolha conforme o tipo da conta.</p>
                    </div>
                    <Select
                      value={formData.integration}
                      onValueChange={(value) => handleInputChange("integration", value as "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS")}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-14 rounded-2xl border-0 bg-muted px-5 text-base placeholder:text-muted-foreground/70 shadow-inner">
                        <SelectValue placeholder="Tipo da integração aqui" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="WHATSAPP-BAILEYS">WhatsApp Baileys · Conta pessoal</SelectItem>
                        <SelectItem value="WHATSAPP-BUSINESS">WhatsApp Business · Conta comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 w-full rounded-2xl bg-[#596AF1] text-base font-semibold text-white shadow-lg shadow-primary/30 hover:bg-[#4f60e5]"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Criando instância..." : "Criar instância"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={handleCloseDialog}
                    className="mt-2 w-full text-sm text-muted-foreground hover:bg-transparent"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
