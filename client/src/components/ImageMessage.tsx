import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ImageMessageProps {
  messageId: string;
  caption?: string;
}

export function ImageMessage({ messageId, caption }: ImageMessageProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { data, isLoading, error } = useQuery<{ dataUrl: string; mimetype: string }>({
    queryKey: ['/api/whatsapp/media/decrypt', messageId],
    staleTime: Infinity, // Imagens não mudam
    retry: (failureCount, error: any) => {
      // Não fazer retry se mídia expirou (410)
      if (error?.response?.status === 410) return false;
      return failureCount < 2;
    },
  });

  // Verificar se é mídia expirada (suporta múltiplos formatos de erro)
  const isExpired =
    (error as any)?.response?.status === 410 ||
    (error as any)?.status === 410 ||
    (error as any)?.message?.includes('410');

  // Debug: log do erro para investigar
  if (error) {
    console.log('🔍 ImageMessage Error Debug:', {
      messageId,
      error,
      errorStatus: (error as any)?.status,
      responseStatus: (error as any)?.response?.status,
      errorMessage: (error as any)?.message,
      isExpired
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-48 bg-muted/20 rounded-md mb-2">
        <Loader2 className="h-6 w-6 animate-spin" data-testid={`loader-image-${messageId}`} />
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-48 bg-yellow-500/10 border border-yellow-500/20 rounded-md mb-2 p-4">
        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-1">⏰ Mídia expirada</p>
        <p className="text-xs text-muted-foreground text-center">
          URLs do WhatsApp são temporárias e expiram após alguns dias
        </p>
      </div>
    );
  }

  if (error || !data?.dataUrl) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-48 bg-muted/20 rounded-md mb-2 p-4">
        <p className="text-sm text-muted-foreground mb-1">❌ Erro ao carregar imagem</p>
        <p className="text-xs text-muted-foreground/70">Tente novamente mais tarde</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 overflow-hidden">
        <img
          src={data.dataUrl}
          alt="Imagem enviada"
          className="rounded-md max-w-full w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setIsLightboxOpen(true)}
          data-testid={`image-${messageId}`}
        />
        {caption && (
          <p className="text-sm mt-2 whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {caption}
          </p>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-0">
          <img 
            src={data.dataUrl} 
            alt="Imagem em tela cheia"
            className="w-full h-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
