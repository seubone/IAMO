import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Pause, MoreVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAvatarDataUri, resolveAvatarIdentifier } from "@/lib/avatar-generator";

interface AudioMessageProps {
  messageId: string;
  caption?: string;
  senderName?: string;
  timestamp?: string;
  senderAvatar?: string;
  fromMe?: boolean;
  onReply?: (messageId: string) => void;
  senderIdentifier?: string;
}

export function AudioMessage({
  messageId,
  caption,
  senderName,
  timestamp,
  senderAvatar,
  fromMe,
  onReply,
  senderIdentifier,
}: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveData, setWaveData] = useState<number[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      // Tentar conectar o áudio
      if (audioContext.createMediaElementAudioSource) {
        const source = audioContext.createMediaElementAudioSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      }

      return () => {
        try {
          audioContext.close();
        } catch (e) {
          // Ignorar erros ao fechar
        }
      };
    } catch (error) {
      console.warn("Web Audio API não disponível, usando fallback visual");
      return;
    }
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

  // Análise de frequência para waveform dinâmico
  useEffect(() => {
    const analyzeAudio = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Pega apenas as frequências mais relevantes (12 barras)
      const barCount = 12;
      const barHeight: number[] = [];

      for (let i = 0; i < barCount; i++) {
        const start = Math.floor((i / barCount) * dataArray.length);
        const end = Math.floor(((i + 1) / barCount) * dataArray.length);

        let sum = 0;
        for (let j = start; j < end; j++) {
          sum += dataArray[j];
        }
        const average = sum / (end - start);
        barHeight.push(average / 255); // Normalizar 0-1
      }

      setWaveData(barHeight);
    };

    if (isPlaying && analyserRef.current) {
      const interval = setInterval(analyzeAudio, 50);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        const audio = audioRef.current;
        if (audio) audio.currentTime = Math.min(audio.currentTime + 5, duration);
      } else if (e.code === 'ArrowLeft') {
        const audio = audioRef.current;
        if (audio) audio.currentTime = Math.max(audio.currentTime - 5, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration]);

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

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const handleDownload = () => {
    const audio = audioRef.current;
    if (!audio || !data?.dataUrl) return;

    const link = document.createElement('a');
    link.href = data.dataUrl;
    link.download = `audio_${messageId}.mp3`;
    link.click();
    setShowMenu(false);
  };

  const handleSpeedChange = (speed: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
    setShowMenu(false);
  };

  const handleReply = () => {
    if (onReply) {
      onReply(messageId);
    }
    setShowMenu(false);
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

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
    <>
      <audio ref={audioRef} src={data.dataUrl} preload="metadata" />

      {/* Audio Player - Layout vertical com mais espaço */}
      <div className={`flex flex-col gap-2 w-full max-w-md ${fromMe ? 'items-end' : 'items-start'}`}>
        {/* Horário do envio com hora completa */}
        {timestamp && (
          <span className="text-xs font-medium text-gray-500 px-2">
            {timestamp}
          </span>
        )}

        {/* Player Box - Com bordas lg iguais às caixas de texto */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all w-full ${
          fromMe
            ? 'border-purple-300/40 dark:border-purple-700/40 bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100'
            : 'border-border/60 bg-card text-card-foreground'
        } shadow-sm hover:shadow-md transition-all`}>
          {/* Play/Pause Button - Apenas o ícone roxo */}
          <button
            onClick={togglePlayPause}
            className="flex-shrink-0 flex items-center justify-center transition-all hover:opacity-70 active:scale-95 focus:outline-none"
            style={{
              padding: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
            data-testid={`audio-play-${messageId}`}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-primary" strokeWidth={2} />
            ) : (
              <Play className="h-6 w-6 text-primary" fill="currentColor" strokeWidth={2} />
            )}
          </button>

          {/* Barra de progresso reta */}
          <div
            className="flex-1 flex items-center h-1.5 rounded-full cursor-pointer group relative bg-muted"
            onClick={handleWaveformClick}
            role="slider"
            aria-label="Barra de progresso do áudio"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* Barra preenchida (progresso) */}
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>

          {/* Time display - Tempo atual / Total */}
          <span className="text-xs font-medium text-muted-foreground min-w-fit tabular-nums whitespace-nowrap">
            {formatTime(currentTime)}/{formatTime(duration)}
          </span>

          {/* Menu de 3 pontinhos */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Opções de áudio"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50">
                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/40"
                >
                  <Download className="h-4 w-4" />
                  Baixar áudio
                </button>

                {/* Velocidade 1.5x */}
                <button
                  onClick={() => handleSpeedChange(1.5)}
                  className={`w-full px-4 py-2 text-sm text-left transition-colors border-b border-border/40 ${
                    playbackSpeed === 1.5
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {playbackSpeed === 1.5 ? '✓ ' : ''}Velocidade 1.5x
                </button>

                {/* Velocidade 2x */}
                <button
                  onClick={() => handleSpeedChange(2)}
                  className={`w-full px-4 py-2 text-sm text-left transition-colors border-b border-border/40 ${
                    playbackSpeed === 2
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {playbackSpeed === 2 ? '✓ ' : ''}Velocidade 2x
                </button>

                {/* Responder */}
                <button
                  onClick={handleReply}
                  className="w-full px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Responder
                </button>
              </div>
            )}
          </div>

          {/* Avatar do remetente - à direita */}
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName || 'Remetente'}
              className="flex-shrink-0 w-10 h-10 rounded-full object-cover border border-border/60"
            />
          ) : (
            <img
              src={generateAvatarDataUri(
                resolveAvatarIdentifier(senderIdentifier, senderName, messageId),
                senderName?.charAt(0).toUpperCase() || 'U'
              )}
              alt={senderName || 'Remetente'}
              className="flex-shrink-0 w-10 h-10 rounded-full border border-border/60"
            />
          )}
        </div>
      </div>

      {caption && (
        <p className="text-sm mt-2 whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {caption}
        </p>
      )}
    </>
  );
}
