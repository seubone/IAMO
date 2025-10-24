import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AudioMessageProps {
  messageId: string;
  caption?: string;
  senderName?: string;
  timestamp?: string;
  senderAvatar?: string;
}

export function AudioMessage({ messageId, caption, senderName, timestamp, senderAvatar }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveData, setWaveData] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const { data, isLoading, error } = useQuery<{ dataUrl: string; mimetype: string }>({
    queryKey: ["/api/whatsapp/media/decrypt", messageId],
    staleTime: Infinity,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 410) return false;
      return failureCount < 2;
    },
  });

  const errorStatus = (error as any)?.response?.status || (error as any)?.status;
  const errorType = (error as any)?.response?.data?.type || (error as any)?.type;
  const isExpired = errorStatus === 410;
  const isNetworkError = errorStatus === 503 || errorType === 'NETWORK_ERROR';
  const isDeleted = errorType === 'MEDIA_DELETED';

  // Setup Web Audio API para visualização
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !data?.dataUrl) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 256;

    const source = audioContext.createMediaElementAudioSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    return () => {
      audioContext.close();
    };
  }, [data]);

  // Update time e visualização
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

  // Visualização de onda
  useEffect(() => {
    if (!isPlaying || !analyserRef.current) return;

    const animate = () => {
      if (!analyserRef.current || !canvasRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      const normalized = Array.from(dataArray).map(val => val / 255);
      setWaveData(normalized);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-500/20 rounded-3xl w-full max-w-xs">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <span className="text-sm text-green-600">Carregando áudio...</span>
      </div>
    );
  }

  if (isExpired || isDeleted) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl w-full max-w-xs">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
          {isDeleted ? '🗑️ Áudio deletado' : '⏰ Áudio expirado'}
        </p>
        <p className="text-xs text-muted-foreground">
          {isDeleted ? 'Este áudio foi deletado' : 'As URLs do WhatsApp são temporárias'}
        </p>
      </div>
    );
  }

  if (isNetworkError) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl w-full max-w-xs">
        <p className="text-sm font-medium text-orange-600 dark:text-orange-500">🌐 Erro de conexão</p>
        <p className="text-xs text-muted-foreground">Servidor de mídia indisponível</p>
      </div>
    );
  }

  if (error || !data?.dataUrl) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl w-full max-w-xs">
        <p className="text-sm font-medium text-red-600 dark:text-red-500">❌ Erro ao carregar áudio</p>
        <p className="text-xs text-muted-foreground">Tente novamente mais tarde</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs">
      <audio ref={audioRef} src={data.dataUrl} preload="metadata" />

      {/* WhatsApp Style Audio Player */}
      <div className="bg-green-500/20 dark:bg-green-900/30 rounded-3xl p-3 flex items-center gap-3">
        {/* Play/Pause Button */}
        <Button
          size="icon"
          className="h-10 w-10 flex-shrink-0 rounded-full bg-green-600 hover:bg-green-700 text-white"
          onClick={togglePlayPause}
          data-testid={`audio-play-${messageId}`}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" fill="white" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" fill="white" />
          )}
        </Button>

        {/* Waveform Visualization */}
        <div className="flex-1 flex items-center justify-center h-8 gap-0.5">
          {waveData.length > 0 ? (
            waveData.slice(0, 40).map((value, index) => (
              <div
                key={index}
                className="bg-green-600/70 rounded-full flex-1"
                style={{
                  height: `${Math.max(4, value * 24)}px`,
                  opacity: 0.7 + value * 0.3,
                  transition: 'height 0.05s ease-out',
                }}
              />
            ))
          ) : (
            // Default waveform quando não está tocando
            Array.from({ length: 40 }).map((_, index) => (
              <div
                key={index}
                className="bg-green-600/50 rounded-full flex-1"
                style={{
                  height: `${6 + Math.random() * 4}px`,
                }}
              />
            ))
          )}
        </div>

        {/* Sender Avatar */}
        {senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderName || 'Sender'}
            className="h-8 w-8 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-green-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-medium">
            {(senderName || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Current Time and Timestamp */}
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-xs text-muted-foreground font-medium">{formatTime(currentTime)}</span>
        {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
      </div>

      {caption && (
        <p className="text-sm mt-2 whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {caption}
        </p>
      )}
    </div>
  );
}
