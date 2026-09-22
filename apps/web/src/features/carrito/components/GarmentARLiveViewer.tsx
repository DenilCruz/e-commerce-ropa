import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Shirt,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
} from '@mediapipe/tasks-vision';

/* ─── Props del componente ─── */
interface GarmentARLiveViewerProps {
  garmentImageUrl: string;
  garmentName?: string;
  garmentColor?: string;
  className?: string;
}

/* ─── Índices de landmarks de MediaPipe Pose (33 puntos) ─── */
const L = {
  LS: 11, RS: 12,   // Hombros
  LE: 13, RE: 14,   // Codos
  LW: 15, RW: 16,   // Muñecas
  LH: 23, RH: 24,   // Caderas
} as const;

/* ─── Utilidades vectoriales (siguiendo el código de Kenji) ─── */
type Vec2 = { x: number; y: number };
const sub  = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const add  = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const mul  = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
const mid  = (a: Vec2, b: Vec2): Vec2 => mul(add(a, b), 0.5);
const vlen = (a: Vec2): number => Math.hypot(a.x, a.y);
const unit = (a: Vec2): Vec2 => { const l = vlen(a) || 1; return { x: a.x / l, y: a.y / l }; };
const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => add(a, mul(sub(b, a), t));

/* ─── Shade: oscurecer o aclarar un color hex ─── */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + (f < 0 ? v : 255 - v) * f)));
  const r = ch(n >> 16);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

/* ─── Tipos de manga ─── */
type SleeveType = 'none' | 'short' | 'long';

/* ─── Paleta de colores para el probador ─── */
const COLOR_PALETTE = [
  { id: 'negro',    hex: '#1a1a2e', name: 'Negro' },
  { id: 'blanco',   hex: '#f0f0f0', name: 'Blanco' },
  { id: 'azul',     hex: '#1d4ed8', name: 'Azul' },
  { id: 'rojo',     hex: '#b91c1c', name: 'Borgoña' },
  { id: 'verde',    hex: '#15803d', name: 'Verde' },
  { id: 'mostaza',  hex: '#ca8a04', name: 'Mostaza' },
  { id: 'gris',     hex: '#6b7280', name: 'Gris' },
  { id: 'lila',     hex: '#7c3aed', name: 'Violeta' },
];

/* ─── Dibujo articulado de la prenda (basado en drawShirt de Kenji) ─── */
function drawShirt(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  opts: { color: string; sleeves: SleeveType; logoImg?: HTMLImageElement | null },
) {
  const ls = pts[L.LS], rs = pts[L.RS], lh = pts[L.LH], rh = pts[L.RH];
  const sw = vlen(sub(ls, rs));                       // Ancho de hombros → escala general
  const shoulderMid = mid(ls, rs);
  const hipMid = mid(lh, rh);
  const down   = unit(sub(hipMid, shoulderMid));      // Eje del torso
  const across = unit(sub(ls, rs));                    // Eje de hombros (der→izq)
  const dark = shade(opts.color, -0.25);

  // ── MANGAS: trazo grueso desde hombro → codo (→ muñeca si manga larga) ──
  if (opts.sleeves !== 'none') {
    ctx.lineCap = 'round';
    ctx.lineWidth = sw * 0.34;
    ctx.strokeStyle = opts.color;

    const arms: [number, number, number][] = [
      [L.LS, L.LE, L.LW],
      [L.RS, L.RE, L.RW],
    ];
    for (const [s, e, w] of arms) {
      const start = add(pts[s], mul(down, sw * 0.12));    // Un poco debajo del hombro
      const end   = opts.sleeves === 'long' ? pts[w] : lerp(pts[s], pts[e], 0.55);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      if (opts.sleeves === 'long') ctx.lineTo(pts[e].x, pts[e].y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    // Borde sutil más oscuro en las mangas
    ctx.lineWidth = sw * 0.36;
    ctx.strokeStyle = shade(opts.color, -0.12);
    ctx.globalAlpha = 0.25;
    for (const [s, e, w] of arms) {
      const start = add(pts[s], mul(down, sw * 0.12));
      const end   = opts.sleeves === 'long' ? pts[w] : lerp(pts[s], pts[e], 0.55);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      if (opts.sleeves === 'long') ctx.lineTo(pts[e].x, pts[e].y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── CUERPO: cuadrilátero hombros→cadera, ensanchado ──
  const k = sw * (opts.sleeves === 'none' ? 0.12 : 0.22);
  const hemDrop = mul(down, sw * 0.18);
  const body = [
    add(add(ls, mul(across,  k)), mul(down, -sw * 0.06)),
    add(add(lh, mul(across,  k * 1.15)), hemDrop),
    add(add(rh, mul(across, -k * 1.15)), hemDrop),
    add(add(rs, mul(across, -k)), mul(down, -sw * 0.06)),
  ];

  ctx.fillStyle = opts.color;
  ctx.beginPath();
  ctx.moveTo(body[0].x, body[0].y);
  for (const p of body.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();

  // Sutil gradiente vertical para dar profundidad al torso
  const grd = ctx.createLinearGradient(
    shoulderMid.x, shoulderMid.y,
    hipMid.x, hipMid.y + sw * 0.18,
  );
  grd.addColorStop(0, 'rgba(255,255,255,0.06)');
  grd.addColorStop(0.5, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(body[0].x, body[0].y);
  for (const p of body.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();

  // ── CUELLO: elipse con "destination-out" para mostrar la piel ──
  const neck = add(shoulderMid, mul(down, sw * 0.05));
  const angle = Math.atan2(across.y, across.x);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(neck.x, neck.y, sw * 0.18, sw * 0.11, angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Borde del cuello (ribete oscuro)
  ctx.strokeStyle = dark;
  ctx.lineWidth = sw * 0.035;
  ctx.beginPath();
  ctx.ellipse(neck.x, neck.y, sw * 0.18, sw * 0.11, angle, 0, Math.PI * 2);
  ctx.stroke();

  // ── LOGO / GRÁFICO EN EL PECHO ──
  if (opts.logoImg && opts.logoImg.complete && opts.logoImg.naturalWidth > 0) {
    const chestCenter = add(shoulderMid, mul(down, sw * 0.50));
    const logoSize = sw * 0.35;
    const aspect = opts.logoImg.naturalHeight / opts.logoImg.naturalWidth;
    const logoW = logoSize;
    const logoH = logoSize * aspect;

    ctx.save();
    ctx.translate(chestCenter.x, chestCenter.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.92;

    // Clip circular para que el logo no salga del pecho
    ctx.beginPath();
    ctx.ellipse(0, 0, logoW * 0.55, logoH * 0.55, 0, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(opts.logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
    ctx.restore();
  }

  // Costuras sutiles laterales
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.setLineDash([4, 6]);
  // Costura izquierda
  ctx.beginPath();
  ctx.moveTo(body[0].x, body[0].y);
  ctx.lineTo(body[1].x, body[1].y);
  ctx.stroke();
  // Costura derecha
  ctx.beginPath();
  ctx.moveTo(body[3].x, body[3].y);
  ctx.lineTo(body[2].x, body[2].y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/* ─── Estimar puntos ocultos (cadera, codos, muñecas fuera de cuadro) ─── */
function estimateHidden(pts: Vec2[], lm: Array<{ x: number; y: number; visibility: number }>) {
  const vis = (i: number) => (lm[i]?.visibility ?? 0) > 0.5;
  const ls = pts[L.LS], rs = pts[L.RS];
  const sw = vlen(sub(ls, rs));
  const across = unit(sub(ls, rs));
  const down: Vec2 = { x: -across.y, y: across.x };  // Perpendicular a hombros

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
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL: GarmentARLiveViewer
   ═══════════════════════════════════════════════════════════════════════════ */
export const GarmentARLiveViewer: React.FC<GarmentARLiveViewerProps> = ({
  garmentImageUrl,
  garmentName = 'Prenda de Colección',
  garmentColor,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Estados de control
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingModel, setLoadingModel] = useState(true);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controles de la prenda
  const [sleeveType, setSleeveType] = useState<SleeveType>('short');
  const [activeColor, setActiveColor] = useState(garmentColor || '#1d4ed8');
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Refs internas
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const smoothedRef = useRef<Array<{ x: number; y: number; visibility: number }> | null>(null);
  const lastTimeRef = useRef(-1);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const bodyDetectedRef = useRef(false);

  // Refs para valores actuales dentro del render loop (evita stale closures)
  const sleeveTypeRef = useRef(sleeveType);
  const activeColorRef = useRef(activeColor);
  const showLandmarksRef = useRef(showLandmarks);
  const showSkeletonRef = useRef(showSkeleton);

  // Sincronizar refs con state
  useEffect(() => { sleeveTypeRef.current = sleeveType; }, [sleeveType]);
  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);
  useEffect(() => { showLandmarksRef.current = showLandmarks; }, [showLandmarks]);
  useEffect(() => { showSkeletonRef.current = showSkeleton; }, [showSkeleton]);

  const ALPHA = 0.5; // Suavizado EMA (1 = sin suavizado, más bajo = más suave)

  /* ── Cargar imagen de la prenda como logo del pecho ── */
  useEffect(() => {
    if (!garmentImageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = garmentImageUrl;
    img.onload = () => { logoImgRef.current = img; };
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
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch { /* ignorar */ }
    },
    [soundEnabled],
  );

  /* ── Inicializar PoseLandmarker de @mediapipe/tasks-vision ── */
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setLoadingModel(true);
      setError(null);

      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
        );

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });

        if (!isMounted) { landmarker.close(); return; }

        landmarkerRef.current = landmarker;
        setLoadingModel(false);
        startCamera();
      } catch (err: any) {
        if (isMounted) {
          setError(`Error al inicializar MediaPipe Tasks Vision: ${err.message}`);
          setLoadingModel(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      stopCamera();
      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch { /* ignorar */ }
      }
    };
  }, []);

  /* ── Iniciar Cámara Web ── */
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((r) => {
          videoRef.current!.onloadedmetadata = () => r();
        });
        await videoRef.current.play();
        // Establecer dimensiones del canvas al tamaño real del video
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
        setCameraActive(true);
        isRunningRef.current = true;
        smoothedRef.current = null;
        lastTimeRef.current = -1;
        requestAnimationFrame(loop);
      }
    } catch (camErr: any) {
      setError('Por favor otorga permisos de cámara web en tu navegador para usar el espejo en vivo.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  /* ── Loop principal de detección (requestAnimationFrame) ── */
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
      } catch { /* frame drop */ }
    }

    animFrameRef.current = requestAnimationFrame(loop);
  };

  /* ── Renderizar frame ── */
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

    // ── Suavizado EMA ──
    const prev = smoothedRef.current;
    const smoothed = prev
      ? lm.map((p, i) => ({
          x: prev[i].x + ALPHA * (p.x - prev[i].x),
          y: prev[i].y + ALPHA * (p.y - prev[i].y),
          visibility: p.visibility ?? 0,
        }))
      : lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 0 }));
    smoothedRef.current = smoothed;

    // ── Convertir a píxeles ──
    const pts: Vec2[] = smoothed.map((p) => ({ x: p.x * W, y: p.y * H }));

    // ── Verificar visibilidad de hombros ──
    const shouldersOk = [L.LS, L.RS].every((i) => smoothed[i].visibility > 0.5);

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

    // ── Estimar puntos ocultos (cadera, codos, muñecas fuera de cámara) ──
    estimateHidden(pts, smoothed);

    // ── Dibujar la prenda articulada ──
    drawShirt(ctx, pts, {
      color: activeColorRef.current,
      sleeves: sleeveTypeRef.current,
      logoImg: logoImgRef.current,
    });

    // ── Dibujar esqueleto (conexiones celestes) ──
    if (showSkeletonRef.current && drawingUtilsRef.current) {
      drawingUtilsRef.current.drawConnectors(
        smoothed,
        PoseLandmarker.POSE_CONNECTIONS,
        { color: '#00e5ff', lineWidth: 2 },
      );
    }

    // ── Dibujar landmarks (puntos amarillos) ──
    if (showLandmarksRef.current && drawingUtilsRef.current) {
      drawingUtilsRef.current.drawLandmarks(
        smoothed,
        { color: '#ffea00', radius: 4 },
      );
    }
  };

  /* ── Inicializar DrawingUtils cuando el canvas está listo ── */
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawingUtilsRef.current = new DrawingUtils(ctx);
      }
    }
  }, [cameraActive]);

  /* ── Capturar foto en vivo con la prenda puesta ── */
  const handleCapturePhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    setFlashEffect(true);
    playBeep(1400, 0.25);

    // Crear un canvas temporal con el video espejado + la prenda
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Dibujar video en espejo
    tempCtx.save();
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.restore();

    // Dibujar la prenda encima (del canvas principal)
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

  return (
    <div
      className={`relative w-full h-full min-h-[440px] rounded-3xl overflow-hidden bg-slate-950 select-none flex flex-col items-center justify-center border border-slate-800 ${className}`}
    >
      {/* ─── CAPAS DE VIDEO (espejo) + CANVAS (prenda) ─── */}
      <div className="absolute inset-0">
        {/* Video en espejo como fondo */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover block"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* Canvas transparente encima para la prenda articulada */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover block"
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>

      {/* ─── EFECTO FLASH AL TOMAR FOTO ─── */}
      {flashEffect && (
        <div className="absolute inset-0 bg-white z-30 pointer-events-none animate-pulse" style={{ animationDuration: '150ms' }} />
      )}

      {/* ─── OVERLAY DE CARGA ─── */}
      {loadingModel && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 space-y-3">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="font-bold text-sm tracking-wide">Iniciando Visión Artificial (MediaPipe)...</p>
          <p className="text-[11px] text-slate-400">Cargando PoseLandmarker con rastreo de brazos y torso</p>
        </div>
      )}

      {/* ─── OVERLAY DE ERROR ─── */}
      {error && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white z-20 p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <p className="text-sm font-bold text-rose-200 max-w-sm">{error}</p>
          <button
            type="button"
            onClick={startCamera}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Permitir y Reintentar Cámara</span>
          </button>
        </div>
      )}

      {/* ─── BADGE SUPERIOR IZQUIERDO: ESTADO ─── */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 flex items-center gap-2 text-white">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              bodyDetected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-xs font-black tracking-wide">
            {bodyDetected ? 'Cuerpo Detectado' : 'Buscando postura...'}
          </span>
        </div>
        {!bodyDetected && cameraActive && !loadingModel && (
          <span className="hidden sm:inline-block text-[11px] text-amber-200 bg-amber-950/70 border border-amber-500/30 backdrop-blur-md px-3 py-1 rounded-xl">
            Muestra hombros y brazos frente a la cámara
          </span>
        )}
      </div>

      {/* ─── CONTROLES SUPERIORES DERECHOS: Landmarks / Esqueleto / Audio ─── */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 text-white">
        {/* Toggle Landmarks (puntos amarillos) */}
        <button
          type="button"
          onClick={() => setShowLandmarks(!showLandmarks)}
          title={showLandmarks ? 'Ocultar Landmarks' : 'Mostrar Landmarks'}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
            showLandmarks ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          {showLandmarks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Puntos</span>
        </button>
        {/* Toggle Esqueleto (conexiones celestes) */}
        <button
          type="button"
          onClick={() => setShowSkeleton(!showSkeleton)}
          title={showSkeleton ? 'Ocultar Esqueleto' : 'Mostrar Esqueleto'}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
            showSkeleton ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Esqueleto</span>
        </button>
        {/* Toggle Audio */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Silenciar Efectos' : 'Activar Efectos'}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* ─── PANEL INFERIOR: CONTROLES DE LA PRENDA ─── */}
      <div className="absolute bottom-4 z-10 flex flex-wrap items-center justify-center gap-2 bg-black/75 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-white shadow-2xl max-w-[95%]">

        {/* Selector de tipo de manga */}
        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-xl border border-white/10 text-xs">
          <Shirt className="w-3.5 h-3.5 text-emerald-400 mr-1" />
          {([
            { type: 'none' as SleeveType, label: 'Sin Manga' },
            { type: 'short' as SleeveType, label: 'Corta' },
            { type: 'long' as SleeveType, label: 'Larga' },
          ]).map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => setSleeveType(type)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                sleeveType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Paleta de colores */}
        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-xl border border-white/10">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveColor(c.hex)}
              title={c.name}
              className={`w-6 h-6 rounded-full border-2 transition cursor-pointer hover:scale-110 ${
                activeColor === c.hex
                  ? 'border-emerald-400 ring-2 ring-emerald-400/40 scale-110'
                  : 'border-white/20'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-white/20 mx-1 hidden sm:block" />

        {/* Botón de captura */}
        <button
          type="button"
          onClick={handleCapturePhoto}
          disabled={!bodyDetected}
          title="Tomar Foto con la Prenda en Vivo"
          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-4 h-4" />
          <span>Tomar Foto</span>
        </button>
      </div>
    </div>
  );
};
