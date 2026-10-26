import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  User,
  Users,
  Camera,
  RefreshCw,
  AlertCircle,
  Download,
  Shirt,
  Timer,
  WifiOff,
} from 'lucide-react';
import { probadorApi, ModeloBase, ProbarPrendaResponse } from '../services/probador.api';
import { getImageUrl } from '../../../lib/utils';
import { GarmentARLiveViewer } from './GarmentARLiveViewer';
import { fitGarmentOnPhoto } from '../utils/garmentFitting';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';

interface PrendaParaProbar {
  id?: string;
  nombre: string;
  imagen: string | null;
  talla?: string;
  color?: string;
  categoria?: 'tops' | 'bottoms' | 'dresses';
}

interface VirtualTryOnModalProps {
  abierto: boolean;
  onCerrar: () => void;
  prenda: PrendaParaProbar | null;
}

export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({
  abierto,
  onCerrar,
  prenda,
}) => {
  const { isOnline } = useNetworkStatus();

  // Modalidad principal: Espejo AR (Cámara en Vivo a 60 FPS) vs Estudio Fotográfico IA
  const [modoPrincipal, setModoPrincipal] = useState<'espejo_ar' | 'estudio_foto'>('espejo_ar');
  const [tabPersona, setTabPersona] = useState<'upload' | 'modelos' | 'camara'>('upload');
  const [modelosBase, setModelosBase] = useState<ModeloBase[]>([]);
  const [modeloSeleccionado, setModeloSeleccionado] = useState<ModeloBase | null>(null);

  // Foto del usuario (base64 o URL)
  const [fotoPersona, setFotoPersona] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  // Cámara web y cronómetro
  const [cuentaRegresiva, setCuentaRegresiva] = useState<number | null>(null);
  const [duracionTimer, setDuracionTimer] = useState<number>(10);
  const [efectoFlash, setEfectoFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Estados de procesamiento
  const [procesando, setProcesando] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ProbarPrendaResponse | null>(null);

  // Modo de visualización de resultado: 'split' | 'resultado' | 'original'
  const [modoVista, setModoVista] = useState<'split' | 'resultado' | 'original'>('split');
  const [sliderPos, setSliderPos] = useState(50);

  // Cargar modelos base predefinidos al abrir
  useEffect(() => {
    if (abierto) {
      probadorApi
        .obtenerModelosBase()
        .then((data) => {
          setModelosBase(data);
          if (data.length > 0 && !modeloSeleccionado) {
            setModeloSeleccionado(data[0]);
          }
        })
        .catch(() => {});
    }
  }, [abierto]);

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  // Limpiar estados al cerrar
  const handleCerrar = () => {
    detenerCamara();
    setError(null);
    setProcesando(false);
    onCerrar();
  };

  // Manejador de subida de archivo con optimización automática
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    setError(null);
    setNombreArchivo(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimized = canvas.toDataURL('image/jpeg', 0.88);
          setFotoPersona(optimized);
        } else {
          setFotoPersona(rawDataUrl);
        }
        setResultado(null);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const playBeep = (freq = 800, duration = 0.1) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  };

  const cancelarTemporizador = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCuentaRegresiva(null);
  };

  // Iniciar cámara web
  const iniciarCamara = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 960 }, facingMode: 'user' },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setError('No se pudo acceder a la cámara. Por favor permite los permisos de cámara en tu navegador.');
    }
  };

  const detenerCamara = () => {
    cancelarTemporizador();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const ejecutarCapturaFoto = () => {
    if (!videoRef.current) return;
    const vWidth = videoRef.current.videoWidth || 720;
    const vHeight = videoRef.current.videoHeight || 960;
    const targetAspect = 3 / 4; // Relación de aspecto 3:4 requerida por el probador (768x1024)

    let cropWidth = vWidth;
    let cropHeight = vHeight;
    let cropX = 0;
    let cropY = 0;

    // Calcular encuadre centrado según lo que ve el usuario en el contenedor aspect-[3/4]
    if (vWidth / vHeight > targetAspect) {
      // El video es más ancho (típico en webcam 16:9), recortamos bordes laterales
      cropWidth = Math.round(vHeight * targetAspect);
      cropX = Math.round((vWidth - cropWidth) / 2);
    } else {
      // El video es más alto, recortamos arriba y abajo
      cropHeight = Math.round(vWidth / targetAspect);
      cropY = Math.round((vHeight - cropHeight) / 2);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Modo espejo para coincidir con la vista previa del usuario
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        videoRef.current,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setFotoPersona(dataUrl);
      setNombreArchivo('captura_camara.jpg');
      detenerCamara();
      setTabPersona('upload');
      setResultado(null);
    }
    cancelarTemporizador();
  };

  const iniciarTemporizadorYCaptura = (segundos = duracionTimer) => {
    if (segundos <= 0) {
      setEfectoFlash(true);
      playBeep(1200, 0.2);
      setTimeout(() => {
        setEfectoFlash(false);
        ejecutarCapturaFoto();
      }, 150);
      return;
    }

    cancelarTemporizador();
    setCuentaRegresiva(segundos);
    playBeep(800, 0.1);

    let restante = segundos;
    timerIntervalRef.current = setInterval(() => {
      restante -= 1;
      if (restante > 0) {
        setCuentaRegresiva(restante);
        playBeep(restante <= 3 ? 1050 : 800, 0.12);
      } else {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setCuentaRegresiva(0);
        playBeep(1350, 0.35); // Sonido de obturador
        setEfectoFlash(true);
        setTimeout(() => {
          setEfectoFlash(false);
          ejecutarCapturaFoto();
        }, 300);
      }
    }, 1000);
  };

  // Ejecutar generación virtual con IDM-VTON + Groq
  const handleProbarPrenda = async () => {
    if (!isOnline) {
      setError('El Probador Virtual con Inteligencia Artificial requiere conexión a internet para procesar la imagen y renderizar las prendas.');
      return;
    }

    if (!prenda) {
      setError('No hay ninguna prenda seleccionada.');
      return;
    }

    // Determinar qué foto de persona se usará
    let fotoParaEnviar = '';
    if (tabPersona === 'upload' && fotoPersona) {
      fotoParaEnviar = fotoPersona;
    } else if (tabPersona === 'modelos' && modeloSeleccionado) {
      fotoParaEnviar = modeloSeleccionado.fotoUrl;
    } else if (fotoPersona) {
      fotoParaEnviar = fotoPersona;
    } else if (modeloSeleccionado) {
      fotoParaEnviar = modeloSeleccionado.fotoUrl;
    } else {
      setError('Por favor sube una foto tuya o elige uno de los modelos predeterminados.');
      return;
    }

    // Determinar foto de la prenda
    const urlPrendaNormalizada = getImageUrl(prenda.imagen);
    if (!urlPrendaNormalizada) {
      setError('La prenda seleccionada no tiene una imagen válida disponible.');
      return;
    }

    setError(null);
    setProcesando(true);
    setResultado(null);

    // Mensajes dinámicos de progreso para Hugging Face IDM-VTON
    setProgresoTexto('Conectando con servidores de IA en Hugging Face (IDM-VTON)...');
    const t1 = setTimeout(() => setProgresoTexto('Analizando postura corporal y cargando textura de la prenda...'), 3500);
    const t2 = setTimeout(() => setProgresoTexto('Ejecutando difusión neuronal para adaptar la prenda a tu cuerpo...'), 10000);
    const t3 = setTimeout(() => setProgresoTexto('Generando textura fotorrealista y caída de tela...'), 22000);
    const t4 = setTimeout(() => setProgresoTexto('Finalizando renderizado de alta resolución...'), 36000);

    try {
      const res = await probadorApi.probarPrenda({
        fotoPersona: fotoParaEnviar,
        fotoPrenda: urlPrendaNormalizada,
        categoria: prenda.categoria || 'tops',
        nombrePrenda: prenda.nombre,
        talla: prenda.talla || 'M',
        color: prenda.color || 'Original',
      });

      setResultado(res);
    } catch (err: any) {
      console.warn('Nota en llamada a backend Hugging Face, activando ajuste anatómico:', err);
      try {
        setProgresoTexto('Aplicando ajuste anatómico con visión artificial...');
        const { compositeDataUrl } = await fitGarmentOnPhoto({
          personImageUrl: fotoParaEnviar,
          garmentImageUrl: urlPrendaNormalizada,
          category: prenda.categoria || 'tops',
          garmentName: prenda.nombre,
        });

        setResultado({
          success: true,
          imagenResultadoUrl: compositeDataUrl,
          imagenOriginalPersona: fotoParaEnviar,
          imagenPrenda: urlPrendaNormalizada,
          nombrePrenda: prenda.nombre,
          talla: prenda.talla || 'M',
          color: prenda.color || 'Original',
          tiempoProcesamientoSegundos: 1,
        });
      } catch (fallbackErr: any) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Ocurrió un inconveniente al procesar la prueba virtual con IA. Por favor intenta de nuevo.',
        );
      }
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setProcesando(false);
    }
  };

  // Descargar foto resultante
  const handleDescargar = () => {
    if (!resultado?.imagenResultadoUrl) return;
    const link = document.createElement('a');
    link.href = getImageUrl(resultado.imagenResultadoUrl);
    link.download = `prueba_virtual_${prenda?.nombre?.replace(/\s+/g, '_') || 'look'}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!abierto || !prenda) return null;

  const urlPrendaPreview = getImageUrl(prenda.imagen);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border flex flex-col max-h-[92vh] my-auto transition-colors duration-200 ${
          modoPrincipal === 'espejo_ar' ? 'bg-[#0D0C0B] border-[#2C2926]' : 'bg-white border-gray-100'
        }`}
      >
        {/* HEADER DEL MODAL AURA */}
        <div className="px-6 py-3.5 border-b border-[#2C2926] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#161513] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#9B7B54] to-[#C5B59E] flex items-center justify-center shadow-lg shadow-[#9B7B54]/20 shrink-0">
              <Sparkles className="w-5 h-5 text-stone-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif tracking-wide text-white">
                  Probador Virtual Inteligente
                </h2>
                <span className="bg-[#9B7B54]/20 text-[#D5C4AC] text-[9px] uppercase tracking-luxury px-2 py-0.5 rounded-full border border-[#9B7B54]/30 font-medium">
                  {modoPrincipal === 'espejo_ar'
                    ? '✨ Lucy 2.5 Live IA'
                    : '📸 Estudio Fotográfico'}
                </span>
              </div>
              <p className="text-xs text-[#C5B59E]/70 font-light">
                {modoPrincipal === 'espejo_ar'
                  ? 'Generación y drapeado en video en tiempo real a 30 FPS con Decart AI'
                  : 'Ajuste anatómico de atelier con IA sobre fotografía o modelos de estudio'}
              </p>
            </div>
          </div>

          {/* SELECTOR DE MODALIDAD (LUCY 2.5 LIVE vs ESTUDIO FOTO) Y CIERRE */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  detenerCamara();
                  setModoPrincipal('espejo_ar');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                  modoPrincipal === 'espejo_ar'
                    ? 'bg-gradient-to-r from-[#9B7B54] to-[#83653F] text-white shadow-md shadow-[#9B7B54]/20'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    modoPrincipal === 'espejo_ar' ? 'bg-white animate-ping' : 'bg-[#9B7B54]'
                  }`}
                />
                <span>Lucy 2.5 Live</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  detenerCamara();
                  setModoPrincipal('estudio_foto');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                  modoPrincipal === 'estudio_foto'
                    ? 'bg-gradient-to-r from-[#9B7B54] to-[#83653F] text-white shadow-md shadow-[#9B7B54]/20'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5B59E]" />
                <span>Estudio Foto IA</span>
              </button>
            </div>

            <button
              onClick={handleCerrar}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {modoPrincipal === 'espejo_ar' ? (
          <div className="flex-1 p-3 sm:p-5 bg-[#0D0C0B] flex flex-col items-center justify-center overflow-hidden">
            <GarmentARLiveViewer
              garmentImageUrl={urlPrendaPreview || ''}
              garmentName={prenda.nombre}
              garmentCategory={prenda.categoria || 'tops'}
              garmentColor={prenda.color}
              onCambiarModoFoto={() => setModoPrincipal('estudio_foto')}
              onCerrar={handleCerrar}
              className="w-full h-full min-h-[520px]"
            />
          </div>
        ) : (
          /* CUERPO PRINCIPAL MODO FOTO IA (2 COLUMNAS) */
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-50/50">
          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y ENTRADAS (5 COLS) */}
          <div className="lg:col-span-5 space-y-5">
            {/* TARJETA 1: PRENDA SELECCIONADA */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-16 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                {urlPrendaPreview ? (
                  <img
                    src={urlPrendaPreview}
                    alt={prenda.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Shirt className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#9B7B54] tracking-wider block">
                  Prenda a Probar
                </span>
                <h4 className="font-serif font-bold text-sm text-stone-900 truncate">{prenda.nombre}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                  {prenda.talla && (
                    <span className="bg-[#FAF8F5] border border-[#E7E1D7] px-2 py-0.5 rounded font-semibold text-stone-700">
                      Talla: {prenda.talla}
                    </span>
                  )}
                  {prenda.color && (
                    <span className="bg-[#FAF8F5] border border-[#E7E1D7] px-2 py-0.5 rounded font-semibold text-stone-700">
                      Color: {prenda.color}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* TARJETA 2: SELECTOR DE PERSONA (SUBIR / MODELOS / CÁMARA) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-gray-700 tracking-wider">
                  1. Elige quién se probará la prenda
                </label>
              </div>

              {/* TABS SELECTORAS */}
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setTabPersona('upload');
                    detenerCamara();
                  }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    tabPersona === 'upload'
                      ? 'bg-white text-black shadow-sm font-black'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTabPersona('modelos');
                    detenerCamara();
                  }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    tabPersona === 'modelos'
                      ? 'bg-white text-black shadow-sm font-black'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Modelos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTabPersona('camara');
                    iniciarCamara();
                  }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    tabPersona === 'camara'
                      ? 'bg-white text-black shadow-sm font-black'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cámara</span>
                </button>
              </div>

              {/* CONTENIDO SEGÚN TAB SELECCIONADA */}
              {tabPersona === 'upload' && (
                <div className="space-y-3">
                  {fotoPersona ? (
                    <div>
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-56 flex items-center justify-center group">
                        <img
                          src={fotoPersona}
                          alt="Foto seleccionada"
                          className="w-full h-56 object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="bg-white text-black px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-100 transition">
                            Cambiar Foto
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                      {nombreArchivo && (
                        <p className="text-[11px] text-gray-500 mt-1 truncate">Archivo: {nombreArchivo}</p>
                      )}
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 hover:border-[#9B7B54] hover:bg-[#FAF8F5] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        Haz clic para subir una foto de cuerpo completo o medio cuerpo
                      </span>
                      <span className="text-[11px] text-gray-400 mt-1">
                        PNG, JPG o WebP (Fondo claro recomendado)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {tabPersona === 'modelos' && (
                <div className="space-y-2">
                  <span className="text-[11px] text-gray-500 block">
                    Elige un avatar o modelo con tu contextura física:
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {modelosBase.map((mod) => (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => {
                          setModeloSeleccionado(mod);
                          setResultado(null);
                        }}
                        className={`p-2 rounded-xl border text-left flex gap-2 items-center transition ${
                          modeloSeleccionado?.id === mod.id
                            ? 'border-[#9B7B54] bg-[#FAF8F5] ring-2 ring-[#9B7B54]/20'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <img
                          src={mod.fotoUrl}
                          alt={mod.nombre}
                          className="w-12 h-14 rounded-lg object-cover shrink-0 border border-gray-200"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-gray-900 truncate">{mod.nombre}</p>
                          <p className="text-[10px] text-gray-500 truncate">{mod.tipoCuerpo}</p>
                          <p className="text-[10px] font-semibold text-[#9B7B54]">{mod.estatura}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tabPersona === 'camara' && (
                <div className="space-y-3 text-center">
                  {/* CONTENEDOR DEL VIDEO CON OVERLAY DEL CRONÓMETRO */}
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-64 flex items-center justify-center border border-gray-800 shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />

                    {/* EFECTO FLASH AL TOMAR LA FOTO */}
                    {efectoFlash && (
                      <div className="absolute inset-0 bg-white animate-fade-out z-30 pointer-events-none" />
                    )}

                    {/* OVERLAY DEL CRONÓMETRO / CUENTA REGRESIVA */}
                    {cuentaRegresiva !== null && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-20 text-white animate-in zoom-in-90 duration-200">
                        <div className="relative flex items-center justify-center">
                          <div className="w-24 h-24 rounded-full border-4 border-[#9B7B54]/40 animate-ping absolute" />
                          <div className="w-20 h-20 rounded-full bg-stone-900 border-2 border-[#9B7B54] flex items-center justify-center shadow-2xl">
                            <span className="text-3xl font-black text-[#9B7B54] font-mono animate-pulse">
                              {cuentaRegresiva === 0 ? '📸' : `${cuentaRegresiva}s`}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-[#FAF8F5] mt-3 px-4 py-1 rounded-full bg-black/70 border border-white/10">
                          {cuentaRegresiva === 0 ? '¡Sonríe!' : '¡Acomódate en pose!'}
                        </p>
                        <button
                          type="button"
                          onClick={cancelarTemporizador}
                          className="mt-3 text-[11px] font-semibold text-gray-300 hover:text-white underline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SELECTOR DE TIEMPO DEL TEMPORIZADOR */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-[#9B7B54]" />
                      <span>Temporizador:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[10, 5, 3].map((seg) => (
                        <button
                          key={seg}
                          type="button"
                          onClick={() => setDuracionTimer(seg)}
                          disabled={cuentaRegresiva !== null}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            duracionTimer === seg
                              ? 'bg-stone-900 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {seg}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BOTONES DE DISPARO */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => iniciarTemporizadorYCaptura(duracionTimer)}
                      disabled={cuentaRegresiva !== null}
                      className="py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Timer className="w-4 h-4 text-[#9B7B54]" />
                      <span>Foto con {duracionTimer}s</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => iniciarTemporizadorYCaptura(0)}
                      disabled={cuentaRegresiva !== null}
                      className="py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4 text-[#9B7B54]" />
                      <span>Tomar Ya</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AVISO OFFLINE DENTRO DEL MODAL */}
            {!isOnline && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2.5">
                <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-medium text-amber-900">
                  Estás sin conexión. La prueba virtual IA requiere acceso a internet.
                </span>
              </div>
            )}

            {/* BOTÓN PRINCIPAL DE GENERAR PRUEBA VIRTUAL */}
            <button
              type="button"
              onClick={handleProbarPrenda}
              disabled={procesando || !isOnline}
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                !isOnline
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                  : 'bg-stone-900 hover:bg-stone-800 text-[#FAF8F5] border border-[#9B7B54]/40 shadow-md disabled:opacity-50 disabled:pointer-events-none'
              }`}
            >
              {procesando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Generando con IA...</span>
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 text-stone-500" />
                  <span>Conexión Requerida para IA</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>✨ Probar Prenda con IA</span>
                </>
              )}
            </button>

            {/* MENSAJES DE ERROR */}
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: VISOR INTERACTIVO Y RESULTADOS (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* VISOR PRINCIPAL */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-between min-h-[420px]">
              {/* BARRA SUPERIOR DEL VISOR (MODOS ANTES/DESPUÉS) */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 text-xs">
                <span className="font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#9B7B54]" />
                  <span>Visualización del Look</span>
                </span>

                {resultado && (
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl font-bold">
                    <button
                      type="button"
                      onClick={() => setModoVista('split')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        modoVista === 'split' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      Comparar
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoVista('resultado')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        modoVista === 'resultado' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      Con la Prenda
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoVista('original')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        modoVista === 'original' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      Original
                    </button>
                  </div>
                )}
              </div>

              {/* CONTENIDO DEL VISOR */}
              <div className="relative flex-1 rounded-2xl overflow-hidden bg-gray-100 min-h-[340px] flex items-center justify-center my-3">
                {procesando ? (
                  /* PANTALLA DE CARGA PROGRESIVA */
                  <div className="text-center p-8 space-y-4 max-w-sm">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="w-20 h-20 rounded-full border-4 border-[#E7E1D7] border-t-[#9B7B54] animate-spin" />
                      <Sparkles className="w-8 h-8 text-[#9B7B54] absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-base text-gray-900">Ajustando Prenda con IA</h4>
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">{progresoTexto}</p>
                    </div>
                  </div>
                ) : resultado ? (
                  /* VISOR DEL RESULTADO CON COMPARADOR INTERACTIVO */
                  <div className="relative w-full h-full min-h-[340px] flex items-center justify-center overflow-hidden">
                    {modoVista === 'resultado' && (
                      <img
                        src={getImageUrl(resultado.imagenResultadoUrl)}
                        alt="Look generado"
                        className="w-full h-full max-h-[460px] object-contain rounded-xl"
                      />
                    )}

                    {modoVista === 'original' && (
                      <img
                        src={getImageUrl(resultado.imagenOriginalPersona)}
                        alt="Foto original"
                        className="w-full h-full max-h-[460px] object-contain rounded-xl"
                      />
                    )}

                    {modoVista === 'split' && (
                      <div className="relative w-full h-full max-h-[460px] flex items-center justify-center select-none overflow-hidden">
                        {/* IMAGEN DE FONDO (CON PRENDA) */}
                        <img
                          src={getImageUrl(resultado.imagenResultadoUrl)}
                          alt="Con prenda"
                          className="w-full h-full max-h-[460px] object-contain"
                        />

                        {/* IMAGEN SUPERPUESTA RECORTADA (ORIGINAL) */}
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                        >
                          <img
                            src={getImageUrl(resultado.imagenOriginalPersona)}
                            alt="Original"
                            className="w-full h-full max-h-[460px] object-contain"
                          />
                        </div>

                        {/* LÍNEA Y CONTROL DESLIZANTE */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-10 pointer-events-none"
                          style={{ left: `${sliderPos}%` }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center text-gray-800 font-bold text-xs border border-gray-200">
                            ↔
                          </div>
                        </div>

                        {/* INPUT RANGE INVISIBLE PARA CONTROLAR SLIDER */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sliderPos}
                          onChange={(e) => setSliderPos(Number(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-ew-resize z-20 w-full h-full"
                        />

                        {/* ETIQUETAS ANTES / DESPUÉS */}
                        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-bold z-10">
                          Original
                        </div>
                        <div className="absolute bottom-3 right-3 bg-stone-900/90 backdrop-blur-sm text-[#FAF8F5] border border-[#9B7B54]/40 px-2.5 py-1 rounded-lg text-[10px] font-bold z-10">
                          ✨ Probador IA
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ESTADO VACÍO PREVIO A PROBAR */
                  <div className="text-center p-8 space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7] flex items-center justify-center mx-auto shadow-xs">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-gray-900">Listo para Probar</h4>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                        Selecciona o sube tu foto a la izquierda y presiona el botón para ver cómo te queda puesta esta prenda.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* BARRA INFERIOR DE ACCIONES */}
              {resultado && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#FAF8F5] text-stone-900 px-2.5 py-1 rounded-full border border-[#E7E1D7]">
                      <Sparkles className="w-3 h-3 text-[#9B7B54]" />
                      Prueba Virtual Completada
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Procesado en {resultado.tiempoProcesamientoSegundos}s
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDescargar}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Guardar Look</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
