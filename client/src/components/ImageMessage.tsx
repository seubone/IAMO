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
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-48 bg-muted/20 rounded-md mb-2">
        <Loader2 className="h-6 w-6 animate-spin" data-testid={`loader-image-${messageId}`} />
      </div>
    );
  }

  if (error || !data?.dataUrl) {
    return (
      <div className="flex items-center justify-center w-full h-48 bg-muted/20 rounded-md mb-2">
        <p className="text-xs text-muted-foreground">Erro ao carregar imagem</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2">
        <img 
          src={data.dataUrl} 
          alt="Imagem enviada"
          className="rounded-md max-w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setIsLightboxOpen(true)}
          data-testid={`image-${messageId}`}
        />
        {caption && (
          <p className="text-sm mt-2 whitespace-pre-wrap break-words">
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
