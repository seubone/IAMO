import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Pause, Volume2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioMessageProps {
  messageId: string;
  caption?: string;
}

export function AudioMessage({ messageId, caption }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [data]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg w-full max-w-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando áudio...</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg w-full max-w-[300px]">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-500">⏰ Mídia expirada</span>
        </div>
        <p className="text-xs text-muted-foreground">
          URLs do WhatsApp são temporárias
        </p>
      </div>
    );
  }

  if (error || !data?.dataUrl) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-muted/20 rounded-lg w-full max-w-[300px]">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">❌ Erro ao carregar áudio</span>
        </div>
        <p className="text-xs text-muted-foreground/70">Tente novamente mais tarde</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[300px] overflow-hidden">
      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
        <audio ref={audioRef} src={data.dataUrl} preload="metadata" />

        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0 rounded-full hover:bg-background/20"
          onClick={togglePlayPause}
          data-testid={`audio-play-${messageId}`}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" fill="currentColor" />
          ) : (
            <Play className="h-5 w-5" fill="currentColor" />
          )}
        </Button>

        {/* Timeline and Duration */}
        <div className="flex-1 min-w-0 space-y-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer"
            data-testid={`audio-slider-${messageId}`}
          />

          <div className="flex items-center justify-between text-xs opacity-70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Icon */}
        <Volume2 className="h-4 w-4 flex-shrink-0 opacity-70" />
      </div>

      {caption && (
        <p className="text-sm mt-2 whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {caption}
        </p>
      )}
    </div>
  );
}
