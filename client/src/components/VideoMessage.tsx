import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Download } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VideoMessageProps {
  messageId: string;
  caption?: string;
}

export function VideoMessage({ messageId, caption }: VideoMessageProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error } = useQuery<{ dataUrl: string; mimetype: string }>({
    queryKey: ["/api/whatsapp/media/decrypt", messageId],
    staleTime: Infinity,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full max-w-[256px] h-36 bg-muted/30 rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-[256px] h-36 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-500 mb-1">⏰ Mídia expirada</p>
        <p className="text-xs text-muted-foreground text-center">
          URLs do WhatsApp são temporárias
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-[256px] h-36 bg-muted/30 rounded-lg p-3">
        <p className="text-sm text-muted-foreground mb-1">❌ Erro ao carregar vídeo</p>
        <p className="text-xs text-muted-foreground/70">Tente novamente</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative group cursor-pointer overflow-hidden" onClick={() => setIsOpen(true)}>
        {/* Thumbnail/Preview */}
        <div className="relative w-full max-w-[256px] h-36 bg-black rounded-lg overflow-hidden">
          <video
            src={data.dataUrl}
            className="w-full h-full object-cover"
            preload="metadata"
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="h-8 w-8 text-black ml-1" fill="currentColor" />
            </div>
          </div>
        </div>

        {caption && (
          <p className="text-sm mt-1 whitespace-pre-wrap break-words overflow-wrap-anywhere">{caption}</p>
        )}
      </div>

      {/* Video Fullscreen Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black">
          <div className="relative">
            <video 
              src={data.dataUrl} 
              controls 
              autoPlay
              className="w-full h-auto max-h-[80vh]"
            />
            
            {caption && (
              <div className="p-4 bg-black/50 text-white">
                <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{caption}</p>
              </div>
            )}
            
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = data.dataUrl;
                  link.download = `video-${messageId}.mp4`;
                  link.click();
                }}
                data-testid="button-download-video"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
