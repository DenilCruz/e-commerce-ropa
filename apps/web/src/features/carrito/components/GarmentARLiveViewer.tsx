import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Play,
  Square,
  ShieldCheck,
  ArrowRight,
  Sliders,
  Send,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { createDecartClient, models } from '@decartai/sdk';
import { probadorApi } from '../services/probador.api';

/* ─── Props del componente ─── */
export interface GarmentARLiveViewerProps {
  garmentImageUrl: string;
  garmentName?: string;
  garmentCategory?: 'tops' | 'bottoms' | 'dresses' | string;
  garmentColor?: string;
  className?: string;
  onCambiarModoFoto?: () => void;
  onCerrar?: () => void;
}

export const GarmentARLiveViewer: React.FC<GarmentARLiveViewerProps> = ({
  garmentImageUrl,
  garmentName = 'Prenda de Colección',
  garmentCategory = 'tops',
  garmentColor = '',
  className = '',
  onCambiarModoFoto,
  onCerrar,
}) => {
  // Referencias de video
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Estados de conexión y streaming
  const [cameraActive, setCameraActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [streamingActive, setStreamingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Control de Prompt interactivo en tiempo real
  const [promptActual, setPromptActual] = useState(
    `A realistic person wearing ${garmentName}${garmentColor ? ` in ${garmentColor}` : ''}, photorealistic fashion fit, natural cloth movement and realistic lighting`,
  );
  const [nuevoPrompt, setNuevoPrompt] = useState('');
  const [enviandoPrompt, setEnviandoPrompt] = useState(false);
  const [mostrarPipLocal, setMostrarPipLocal] = useState(true);
  const [estadoConexion, setEstadoConexion] = useState<string>(
    'Sincronizando cámara con Decart AI a 30 FPS...',
  );

  // Referencias del cliente Decart y stream
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const realtimeClientRef = useRef<any>(null);

  // Actualizar prompt base cuando cambia la prenda

  useEffect(() => {
    setPromptActual(
      `A realistic person wearing ${garmentName}${garmentColor ? ` in ${garmentColor}` : ''}, photorealistic fashion fit, natural cloth movement and realistic lighting`,
    );
  }, [garmentName, garmentColor]);

  // Detener cámara y desconectar Decart
  const stopAll = useCallback(() => {
    if (realtimeClientRef.current) {
      try {
        realtimeClientRef.current.disconnect();
      } catch (e) {
        console.warn('Error desconectando Decart client:', e);
      }
      realtimeClientRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setConnecting(false);
    setStreamingActive(false);
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  // Iniciar Lucy 2.5 Realtime
  const startLucy = async () => {
    setError(null);
    setEstadoConexion('Solicitando token seguro de sesión WebRTC al backend...');

    // 1. Obtener token seguro de sesión WebRTC emitido por el backend
    let sessionToken = '';
    try {
      const res = await probadorApi.obtenerTokenDecart();
      if (!res.configured || !res.apiKey) {
        setError(
          'El servicio Lucy 2.5 no está disponible: la clave DECART_API_KEY debe configurarse en las variables de entorno del servidor (backend).',
        );
        return;
      }
      sessionToken = res.apiKey;
    } catch (err: any) {
      setError(
        'No se pudo comunicar con el servidor para autenticar la sesión de video en tiempo real.',
      );
      return;
    }

    try {
      setConnecting(true);
      setCameraActive(true);
      setEstadoConexion('Accediendo a la cámara local HD 720p...');

      const model = models.realtime('lucy-2.5');

      // 2. Obtener flujo de la cámara con especificaciones de Lucy 2.5
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          frameRate: model.fps,
          width: model.width,
          height: model.height,
        },
      });

      mediaStreamRef.current = stream;

      // Asignar al preview local
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }

      setEstadoConexion('Negociando enlace WebRTC y sincronizando con Lucy 2.5...');

      // 3. Crear cliente de Decart usando el token efímero del backend
      const client = createDecartClient({
        apiKeyProvider: async () => sessionToken,
      });

      // 4. Conectar al canal WebRTC en tiempo real
      const realtimeClient = await client.realtime.connect(stream, {
        model,
        mirror: 'auto',
        initialState: {
          prompt: {
            text: promptActual,
            enhance: true,
          },
          ...(garmentImageUrl && garmentImageUrl.startsWith('http')
            ? { image: garmentImageUrl }
            : {}),
        },
        onConnectionChange: (state: any) => {
          console.log('[Decart] Connection state:', state);
          if (state === 'connecting') {
            setEstadoConexion('Estableciendo conexión WebRTC con Lucy 2.5...');
          } else if (state === 'connected') {
            setEstadoConexion('Canal conectado. Recibiendo primeros fotogramas generados...');
          }
        },
        onQueuePosition: (pos: any) => {
          console.log('[Decart] Queue position:', pos);
          setEstadoConexion(`En cola en servidores Decart AI (Turno: ${pos?.position ?? 1})...`);
        },
        onCapacityWait: (wait: any) => {
          console.log('[Decart] Capacity wait:', wait);
          setEstadoConexion('Servidores Decart con alta demanda, esperando disponibilidad...');
        },
        onRemoteStream: (editedStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = editedStream;
            remoteVideoRef.current.play().catch((err) => {
              console.warn('Playback error on remote stream:', err);
            });
          }
          setStreamingActive(true);
          setConnecting(false);
        },
      });

      realtimeClientRef.current = realtimeClient;
    } catch (err: any) {
      console.error('Error al iniciar Lucy 2.5:', err);
      const msg =
        err?.message?.includes('401') || err?.message?.includes('Unauthorized')
          ? 'Error de autenticación con el servicio Decart AI. Verifica las credenciales en el servidor.'
          : err?.message || 'Error al conectar con el servicio Lucy 2.5 de Decart AI.';
      setError(msg);
      stopAll();
    }
  };

  // Enviar modificación de prompt en tiempo real
  const handleActualizarPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nuevoPrompt.trim() || !realtimeClientRef.current) return;

    try {
      setEnviandoPrompt(true);
      const promptCombinado = `${promptActual}. ${nuevoPrompt.trim()}`;
      await realtimeClientRef.current.setPrompt(promptCombinado);
      setPromptActual(promptCombinado);
      setNuevoPrompt('');
    } catch (err: any) {
      setError(`Error actualizando prompt: ${err?.message || err}`);
    } finally {
      setEnviandoPrompt(false);
    }
  };

  // Capturar foto del stream
  const tomarFoto = () => {
    const targetVideo = remoteVideoRef.current || localVideoRef.current;
    if (!targetVideo) return;

    const canvas = document.createElement('canvas');
    canvas.width = targetVideo.videoWidth || 1280;
    canvas.height = targetVideo.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `lucy_2.5_look_${garmentName.replace(/\s+/g, '_')}.jpg`;
    link.click();
  };

  return (
    <div
      className={`relative w-full h-full min-h-[540px] rounded-2xl overflow-hidden bg-[#0D0C0B] select-none flex flex-col items-center justify-center border border-[#2C2926] shadow-2xl ${className}`}
    >
      {/* ─── PANTALLA DE BIENVENIDA AURA (CÁMARA APAGADA) ─── */}
      {!cameraActive && (
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#1C1A17] via-[#121110] to-[#0D0C0B] flex flex-col items-center justify-center p-6 text-center text-white space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-[#9B7B54]/10 border border-[#9B7B54]/30 flex items-center justify-center shadow-2xl shadow-[#9B7B54]/10">
              <Sparkles className="w-10 h-10 text-[#C5B59E] animate-pulse" />
            </div>
            <span className="absolute -top-2 -right-3 px-2.5 py-0.5 bg-[#9B7B54] text-white text-[9px] font-serif uppercase tracking-[0.2em] font-medium rounded-xs shadow-md">
              Lucy 2.5
            </span>
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-2xl sm:text-3xl font-serif tracking-wider text-white">
              <span>Probador en Vivo </span>
              <span className="italic font-normal text-[#C5B59E]">Lucy 2.5</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#C5B59E]/80 font-light leading-relaxed">
              Pruébate <strong className="text-white font-medium">{garmentName}</strong> en video en tiempo real
              frente a tu cámara con la IA generativa de Decart AI.
            </p>
          </div>

          {/* Badges de capacidades técnicas AURA */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-serif tracking-wider uppercase text-[#E8DDCB]">
            <span className="px-3.5 py-1.5 bg-[#24221F] border border-[#3A3632] rounded-xs">⚡ 30 FPS en Vivo</span>
            <span className="px-3.5 py-1.5 bg-[#24221F] border border-[#3A3632] rounded-xs">👗 Drapeado de Atelier</span>
            <span className="px-3.5 py-1.5 bg-[#24221F] border border-[#3A3632] rounded-xs">HD 1280×720</span>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2 max-w-md">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de acción principales AURA */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={startLucy}
              disabled={connecting}
              className="px-8 py-3.5 bg-gradient-to-r from-[#9B7B54] via-[#8E7F6B] to-[#83653F] hover:opacity-95 text-white rounded-xs border border-[#BFA888]/30 text-xs font-serif font-medium tracking-[0.2em] uppercase transition flex items-center gap-2.5 shadow-xl shadow-[#9B7B54]/25 cursor-pointer disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Conectando a Lucy 2.5...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Encender Cámara y Probar</span>
                </>
              )}
            </button>

            {onCambiarModoFoto && (
              <button
                type="button"
                onClick={onCambiarModoFoto}
                className="px-6 py-3.5 bg-[#1C1A17] hover:bg-[#24221F] text-[#E8DDCB] hover:text-white border border-[#3A3632] rounded-xs text-xs font-serif tracking-[0.15em] uppercase transition flex items-center gap-2 cursor-pointer"
              >
                <span>Usar Foto de Archivo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#A69988]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#9B7B54]" />
            <span>Privacidad garantizada: Cámara procesada en tiempo real para la prueba de alta costura.</span>
          </div>
        </div>
      )}

      {/* ─── VISTA EN VIVO CON LUCY 2.5 Y STREAM REMOTO ─── */}
      <div className={`absolute inset-0 ${cameraActive ? 'block' : 'hidden'}`}>
        {/* Video con el render remoto de Lucy 2.5 */}
        <video
          id="video-output"
          ref={remoteVideoRef}
          playsInline
          autoPlay
          className="w-full h-full object-cover block"
        />

        {/* Indicador de conexión inicial mientras llega el primer frame */}
        {connecting && !streamingActive && (
          <div className="absolute inset-0 bg-[#0D0C0B]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
            <RefreshCw className="w-10 h-10 text-[#C5B59E] animate-spin" />
            <div className="space-y-1">
              <h4 className="text-lg font-serif tracking-wide text-white">Iniciando canal de video con Lucy 2.5</h4>
              <p className="text-xs text-[#C5B59E]/70 font-light">
                {estadoConexion}
              </p>
            </div>
          </div>
        )}

        {/* Picture-in-Picture: Cámara local del usuario */}
        {mostrarPipLocal && (
          <div className="absolute top-4 right-4 z-30 w-36 sm:w-44 aspect-video rounded-xl overflow-hidden border border-[#9B7B54]/40 shadow-2xl bg-black/60 backdrop-blur-sm">
            <video
              ref={localVideoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <span className="absolute bottom-1 left-2 text-[9px] font-serif uppercase tracking-widest text-[#E8DDCB] bg-black/70 px-1.5 py-0.5 rounded-xs">
              Tu Cámara
            </span>
          </div>
        )}

        {/* ─── BARRA DE CONTROL SUPERIOR ─── */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161513]/80 backdrop-blur-md border border-[#3A3632] rounded-xl text-xs text-white">
            <div className="w-2.5 h-2.5 rounded-full bg-[#9B7B54] animate-pulse" />
            <span className="font-serif tracking-wider">Lucy 2.5 Live</span>
            <span className="text-[9px] text-[#D5C4AC] font-serif uppercase bg-[#9B7B54]/20 px-2 py-0.5 rounded-xs border border-[#9B7B54]/30">
              Decart AI
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMostrarPipLocal(!mostrarPipLocal)}
            className="p-2 bg-[#161513]/80 backdrop-blur-md border border-[#3A3632] hover:bg-[#24221F] rounded-xl text-white transition cursor-pointer"
            title={mostrarPipLocal ? 'Ocultar cámara original' : 'Mostrar cámara original'}
          >
            {mostrarPipLocal ? <EyeOff className="w-4 h-4 text-[#C5B59E]" /> : <Eye className="w-4 h-4 text-[#C5B59E]" />}
          </button>
        </div>

        {/* ─── BARRA DE PROMPT DINÁMICO E INTERACCIÓN INFERIOR ─── */}
        <div className="absolute bottom-4 inset-x-4 z-30 flex flex-col gap-2 max-w-2xl mx-auto">
          {/* Formulario de ajuste de Prompt en vivo */}
          <form
            onSubmit={handleActualizarPrompt}
            className="flex items-center gap-2 bg-[#161513]/90 backdrop-blur-xl p-2 rounded-xl border border-[#3A3632] shadow-2xl"
          >
            <div className="pl-2 text-[#9B7B54]">
              <Sliders className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={nuevoPrompt}
              onChange={(e) => setNuevoPrompt(e.target.value)}
              placeholder="Instrucción de atelier en vivo (ej: 'Cambiar tejido a seda negra', 'Ajustar caída')..."
              className="flex-1 bg-transparent text-xs text-white placeholder-[#C5B59E]/40 focus:outline-none font-light"
            />
            <button
              type="submit"
              disabled={enviandoPrompt || !nuevoPrompt.trim()}
              className="px-3.5 py-1.5 bg-[#9B7B54] hover:bg-[#83653F] disabled:opacity-40 text-white rounded-xs text-xs font-serif tracking-widest uppercase transition flex items-center gap-1 cursor-pointer"
            >
              {enviandoPrompt ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Aplicar</span>
            </button>
          </form>

          {/* Barra de acciones rápidas */}
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={tomarFoto}
              className="px-4 py-2 bg-[#1C1A17]/90 hover:bg-[#24221F] border border-[#3A3632] text-[#E8DDCB] rounded-xs text-xs font-serif tracking-wider uppercase flex items-center gap-1.5 transition cursor-pointer shadow-lg"
            >
              <Download className="w-3.5 h-3.5 text-[#9B7B54]" />
              <span>Capturar Silueta</span>
            </button>

            <button
              type="button"
              onClick={stopAll}
              className="px-4 py-2 bg-[#1C1A17]/90 hover:bg-rose-950/80 border border-rose-900/40 text-rose-300 rounded-xs text-xs font-serif tracking-wider uppercase flex items-center gap-1.5 transition cursor-pointer shadow-lg"
            >
              <Square className="w-3 h-3 fill-rose-400" />
              <span>Desconectar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

