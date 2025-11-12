import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Square, X } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { cn } from '@/lib/utils';

interface AudioRecorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendAudio: (blob: Blob, waveformData: number[], duration: number) => void;
}

export function AudioRecorderDialog({
  open,
  onOpenChange,
  onSendAudio,
}: AudioRecorderDialogProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformPlayRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    duration,
    waveformData,
    audioBlob,
    playbackDuration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime,
  } = useAudioRecorder();

  // Estado para saber se está em gravação ou preview
  const isPreview = audioBlob !== null;

  // Limpar ao fechar
  useEffect(() => {
    if (!open) {
      if (isRecording) {
        cancelRecording();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setPlaybackTime(0);
    }
  }, [open]);

  // Criar URL do áudio
  const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle timeupdate
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setPlaybackTime(audioRef.current.currentTime);
  };

  // Handle ended
  const handleEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  // Handle waveform click (procurar)
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformPlayRef.current || !audioRef.current) return;

    const rect = waveformPlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * playbackDuration;
  };

  // Handle send
  const handleSend = () => {
    if (!audioBlob) return;
    onSendAudio(audioBlob, waveformData, playbackDuration);
    onOpenChange(false);
    cancelRecording();
  };

  // Renderizar waveform
  const renderWaveform = (data: number[], isPlayback = false) => {
    return data.map((height, index) => {
      const playProgress = playbackTime / playbackDuration;
      const barProgress = index / data.length;
      const isPlayed = barProgress < playProgress;
      const isActive = Math.abs(barProgress - playProgress) < 1 / data.length;

      return (
        <div
          key={index}
          className={cn(
            'flex-1 max-w-1 rounded-sm transition-colors duration-200',
            isPlayback && isPlayed
              ? 'bg-blue-600'
              : isPlayback && isActive
              ? 'bg-blue-500'
              : 'bg-slate-400'
          )}
          style={{
            height: `${Math.max(height, 5)}%`,
            minWidth: isPlayback ? '2px' : '3px',
          }}
        />
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isRecording ? '🎤 Gravando Áudio' : isPreview ? 'Áudio Gravado' : '🎤 Gravador de Áudio'}
          </DialogTitle>
          <DialogDescription>
            {isRecording
              ? 'Fale no seu microfone...'
              : isPreview
              ? 'Ouça e confirme o áudio antes de enviar'
              : 'Clique em Gravar para iniciar'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            ❌ {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Waveform durante gravação */}
          {isRecording && (
            <div className="space-y-3">
              <div
                id="recording-waveform"
                className="flex items-center justify-start gap-0.5 h-24 bg-slate-100 dark:bg-slate-900 rounded-lg p-4 overflow-x-auto overflow-y-hidden"
              >
                {/* As barras são adicionadas via JavaScript */}
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    'text-3xl font-bold font-mono',
                    'animate-pulse text-blue-500'
                  )}
                >
                  {duration}
                </div>
              </div>
            </div>
          )}

          {/* Preview do áudio gravado */}
          {isPreview && (
            <div className="space-y-4">
              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                src={audioUrl || undefined}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />

              {/* Waveform interativo */}
              <div
                ref={waveformPlayRef}
                className="flex items-center justify-center gap-1 h-20 bg-slate-100 dark:bg-slate-900 rounded-lg p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                onClick={handleWaveformClick}
              >
                {renderWaveform(waveformData, true)}
              </div>

              {/* Controles de playback */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  size="icon"
                  className="rounded-full bg-blue-500 hover:bg-blue-600"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? '⏸' : '▶'}
                </Button>

                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    {formatTime(playbackTime)} / {formatTime(playbackDuration)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Estado inicial */}
          {!isRecording && !isPreview && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Mic className="h-12 w-12 text-blue-500 mb-4 opacity-50" />
              <p className="text-muted-foreground">
                Clique em "Gravar" para começar a gravação de áudio
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (isRecording) {
                  cancelRecording();
                }
                onOpenChange(false);
              }}
              disabled={isPreview && isPlaying}
            >
              {isRecording ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </>
              ) : (
                'Fechar'
              )}
            </Button>

            {isRecording && (
              <Button
                className="bg-red-500 hover:bg-red-600"
                onClick={stopRecording}
              >
                <Square className="h-4 w-4 mr-2" />
                Parar
              </Button>
            )}

            {!isRecording && !isPreview && (
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                onClick={startRecording}
                disabled={error !== null}
              >
                <Mic className="h-4 w-4 mr-2" />
                Gravar
              </Button>
            )}

            {isPreview && (
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                onClick={handleSend}
              >
                Enviar Áudio
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
