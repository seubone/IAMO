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

  // Verificar tipo de erro
  const errorStatus = (error as any)?.response?.status || (error as any)?.status;
  const errorType = (error as any)?.response?.data?.type || (error as any)?.type;
  const isExpired = errorStatus === 410;
  const isNetworkError = errorStatus === 503 || errorType === 'NETWORK_ERROR';
  const isDeleted = errorType === 'MEDIA_DELETED';

  // Debug: log do erro para investigar
  if (error) {
    console.warn('⚠️ ImageMessage Erro ao carregar:', {
      messageId,
      status: errorStatus,
      type: errorType,
      message: (error as any)?.message,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-48 bg-muted/20 rounded-md mb-2">
        <Loader2 className="h-6 w-6 animate-spin" data-testid={`loader-image-${messageId}`} />
      </div>
    );
  }

  if (isExpired || isDeleted) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-48 bg-amber-500/10 border border-amber-500/20 rounded-md mb-2 p-4">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mb-1">
          {isDeleted ? '🗑️ Mídia deletada' : '⏰ Mídia expirada'}
        </p>
        <p className="text-xs text-muted-foreground text-center">
          {isDeleted
            ? 'Esta imagem foi deletada e não está mais disponível'
            : 'As URLs do WhatsApp são temporárias e expiram após ~24 horas'}
        </p>
      </div>
    );
  }

  if (isNetworkError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-48 bg-orange-500/10 border border-orange-500/20 rounded-md mb-2 p-4">
        <p className="text-sm font-medium text-orange-600 dark:text-orange-500 mb-1">🌐 Erro de conexão</p>
        <p className="text-xs text-muted-foreground text-center">
          Não foi possível conectar ao servidor de mídia. Tente novamente mais tarde.
        </p>
      </div>
    );
  }

  if (error || !data?.dataUrl) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-48 bg-red-500/10 border border-red-500/20 rounded-md mb-2 p-4">
        <p className="text-sm font-medium text-red-600 dark:text-red-500 mb-1">❌ Erro ao carregar imagem</p>
        <p className="text-xs text-muted-foreground text-center">Tente novamente mais tarde</p>
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
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 overflow-hidden bg-black/95">
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={data.dataUrl}
              alt="Imagem em tela cheia"
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
