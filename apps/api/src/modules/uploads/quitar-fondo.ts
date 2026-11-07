const sharp = require('sharp');

/**
 * Removes a plain studio backdrop (white or any uniform light/neutral colour) from a garment photo.
 *
 * It is a flood fill from the image border, so it needs no ML model and no native dependency
 * beyond `sharp`, which keeps the production image (node:alpine) unchanged.
 * It deliberately does nothing (returns null) when it is not confident, so a photo is never damaged:
 * busy or non-uniform backgrounds, images that are already transparent, and garments the same colour as the backdrop.
 */

const BORDE_UNIFORME_MIN = 0.9; // share of border pixels that must match the backdrop colour
const TOL_BORDE = 40; // colour distance for a border pixel to count as backdrop
const TOL_LEJOS = 36; // a pixel further than this from the backdrop is never backdrop
const SALTO_MAX = 10; // max colour jump between two neighbouring pixels while flooding
const ALFA_DESDE = 16; // soft edge: distance at which a boundary pixel starts to fade in
const ALFA_HASTA = 48; // ... and is fully opaque
const FONDO_MIN = 0.03; // removing less than this means there was nothing to remove
const FONDO_MAX = 0.9; // removing more than this means the garment was eaten
const IRREGULARIDAD_MAX = 14; // outline length / sqrt(garment area): clean cut-outs measure 7-13, a fill that leaked into the fabric 15+

function distancia2(r: number, g: number, b: number, ref: [number, number, number]): number {
  const dr = r - ref[0];
  const dg = g - ref[1];
  const db = b - ref[2];
  return dr * dr + dg * dg + db * db;
}

function tocaFondo(fondo: Uint8Array, p: number, w: number, h: number): boolean {
  const x = p % w;
  const y = (p - x) / w;
  return (x > 0 && fondo[p - 1] === 1) || (x < w - 1 && fondo[p + 1] === 1) || (y > 0 && fondo[p - w] === 1) || (y < h - 1 && fondo[p + w] === 1);
}

function mediana(valores: number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor(orden.length / 2)];
}

/** Returns a PNG with a transparent backdrop, or null when the image should be left as it is. */
export async function quitarFondoUniforme(entrada: Buffer): Promise<Buffer | null> {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w: number = info.width;
  const h: number = info.height;
  const total = w * h;
  if (w < 8 || h < 8) return null;

  // Already has real transparency: nothing to do.
  let translucidos = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) translucidos++;
  if (translucidos / total > 0.02) return null;

  // Backdrop colour = median of the border pixels.
  const borde: number[] = [];
  for (let x = 0; x < w; x++) { borde.push(x, (h - 1) * w + x); }
  for (let y = 1; y < h - 1; y++) { borde.push(y * w, y * w + w - 1); }
  const ref: [number, number, number] = [
    mediana(borde.map((p) => data[p * 4])),
    mediana(borde.map((p) => data[p * 4 + 1])),
    mediana(borde.map((p) => data[p * 4 + 2])),
  ];
  const tolBorde2 = TOL_BORDE * TOL_BORDE;
  const iguales = borde.filter((p) => distancia2(data[p * 4], data[p * 4 + 1], data[p * 4 + 2], ref) <= tolBorde2);
  if (iguales.length / borde.length < BORDE_UNIFORME_MIN) return null;

  // Flood fill from the border: a pixel joins the backdrop when it is close to the backdrop colour
  // and close to the neighbour it was reached from (so it stops at the garment edge).
  const fondo = new Uint8Array(total);
  const cola = new Int32Array(total);
  let ini = 0;
  let fin = 0;
  for (const p of iguales) {
    if (!fondo[p]) { fondo[p] = 1; cola[fin++] = p; }
  }
  const lejos2 = TOL_LEJOS * TOL_LEJOS;
  const salto2 = SALTO_MAX * SALTO_MAX;
  while (ini < fin) {
    const p = cola[ini++];
    const x = p % w;
    const y = (p - x) / w;
    const pr = data[p * 4];
    const pg = data[p * 4 + 1];
    const pb = data[p * 4 + 2];
    const vecinos = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of vecinos) {
      if (q < 0 || fondo[q]) continue;
      const r = data[q * 4];
      const g = data[q * 4 + 1];
      const b = data[q * 4 + 2];
      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      if (dr * dr + dg * dg + db * db > salto2) continue;
      if (distancia2(r, g, b, ref) > lejos2) continue;
      fondo[q] = 1;
      cola[fin++] = q;
    }
  }

  const proporcion = fin / total;
  if (proporcion < FONDO_MIN || proporcion > FONDO_MAX) return null;

  // A fill that leaked into light fabric leaves a ragged outline: leave the photo alone instead of damaging it.
  let perimetro = 0;
  for (let p = 0; p < total; p++) {
    if (fondo[p] || !tocaFondo(fondo, p, w, h)) continue;
    perimetro++;
  }
  if (perimetro / Math.sqrt(total - fin) > IRREGULARIDAD_MAX) return null;

  // Write alpha: backdrop is transparent; garment pixels touching the backdrop get a soft edge.
  const salida = Buffer.from(data);
  for (let p = 0; p < total; p++) {
    if (fondo[p]) { salida[p * 4 + 3] = 0; continue; }
    if (!tocaFondo(fondo, p, w, h)) continue;
    const d = Math.sqrt(distancia2(data[p * 4], data[p * 4 + 1], data[p * 4 + 2], ref));
    const a = Math.max(0, Math.min(1, (d - ALFA_DESDE) / (ALFA_HASTA - ALFA_DESDE)));
    salida[p * 4 + 3] = Math.round(255 * a);
  }

  return sharp(salida, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}
