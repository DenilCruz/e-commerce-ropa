import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let cachedPoseLandmarker: PoseLandmarker | null = null;

// Cargar imagen de manera segura evitando bloqueos CORS
async function loadImageSafe(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => resolve(img);
    img.onerror = async () => {
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        reject(new Error('No se pudo cargar la imagen proporcionada.'));
        return;
      }
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const objUrl = URL.createObjectURL(blob);
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          URL.revokeObjectURL(objUrl);
          resolve(fallbackImg);
        };
        fallbackImg.onerror = () => {
          URL.revokeObjectURL(objUrl);
          reject(new Error('Fallo al descargar la imagen a través de proxy local.'));
        };
        fallbackImg.src = objUrl;
      } catch (err) {
        reject(err);
      }
    };

    img.src = src;
  });
}

// Convertir fondo blanco de la prenda en transparencia con bordes suavizados
function createCutoutGarment(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 600;
  canvas.height = img.naturalHeight || img.height || 800;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // Fondo blanco o casi blanco
      if (r > 240 && g > 240 && b > 240) {
        d[i + 3] = 0;
      } else if (r > 218 && g > 218 && b > 218) {
        const factor = (240 - Math.max(r, g, b)) / 22;
        d[i + 3] = Math.round(d[i + 3] * Math.max(0, Math.min(1, factor)));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Si la imagen tiene restricción de origen se utiliza sin recortar
  }

  return canvas;
}

// Obtener o inicializar el detector de posturas en modo estático (IMAGE)
async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (cachedPoseLandmarker) return cachedPoseLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  );

  cachedPoseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    numPoses: 1,
  });

  return cachedPoseLandmarker;
}

export interface FitGarmentOptions {
  personImageUrl: string;
  garmentImageUrl: string;
  category?: 'tops' | 'bottoms' | 'dresses' | string;
  garmentName?: string;
  onProgress?: (step: string) => void;
}

export interface FitGarmentResult {
  compositeDataUrl: string;
  detectedBody: boolean;
}

/**
 * Ajusta anatómica y fotorrealistamente una prenda sobre la foto de una persona
 * utilizando detección de postura MediaPipe (hombros, cuello, pecho y cadera).
 */
export async function fitGarmentOnPhoto({
  personImageUrl,
  garmentImageUrl,
  category = 'tops',
  onProgress,
}: FitGarmentOptions): Promise<FitGarmentResult> {
  onProgress?.('Cargando fotografías...');
  const [personImg, garmentImg] = await Promise.all([
    loadImageSafe(personImageUrl),
    loadImageSafe(garmentImageUrl),
  ]);

  const W = personImg.naturalWidth || personImg.width || 800;
  const H = personImg.naturalHeight || personImg.height || 1000;

  // Canvas final a resolución nativa
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto gráfico 2D.');
  }

  // 1. Dibujar imagen original de la persona
  ctx.drawImage(personImg, 0, 0, W, H);

  // 2. Aislar prenda con transparencia
  onProgress?.('Procesando tejido y transparencia de la prenda...');
  const garmentCanvas = createCutoutGarment(garmentImg);
  const gAspect = garmentCanvas.height / (garmentCanvas.width || 1);

  // 3. Detectar postura anatómica
  onProgress?.('Detectando hombros, postura y proporción corporal...');
  let detected = false;
  let ls = { x: 0, y: 0 };
  let rs = { x: 0, y: 0 };
  let lh = { x: 0, y: 0 };
  let rh = { x: 0, y: 0 };

  try {
    const landmarker = await getPoseLandmarker();
    const result = landmarker.detect(personImg);
    const lm = result.landmarks?.[0];

    if (lm && lm[11] && lm[12]) {
      const vLs = lm[11].visibility ?? 1;
      const vRs = lm[12].visibility ?? 1;

      if (vLs > 0.35 || vRs > 0.35) {
        detected = true;
        ls = { x: lm[11].x * W, y: lm[11].y * H };
        rs = { x: lm[12].x * W, y: lm[12].y * H };

        if (lm[23] && lm[24]) {
          lh = { x: lm[23].x * W, y: lm[23].y * H };
          rh = { x: lm[24].x * W, y: lm[24].y * H };
        } else {
          // Estimar cadera a partir de la distancia entre hombros
          const sw = Math.hypot(rs.x - ls.x, rs.y - ls.y);
          lh = { x: ls.x, y: ls.y + sw * 1.3 };
          rh = { x: rs.x, y: rs.y + sw * 1.3 };
        }
      }
    }
  } catch {
    // Si falla la detección, se continúa con el modo de ajuste proporcional
  }

  const catLower = (category || '').toLowerCase();
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
  const isCoat =
    catLower.includes('coat') ||
    catLower.includes('abrigo') ||
    catLower.includes('trench') ||
    catLower.includes('blazer') ||
    catLower.includes('chaqueta');

  onProgress?.('Ajustando corte, caída y sombras fotorrealistas...');

  if (detected) {
    // ── MODO ANATÓMICO PRECISO CON LANDMARKS ──
    const sw = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
    const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };

    const downVector = { x: hipMid.x - shoulderMid.x, y: hipMid.y - shoulderMid.y };
    const downLen = Math.hypot(downVector.x, downVector.y) || 1;
    const downUnit = { x: downVector.x / downLen, y: downVector.y / downLen };

    // Ángulo de inclinación del torso según la columna
    const torsoAngle = Math.atan2(downUnit.x, downUnit.y);

    let gw: number;
    let gh: number;
    let center: { x: number; y: number };

    if (isBottom) {
      const hw = Math.hypot(rh.x - lh.x, rh.y - lh.y) || sw * 0.75;
      gw = hw * 1.45;
      gh = gw * gAspect;
      center = {
        x: hipMid.x + downUnit.x * (gh * 0.46),
        y: hipMid.y + downUnit.y * (gh * 0.46),
      };
    } else if (isDress) {
      gw = sw * 1.62;
      gh = gw * gAspect;
      center = {
        x: shoulderMid.x + downUnit.x * (gh * 0.44),
        y: shoulderMid.y + downUnit.y * (gh * 0.44),
      };
    } else {
      // Tops, abrigos, chaquetas, poleras
      const widthFactor = isCoat ? 1.70 : 1.52;
      gw = sw * widthFactor;
      gh = gw * gAspect;
      center = {
        x: shoulderMid.x + downUnit.x * (gh * 0.42),
        y: shoulderMid.y + downUnit.y * (gh * 0.42),
      };
    }

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(torsoAngle);

    // Sombra de contacto difuminada sobre el cuerpo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
    ctx.shadowBlur = Math.round(sw * 0.12);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(sw * 0.05);

    // Dibujar prenda
    ctx.drawImage(garmentCanvas, -gw / 2, -gh / 2, gw, gh);

    // Volumen y gradiente sutil de tela
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
  } else {
    // ── MODO PROPORCIONAL DE RESPALDO (Sin detección nítida) ──
    let targetWidthRatio = 0.52;
    let topRatio = 0.28;

    if (isBottom) {
      targetWidthRatio = 0.44;
      topRatio = 0.52;
    } else if (isDress) {
      targetWidthRatio = 0.54;
      topRatio = 0.25;
    } else if (isCoat) {
      targetWidthRatio = 0.58;
      topRatio = 0.26;
    }

    const gw = Math.round(W * targetWidthRatio);
    const gh = Math.round(gw * gAspect);
    const left = Math.round((W - gw) / 2);
    const top = Math.round(H * topRatio);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
    ctx.shadowBlur = Math.round(gw * 0.08);
    ctx.shadowOffsetY = Math.round(gw * 0.03);

    ctx.drawImage(garmentCanvas, left, top, gw, gh);
    ctx.restore();
  }

  onProgress?.('Finalizando renderizado...');
  const compositeDataUrl = canvas.toDataURL('image/jpeg', 0.95);

  return {
    compositeDataUrl,
    detectedBody: detected,
  };
}
