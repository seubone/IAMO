import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Square, X } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { SendIcon } from '@/components/SendIcon';

interface AudioRecorderInlineProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onSendAudio: (blob: Blob, waveformData: number[], duration: string) => void;
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
    isRecording: hookIsRecording,
    duration,
    waveformData,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Sincronizar estado do hook com o componente
  useEffect(() => {
    if (isRecording && !hookIsRecording && !error) {
      startRecording();
    }
  }, [isRecording, hookIsRecording, error, startRecording]);

  const handleStopAndSend = async () => {
    stopRecording();
    onStopRecording();
    // Aguardar um pouco para o blob ser processado
    setTimeout(() => {
      if (audioBlob && waveformData) {
        onSendAudio(audioBlob, waveformData, duration);
      }
    }, 100);
  };

  const handleCancel = () => {
    cancelRecording();
    onCancelRecording();
  };

  // Mostrar o gravador se está gravando ou tem áudio gravado
  if (!isRecording && !audioBlob) {
    return null;
  }

  const displayWaveform = waveformData && waveformData.length > 0
    ? waveformData.slice(0, 30)
    : Array(15).fill(0);

  return (
    <div className="flex items-center gap-2 w-full px-2 py-1">
      {/* Ícone de microfone ou animação */}
      <div className="flex-shrink-0">
        {isRecording ? (
          <div className="animate-pulse">
            <Mic className="h-5 w-5 text-red-500" />
          </div>
        ) : (
          <div>
            <Mic className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>

      {/* Forma de onda animada */}
      <div className="flex-1 flex items-center gap-0.5 h-8 px-2">
        {displayWaveform.map((value, index) => (
          <div
            key={index}
            className={`flex-1 rounded-sm transition-all ${
              isRecording ? 'bg-red-500' : 'bg-primary'
            } ${isRecording ? 'animate-pulse' : ''}`}
            style={{
              height: `${Math.max(3, Math.min(30, (value / 100) * 30))}px`,
              opacity: isRecording ? 0.8 : 1,
            }}
          />
        ))}
      </div>

      {/* Duração */}
      <span className="text-sm font-mono font-bold text-foreground w-12 text-right flex-shrink-0">
        {duration}
      </span>

      {/* Botões de ação */}
      <div className="flex gap-1 flex-shrink-0">
        {isRecording ? (
          <>
            {/* Parar e enviar */}
            <Button
              size="icon"
              className="h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 text-white"
              onClick={handleStopAndSend}
              title="Parar gravação"
            >
              <Square className="h-3 w-3 fill-white" />
            </Button>

            {/* Cancelar */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-destructive/20"
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
              size="icon"
              className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
              onClick={() => onSendAudio(audioBlob, waveformData || [], duration)}
              disabled={isSending}
              title="Enviar áudio"
            >
              {isSending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <SendIcon className="h-3 w-3" />
              )}
            </Button>

            {/* Cancelar */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-destructive/20"
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
