import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
interface StickerMessageProps {
  messageId: string;
}
export function StickerMessage({ messageId }: StickerMessageProps) {
  const { data, isLoading, error } = useQuery<{ dataUrl: string; mimetype: string }>({
    queryKey: ['/api/whatsapp/media/decrypt', messageId],
    staleTime: Infinity, // Stickers não mudam
    retry: 2,
  });
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-[150px] h-[150px] bg-muted/20 rounded-md">
        <Loader2 className="h-6 w-6 animate-spin" data-testid={`loader-sticker-${messageId}`} />
      </div>
    );
  }
  if (error || !data?.dataUrl) {
    return (
      <div className="flex items-center justify-center w-[150px] h-[150px] bg-muted/20 rounded-md">
        <p className="text-xs text-muted-foreground">Erro ao carregar</p>
      </div>
    );
  }
  return (
    <div className="mb-2">
      <img 
        src={data.dataUrl} 
        alt="Figurinha"
        className="rounded-md max-w-[150px] h-auto object-contain cursor-pointer hover:opacity-90"
        onClick={() => {
          const link = document.createElement('a');
          link.href = data.dataUrl;
          link.download = 'sticker.webp';
          link.click();
        }}
        data-testid={`sticker-${messageId}`}
      />
    </div>
  );
}