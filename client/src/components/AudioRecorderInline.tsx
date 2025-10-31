import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Square, X } from 'lucide-react';
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
  // Estado local do gravador
  const [duration, setDuration] = useState('0:00');
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAudioData, setHasAudioData] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Formatar tempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Iniciar gravação
  const startRecording = async () => {
    try {
      setError(null);
      setDuration('0:00');
      setWaveformData([]);
      setAudioBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      dataArrayRef.current = dataArray;

      // Salvar chunks
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunksRef.current.push(event.data);
      });

      // Ao parar
      mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      });

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setHasAudioData(true); // Marca que tem dados sendo gravados
      startTimer();
      visualizeRecording();
    } catch (error: any) {
      const errorMessage = error.name === 'NotAllowedError'
        ? 'Permissão de microfone negada'
        : error.name === 'NotFoundError'
        ? 'Nenhum microfone encontrado'
        : error.message || 'Erro ao acessar microfone';

      setError(errorMessage);
    }
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      stopTimer();

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  // Cancelar gravação
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    stopTimer();
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    audioChunksRef.current = [];
    setDuration('0:00');
    setWaveformData([]);
    setAudioBlob(null);
    setError(null);
    setHasAudioData(false);
  };

  // Timer
  const startTimer = () => {
    timerIntervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(formatTime(elapsed));
    }, 100);
  };

  // Parar timer
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Visualizar gravação
  const visualizeRecording = () => {
    const recordingWaveform = () => {
      animationIdRef.current = requestAnimationFrame(recordingWaveform);

      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Extrair 30 pontos
      const samples = [];
      const step = Math.floor(dataArrayRef.current.length / 30);

      for (let i = 0; i < 30; i++) {
        const value = dataArrayRef.current[i * step] || 0;
        samples.push((value / 255) * 100);
      }

      setWaveformData(samples);
    };

    recordingWaveform();
  };

  // Iniciar gravação quando isRecording muda
  useEffect(() => {
    if (isRecording && !error) {
      startRecording();
    }
  }, [isRecording]);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopTimer();
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleStopAndSend = () => {
    stopRecording();
    onStopRecording();
  };

  const handleSendAudio = () => {
    if (audioBlob && waveformData) {
      onSendAudio(audioBlob, waveformData, duration);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancelRecording();
  };

  // Determinar o estado local da gravação
  const isLocallyRecording = mediaRecorderRef.current?.state === 'recording';

  // Mostrar o gravador se está gravando ou tem áudio gravado
  if (!isRecording && !audioBlob) {
    return null;
  }

  const displayWaveform = waveformData && waveformData.length > 0
    ? waveformData
    : Array(30).fill(Math.random() * 20); // Fallback com barras aleatórias

  return (
    <div className="flex items-center gap-2 w-full px-2 py-1">
      {/* Ícone de microfone ou animação */}
      <div className="flex-shrink-0">
        {isLocallyRecording ? (
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
      <div className="flex-1 flex items-center justify-center gap-0.5 h-8 px-2">
        {displayWaveform.map((value, index) => (
          <div
            key={index}
            className={`flex-shrink-0 rounded-sm transition-all ${
              isLocallyRecording ? 'bg-red-500' : 'bg-primary'
            }`}
            style={{
              width: '3px',
              height: `${Math.max(3, Math.min(28, value * 1.5))}px`,
              opacity: isLocallyRecording ? 0.9 : 1,
            }}
          />
        ))}
      </div>

      {/* Duração */}
      <span className="text-sm font-mono font-bold text-foreground w-14 text-right flex-shrink-0">
        {duration}
      </span>

      {/* Botões de ação */}
      <div className="flex gap-1 flex-shrink-0">
        {/* Parar gravação (visível enquanto gravando) */}
        {isLocallyRecording && (
          <Button
            size="icon"
            className="h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 text-white"
            onClick={handleStopAndSend}
            title="Parar gravação"
          >
            <Square className="h-3 w-3 fill-white" />
          </Button>
        )}

        {/* Enviar áudio (visível quando tem dados ou blob) */}
        {(hasAudioData || audioBlob) && (
          <Button
            size="icon"
            className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            onClick={handleSendAudio}
            disabled={isSending || !audioBlob}
            title="Enviar áudio"
          >
            {isSending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <SendIcon className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Cancelar (sempre visível) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full hover:bg-destructive/20"
          onClick={handleCancel}
          title="Cancelar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
