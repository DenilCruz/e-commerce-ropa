import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  ShieldCheck,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
} from '@mediapipe/tasks-vision';

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

/* ─── Índices de landmarks de MediaPipe Pose (33 puntos) ─── */
const L = {
  LS: 11, RS: 12,   // Hombros
  LE: 13, RE: 14,   // Codos
  LW: 15, RW: 16,   // Muñecas
  LH: 23, RH: 24,   // Caderas
  LK: 25, RK: 26,   // Rodillas
  LA: 27, RA: 28,   // Tobillos
} as const;

/* ─── Utilidades vectoriales 2D ─── */
type Vec2 = { x: number; y: number };
const sub  = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const add  = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const mul  = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
const mid  = (a: Vec2, b: Vec2): Vec2 => mul(add(a, b), 0.5);
const vlen = (a: Vec2): number => Math.hypot(a.x, a.y);
const unit = (a: Vec2): Vec2 => { const l = vlen(a) || 1; return { x: a.x / l, y: a.y / l }; };

/* ─── Estructura de Física de Caída de Tela (Spring-Damper) ─── */
interface ClothPhysics {
  swayX: number;       // Desplazamiento lateral del dobladillo por inercia (px)
  swayVel: number;     // Velocidad del bamboleo
  tiltAngle: number;   // Ángulo de retraso rotacional
  tiltVel: number;
  lastTorsoX: number;  // Posición X anterior del cuerpo
  lastTime: number;    // Marca de tiempo anterior
}

/* ─── Remoción de fondo blanco de la prenda en canvas offscreen ─── */
function createTransparentGarment(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 600;
  canvas.height = img.naturalHeight || img.height || 800;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // Convertir fondo blanco / muy claro en transparencia PNG con suavizado perimetral
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > 238 && g > 238 && b > 238) {
        d[i + 3] = 0;
      } else if (r > 218 && g > 218 && b > 218) {
        const factor = (238 - Math.max(r, g, b)) / 20;
        d[i + 3] = Math.round(d[i + 3] * factor);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Si ocurre restricción de origen cruzado, dejamos el canvas intacto
  }

  return canvas;
}

/* ─── Renderizado de Prenda con Física de Tela y Deformación ─── */
function drawDrapedGarment(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  garmentCanvas: HTMLCanvasElement,
  category: string,
  physics: ClothPhysics,
) {
  const ls = pts[L.LS];
  const rs = pts[L.RS];
  const lh = pts[L.LH];
  const rh = pts[L.RH];

  const sw = vlen(sub(ls, rs));
  if (sw < 15) return;

  const shoulderMid = mid(ls, rs);
  const hipMid = mid(lh, rh);
  const gAspect = garmentCanvas.height / (garmentCanvas.width || 1);
  const catLower = (category || 'tops').toLowerCase();

  const isBottom =
    catLower.includes('bottom') ||
    catLower.includes('pantalon') ||
    catLower.includes('jean') ||
    catLower.includes('falda') ||
    catLower.includes('short');

  const isDress =
    catLower.includes('vestido') ||
    catLower.includes('dress') ||
    catLower.includes('one-piece') ||
    catLower.includes('traje');

  // 1. Vector del torso orientado hacia abajo (columna vertebral)
  const down = unit(sub(hipMid, shoulderMid));

  // 2. Ángulo de inclinación del torso respecto al eje vertical de la gravedad (¡siempre vertical erguido!)
  const torsoAngle = Math.atan2(down.x, down.y);

  // 3. Proporciones y dimensionamiento anatómico
  let gw: number;
  let gh: number;
  let anchorCenter: Vec2;

  if (isBottom) {
    const hw = vlen(sub(lh, rh)) || sw * 0.75;
    const lk = pts[L.LK] || add(lh, { x: 0, y: hw * 1.5 });
    const rk = pts[L.RK] || add(rh, { x: 0, y: hw * 1.5 });
    const kneeMid = mid(lk, rk);
    const legDown = unit(sub(kneeMid, hipMid));

    gw = hw * 1.45;
    gh = gw * gAspect;
    anchorCenter = add(hipMid, mul(legDown, gh * 0.46));
  } else if (isDress) {
    gw = sw * 1.65;
    gh = gw * gAspect;
    anchorCenter = add(shoulderMid, mul(down, gh * 0.44));
  } else {
    // Tops / Abrigos / Poleras / Camisas
    const widthFactor =
      catLower.includes('coat') || catLower.includes('abrigo') || catLower.includes('blazer')
        ? 1.78
        : 1.55;
    gw = sw * widthFactor;
    gh = gw * gAspect;
    anchorCenter = add(shoulderMid, mul(down, gh * 0.42));
  }

  // 4. Actualizar Física de Inercia del Dobladillo (Bamboleo orgánico)
  const now = performance.now();
  const dt = Math.min(Math.max((now - physics.lastTime) / 1000, 0.008), 0.05);
  physics.lastTime = now;

  const currentTorsoX = anchorCenter.x;
  const torsoVelX = (currentTorsoX - physics.lastTorsoX) / dt;
  physics.lastTorsoX = currentTorsoX;

  // Fuerza inercial contraria al movimiento lateral
  const inertialForce = -torsoVelX * 0.16;
  const springK = 32.0; // Tensión de la tela
  const damping = 6.5;  // Fricción del aire
  const acc = -springK * physics.swayX - damping * physics.swayVel + inertialForce;

  physics.swayVel += acc * dt;
  physics.swayX += physics.swayVel * dt;
  physics.swayX = Math.max(-45, Math.min(45, physics.swayX)); // Límites de elasticidad

  // 5. Dibujar Sombra Volumétrica de Profundidad (Evita efecto cartón plano)
  ctx.save();
  ctx.translate(anchorCenter.x, anchorCenter.y);
  ctx.rotate(torsoAngle);

  // Sombra de contacto difuminada detrás de la prenda
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = Math.round(sw * 0.12);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(sw * 0.05);

  // 6. Deformación Anatómica en 3 Secciones Horizontales (Skinning con Física de Tela)
  // Divide la prenda en: Hombros (fijos), Torso medio (transición) y Dobladillo (oscilación física)
  const numSlices = 3;
  const sliceHeight = garmentCanvas.height / numSlices;
  const destSliceHeight = gh / numSlices;

  for (let i = 0; i < numSlices; i++) {
    // Proporción de oscilación: 0% en cuello, 40% en cintura, 100% en dobladillo
    const swayFactor = i === 0 ? 0.0 : i === 1 ? 0.4 : 1.0;
    const sliceSway = physics.swayX * swayFactor;

    const sy = i * sliceHeight;
    const dy = -gh / 2 + i * destSliceHeight;

    ctx.save();
    // Desplazamiento orgánico por resorte en cada sección
    ctx.translate(sliceSway, 0);

    ctx.drawImage(
      garmentCanvas,
      0,
      sy,
      garmentCanvas.width,
      sliceHeight,
      -gw / 2,
      dy,
      gw,
      destSliceHeight + 1, // +1 para evitar hendiduras entre cortes
    );
    ctx.restore();
  }

  // 7. Relieve e Iluminación Sutil (Brillo especular y sombra en pliegues)
  const depthGradient = ctx.createLinearGradient(-gw / 2, 0, gw / 2, 0);
  depthGradient.addColorStop(0, 'rgba(0,0,0,0.18)');
  depthGradient.addColorStop(0.2, 'rgba(255,255,255,0.06)');
  depthGradient.addColorStop(0.5, 'rgba(0,0,0,0)');
  depthGradient.addColorStop(0.8, 'rgba(255,255,255,0.06)');
  depthGradient.addColorStop(1, 'rgba(0,0,0,0.18)');

  ctx.fillStyle = depthGradient;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillRect(-gw / 2, -gh / 2, gw, gh);

  ctx.restore();
}

/* ─── Estimar puntos ocultos ─── */
function estimateHidden(pts: Vec2[], lm: Array<{ x: number; y: number; visibility: number }>) {
  const vis = (i: number) => (lm[i]?.visibility ?? 0) > 0.45;
  const ls = pts[L.LS], rs = pts[L.RS];
  const sw = vlen(sub(ls, rs));
  const across = unit(sub(ls, rs));
  const down: Vec2 = { x: -across.y, y: across.x };

  if (!vis(L.LH) || !vis(L.RH)) {
    pts[L.LH] = add(add(ls, mul(down, sw * 1.3)), mul(across, -sw * 0.12));
    pts[L.RH] = add(add(rs, mul(down, sw * 1.3)), mul(across,  sw * 0.12));
  }
  const armDefs: [number, number, number, number][] = [
    [L.LS, L.LE, L.LW, 1],
    [L.RS, L.RE, L.RW, -1],
  ];
  for (const [s, e, w, side] of armDefs) {
    if (!vis(e)) pts[e] = add(add(pts[s], mul(down, sw * 0.7)), mul(across, side * sw * 0.15));
    if (!vis(w)) pts[w] = add(pts[e], mul(down, sw * 0.7));
  }
  if (!vis(L.LK)) pts[L.LK] = add(pts[L.LH], mul(down, sw * 1.2));
  if (!vis(L.RK)) pts[L.RK] = add(pts[L.RH], mul(down, sw * 1.2));
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL: GarmentARLiveViewer
   ═══════════════════════════════════════════════════════════════════════════ */
export const GarmentARLiveViewer: React.FC<GarmentARLiveViewerProps> = ({
  garmentImageUrl,
  garmentName = 'Prenda de Colección',
  garmentCategory = 'tops',
  className = '',
  onCambiarModoFoto,
  onCerrar,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cámara controlada por el usuario (apagada inicialmente para total privacidad)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Referencia física permanente del stream de hardware (¡nunca huérfano!)
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Referencias de IA
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const smoothedRef = useRef<Array<{ x: number; y: number; visibility: number }> | null>(null);
  const lastTimeRef = useRef(-1);
  const bodyDetectedRef = useRef(false);

  // Estado del simulador de física de tela
  const clothPhysicsRef = useRef<ClothPhysics>({
    swayX: 0,
    swayVel: 0,
    tiltAngle: 0,
    tiltVel: 0,
    lastTorsoX: 0,
    lastTime: performance.now(),
  });

  // Canvas procesado de la prenda real (sin fondo blanco)
  const cutoutGarmentCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Refs de estado para el bucle de renderizado a 60 FPS
  const showLandmarksRef = useRef(showLandmarks);
  const showSkeletonRef = useRef(showSkeleton);
  const garmentCategoryRef = useRef(garmentCategory);

  useEffect(() => { showLandmarksRef.current = showLandmarks; }, [showLandmarks]);
  useEffect(() => { showSkeletonRef.current = showSkeleton; }, [showSkeleton]);
  useEffect(() => { garmentCategoryRef.current = garmentCategory; }, [garmentCategory]);

  const ALPHA = 0.52; // Factor de suavizado EMA

  /* ── Cargar y pre-procesar imagen de la prenda ── */
  useEffect(() => {
    if (!garmentImageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = garmentImageUrl;
    img.onload = () => {
      cutoutGarmentCanvasRef.current = createTransparentGarment(img);
    };
  }, [garmentImageUrl]);

  /* ── Sonido de detección ── */
  const playBeep = useCallback(
    (freq = 900, duration = 0.15) => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch { /* ignorar */ }
    },
    [soundEnabled],
  );

  /* ── DETENER CÁMARA Y LIBERAR DISPOSITIVO AL 100% ── */
  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Detener tracks del stream persistente
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch { /* ignorar */ }
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setCameraStarting(false);
    setBodyDetected(false);
    bodyDetectedRef.current = false;
  }, []);

  /* ── INICIAR CÁMARA WEB Y MODELO MEDIAPIPE BAJO DEMANDA ── */
  const startCamera = async () => {
    setCameraStarting(true);
    setError(null);

    try {
      // 1. Cargar modelo MediaPipe si aún no está inicializado
      if (!landmarkerRef.current) {
        setLoadingModel(true);
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
        );

        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        setLoadingModel(false);
      }

      // 2. Solicitar permiso de cámara al usuario
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
        audio: false,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((r) => {
          videoRef.current!.onloadedmetadata = () => r();
        });
        await videoRef.current.play();

        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) drawingUtilsRef.current = new DrawingUtils(ctx);
        }

        setCameraActive(true);
        setCameraStarting(false);
        isRunningRef.current = true;
        smoothedRef.current = null;
        lastTimeRef.current = -1;
        clothPhysicsRef.current.lastTime = performance.now();
        requestAnimationFrame(loop);
      }
    } catch (err: any) {
      stopCamera();
      setError('Por favor otorga permisos de cámara web en tu navegador para usar el espejo en vivo.');
    }
  };

  /* ── LIMPIEZA TOTAL AL DESMONTAR EL COMPONENTE ── */
  useEffect(() => {
    return () => {
      stopCamera();
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
          landmarkerRef.current = null;
        } catch { /* ignorar */ }
      }
    };
  }, [stopCamera]);

  /* ── Loop de detección a 60 FPS ── */
  const loop = () => {
    if (!isRunningRef.current) return;

    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (video && landmarker && video.readyState >= 2 && video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const lm = result.landmarks?.[0] ?? null;
        render(lm);
      } catch { /* omitir frame drop */ }
    }

    animFrameRef.current = requestAnimationFrame(loop);
  };

  /* ── Renderizado del frame ── */
  const render = (lm: Array<{ x: number; y: number; z?: number; visibility?: number }> | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (!lm) {
      smoothedRef.current = null;
      if (bodyDetectedRef.current) {
        bodyDetectedRef.current = false;
        setBodyDetected(false);
      }
      return;
    }

    // Suavizado temporal EMA
    const prev = smoothedRef.current;
    const smoothed = prev
      ? lm.map((p, i) => ({
          x: prev[i].x + ALPHA * (p.x - prev[i].x),
          y: prev[i].y + ALPHA * (p.y - prev[i].y),
          visibility: p.visibility ?? 0,
        }))
      : lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 0 }));
    smoothedRef.current = smoothed;

    const shouldersOk = [L.LS, L.RS].every((i) => smoothed[i].visibility > 0.45);

    if (!shouldersOk) {
      if (bodyDetectedRef.current) {
        bodyDetectedRef.current = false;
        setBodyDetected(false);
      }
      return;
    }

    if (!bodyDetectedRef.current) {
      bodyDetectedRef.current = true;
      setBodyDetected(true);
      playBeep(1100, 0.1);
    }

    // Proyectar puntos al espacio de pantalla espejado (modo selfie)
    const mirroredLm = smoothed.map((p) => ({
      ...p,
      x: 1 - p.x,
    }));

    const pts: Vec2[] = mirroredLm.map((p) => ({ x: p.x * W, y: p.y * H }));

    estimateHidden(pts, mirroredLm);

    // ── DIBUJAR PRENDA REAL CON FÍSICA Y ORIENTACIÓN VERTICAL CORREGIDA ──
    if (cutoutGarmentCanvasRef.current) {
      drawDrapedGarment(
        ctx,
        pts,
        cutoutGarmentCanvasRef.current,
        garmentCategoryRef.current,
        clothPhysicsRef.current,
      );
    }

    // ── ESQUELETO Y PUNTOS DE IA (Si están activados) ──
    if (showSkeletonRef.current && drawingUtilsRef.current) {
      drawingUtilsRef.current.drawConnectors(
        mirroredLm,
        PoseLandmarker.POSE_CONNECTIONS,
        { color: '#00e5ff', lineWidth: 2 },
      );
    }

    if (showLandmarksRef.current && drawingUtilsRef.current) {
      drawingUtilsRef.current.drawLandmarks(
        mirroredLm,
        { color: '#ffea00', radius: 4 },
      );
    }
  };

  /* ── Captura de foto con prenda en vivo ── */
  const handleCapturePhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    setFlashEffect(true);
    playBeep(1400, 0.25);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Dibujar video espejado
    tempCtx.save();
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.restore();

    // Dibujar la prenda encima
    tempCtx.drawImage(canvas, 0, 0);

    setTimeout(() => {
      setFlashEffect(false);
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ar_look_${garmentName.replace(/\s+/g, '_')}.jpg`;
      link.click();
    }, 150);
  }, [garmentName, playBeep]);

  const handleCerrarTodo = () => {
    stopCamera();
    if (onCerrar) onCerrar();
  };

  return (
    <div
      className={`relative w-full h-full min-h-[520px] rounded-3xl overflow-hidden bg-slate-950 select-none flex flex-col items-center justify-center border border-slate-800 shadow-2xl ${className}`}
    >
      {/* ─── PANTALLA DE BIENVENIDA / CONSENTIMIENTO (CÁMARA APAGADA) ─── */}
      {!cameraActive && (
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center p-6 text-center text-white space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-xl shadow-emerald-500/10">
              <Camera className="w-10 h-10 text-emerald-400" />
            </div>
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
              60 FPS
            </span>
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Espejo de Realidad Aumentada
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-light leading-relaxed">
              Pruébate <strong className="text-white font-semibold">{garmentName}</strong> en directo frente a tu cámara con física de caída y movimiento anatómico.
            </p>
          </div>

          {/* Información de Privacidad */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Privacidad garantizada: Tu cámara no se graba ni se transmite por internet.</span>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2 max-w-md">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={startCamera}
              disabled={cameraStarting}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white rounded-2xl text-xs font-black tracking-wider uppercase transition flex items-center gap-2.5 shadow-xl shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
            >
              {cameraStarting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Conectando Cámara...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Encender Cámara Web y Probar</span>
                </>
              )}
            </button>

            {onCambiarModoFoto && (
              <button
                type="button"
                onClick={onCambiarModoFoto}
                className="px-5 py-3 bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <span>Usar Foto de Archivo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── CAPAS DE VIDEO Y CANVAS DE AR ─── */}
      <div className={`absolute inset-0 ${cameraActive ? 'block' : 'hidden'}`}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover block"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover block pointer-events-none"
        />
      </div>

      {/* ─── FLASH EFFECT ─── */}
      {flashEffect && (
        <div
          className="absolute inset-0 bg-white z-30 pointer-events-none animate-pulse"
          style={{ animationDuration: '150ms' }}
        />
      )}

      {/* ─── OVERLAY DE CARGA MEDIAPIPE ─── */}
      {loadingModel && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 space-y-3">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="font-bold text-sm tracking-wide">Iniciando Visión Artificial con MediaPipe...</p>
          <p className="text-[11px] text-slate-400">Cargando modelo neuronal con aceleración GPU</p>
        </div>
      )}

      {/* ─── OVERLAYS Y CONTROLES CUANDO LA CÁMARA ESTÁ ACTIVA ─── */}
      {cameraActive && (
        <>
          {/* BADGE SUPERIOR IZQUIERDO: ESTADO */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/15 flex items-center gap-2 text-white shadow-lg">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    bodyDetected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500 animate-pulse'
                  }`}
                />
                <span className="text-xs font-black tracking-wide">
                  {bodyDetected ? 'Cuerpo Detectado en Vivo' : 'Buscando postura...'}
                </span>
              </div>

              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                🔴 AR 60 FPS
              </span>
            </div>

            <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-white text-[11px] max-w-xs truncate flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">Probando:</span>
              <span className="truncate">{garmentName}</span>
            </div>
          </div>

          {/* CONTROLES SUPERIORES DERECHOS: Landmarks, Esqueleto, Audio y Apagar Cámara */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 text-white shadow-lg">
              <button
                type="button"
                onClick={() => setShowLandmarks(!showLandmarks)}
                title={showLandmarks ? 'Ocultar Puntos IA' : 'Mostrar Puntos IA'}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  showLandmarks ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {showLandmarks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Puntos</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSkeleton(!showSkeleton)}
                title={showSkeleton ? 'Ocultar Esqueleto' : 'Mostrar Esqueleto'}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  showSkeleton ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Esqueleto</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Silenciar Efectos' : 'Activar Efectos'}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <div className="w-px h-4 bg-white/20 mx-0.5" />

              {/* Botón explícito para APAGAR CÁMARA */}
              <button
                type="button"
                onClick={stopCamera}
                title="Apagar Cámara Web"
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white transition flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span className="hidden sm:inline">Apagar</span>
              </button>
            </div>

            {onCerrar && (
              <button
                type="button"
                onClick={handleCerrarTodo}
                className="w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center border border-white/20 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* BARRA INFERIOR: CAPTURA DE FOTO */}
          <div className="absolute bottom-5 z-10 flex items-center justify-center gap-3 bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/15 text-white shadow-2xl">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Física de caída de tela activada</span>
            </div>

            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={!bodyDetected}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Camera className="w-4 h-4" />
              <span>Tomar Foto con Prenda</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
