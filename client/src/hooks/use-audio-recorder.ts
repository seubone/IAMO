import { useState, useRef, useEffect } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  duration: string;
  waveformData: number[];
  audioBlob: Blob | null;
  playbackDuration: number;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    duration: '0:00',
    waveformData: [],
    audioBlob: null,
    playbackDuration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Formatar tempo (0:00)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Limpar AudioContext com segurança
  const cleanupAudioContext = () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.warn('Erro ao fechar AudioContext:', error);
      }
    }
    audioContextRef.current = null;
  };

  // Iniciar gravação
  const startRecording = async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Configurar Web Audio API
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

      // Ao parar, processar áudio
      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudioForWaveform(audioBlob);
      });

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      startTimer();
      visualizeRecording();

      setState((prev) => ({ ...prev, isRecording: true }));
    } catch (error: any) {
      const errorMessage = error.name === 'NotAllowedError'
        ? 'Permissão de microfone negada'
        : error.name === 'NotFoundError'
        ? 'Nenhum microfone encontrado'
        : error.message || 'Erro ao acessar microfone';

      setState((prev) => ({ ...prev, error: errorMessage }));
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

      // Parar stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Fechar audio context com segurança
      cleanupAudioContext();

      setState((prev) => ({ ...prev, isRecording: false }));
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

    // Fechar audio context com segurança
    cleanupAudioContext();

    audioChunksRef.current = [];

    setState({
      isRecording: false,
      duration: '0:00',
      waveformData: [],
      audioBlob: null,
      playbackDuration: 0,
      error: null,
    });
  };

  // Timer
  const startTimer = () => {
    timerIntervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState((prev) => ({ ...prev, duration: formatTime(elapsed) }));
    }, 100);
  };

  // Parar timer
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Visualizar gravação em tempo real
  const visualizeRecording = () => {
    const waveformContainer = document.getElementById('recording-waveform');
    if (!waveformContainer) return;

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);

      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Calcular amplitude média
      const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      const normalizedHeight = (average / 255) * 60 + 10; // Min 10px, max 70px

      // Criar nova barra
      const bar = document.createElement('div');
      bar.className = 'h-full bg-blue-500 rounded flex-1 flex-shrink-0';
      bar.style.height = `${normalizedHeight}px`;
      bar.style.width = '3px';
      waveformContainer.appendChild(bar);

      // Limitar número de barras visíveis
      if (waveformContainer.children.length > 150) {
        waveformContainer.removeChild(waveformContainer.firstChild!);
      }

      // Auto-scroll
      waveformContainer.scrollLeft = waveformContainer.scrollWidth;
    };

    draw();
  };

  // Processar áudio para extrair waveform
  const processAudioForWaveform = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const duration = audioBuffer.duration;
      const rawData = audioBuffer.getChannelData(0);

      // Extrair 100 amostras
      const samples = 100;
      const blockSize = Math.floor(rawData.length / samples);
      const waveformData: number[] = [];

      for (let i = 0; i < samples; i++) {
        const start = blockSize * i;
        let sum = 0;

        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[start + j]);
        }

        waveformData.push(sum / blockSize);
      }

      // Normalizar (0-100)
      const max = Math.max(...waveformData);
      const normalized = waveformData.map((v) => (v / max) * 100);

      setState((prev) => ({
        ...prev,
        audioBlob: blob,
        waveformData: normalized,
        playbackDuration: duration,
      }));

      audioContext.close();
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: 'Erro ao processar áudio' }));
    }
  };

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime,
  };
}
