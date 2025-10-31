import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Square, X, Send } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { SendIcon } from '@/components/SendIcon';

interface AudioRecorderInlineProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onSendAudio: (blob: Blob, waveformData: number[], duration: number) => void;
  isSending?: boolean;
}

export function AudioRecorderInline({
  isRecording,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSendAudio,
  isSending = false,
}: AudioRecorderInlineProps) {
  const {
    duration,
    waveformData,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime,
  } = useAudioRecorder();

  useEffect(() => {
    if (isRecording && !error) {
      startRecording();
    }
  }, [isRecording]);

  const handleStopAndSend = async () => {
    const blob = await stopRecording();
    onStopRecording();
    if (blob && waveformData) {
      onSendAudio(blob, waveformData, duration);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancelRecording();
  };

  if (!isRecording && !audioBlob) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Forma de onda animada */}
      <div className="flex-1 flex items-center gap-1 h-8">
        {waveformData && waveformData.length > 0 ? (
          waveformData.slice(0, 20).map((value, index) => (
            <div
              key={index}
              className={`flex-1 rounded-full transition-all ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary'
              }`}
              style={{
                height: `${Math.max(4, (value / 100) * 32)}px`,
              }}
            />
          ))
        ) : (
          <div className="flex-1 h-8 bg-muted/30 rounded flex items-center justify-center">
            <Mic className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Duração */}
      <span className="text-sm font-mono text-muted-foreground w-12 text-right">
        {formatTime(duration)}
      </span>

      {/* Botões */}
      <div className="flex gap-2">
        {isRecording ? (
          <>
            {/* Parar gravação */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 rounded-full hover:bg-destructive/10"
              onClick={handleStopAndSend}
              title="Parar e enviar"
            >
              <Square className="h-4 w-4 fill-red-500 text-red-500" />
            </Button>

            {/* Cancelar */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 rounded-full hover:bg-accent"
              onClick={handleCancel}
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : audioBlob ? (
          <>
            {/* Enviar áudio */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
              onClick={() => onSendAudio(audioBlob, waveformData, duration)}
              disabled={isSending}
              title="Enviar áudio"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
            </Button>

            {/* Cancelar */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 rounded-full hover:bg-accent"
              onClick={handleCancel}
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
