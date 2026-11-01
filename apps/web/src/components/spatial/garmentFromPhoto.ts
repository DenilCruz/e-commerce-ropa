import { BufferAttribute, BufferGeometry, CanvasTexture, MathUtils, SRGBColorSpace } from 'three';

export type PhotoGarmentModel = {
  geometry: BufferGeometry;
  /** Front colour: the photo, with the garment's colour extended past its silhouette so no background bleeds in. */
  map: CanvasTexture;
  /** Back colour: a smooth per-row average of the fabric. */
  backMap: CanvasTexture;
  alphaMap: CanvasTexture;
  /** Per-vertex weight (0 at the bodice, 1 at the hem) used to sway the fabric. */
  sway: Float32Array;
};

const ROWS = 150;
const COLS = 72;

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = url;
});

/**
 * Turns a product photo (a single garment on a plain background) into a volumetric mesh.
 * The silhouette is cut out by flood-filling the background, each row becomes an elliptical
 * cross-section so the garment has real depth, the photo is projected on the front, and the
 * back is a mirrored, slightly darker copy (the photo has no view of the back).
 * Returns null when the photo can't be read or doesn't isolate a garment.
 */
export async function buildGarmentFromPhoto(url: string, height = 3): Promise<PhotoGarmentModel | null> {
  const img = await loadImage(url);
  const k = Math.min(1, 320 / Math.max(img.width, img.height));
  const W = Math.round(img.width * k), H = Math.round(img.height * k);
  const small = document.createElement('canvas');
  small.width = W; small.height = H;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  if (!sctx) return null;
  sctx.drawImage(img, 0, 0, W, H);
  let data: Uint8ClampedArray;
  try { data = sctx.getImageData(0, 0, W, H).data; } catch { return null; }

  const dist = (a: number, b: number) => Math.abs(data[a * 4] - data[b * 4]) + Math.abs(data[a * 4 + 1] - data[b * 4 + 1]) + Math.abs(data[a * 4 + 2] - data[b * 4 + 2]);
  // Background colour = mean of the outer ring.
  let r = 0, g = 0, b = 0, n = 0;
  const ring = (x: number, y: number) => { const i = (y * W + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; };
  for (let x = 0; x < W; x++) { ring(x, 0); ring(x, H - 1); }
  for (let y = 0; y < H; y++) { ring(0, y); ring(W - 1, y); }
  r /= n; g /= n; b /= n;
  const toBg = (i: number) => Math.abs(data[i * 4] - r) + Math.abs(data[i * 4 + 1] - g) + Math.abs(data[i * 4 + 2] - b);

  // Flood fill the background from the border, tolerant to soft gradients.
  const bg = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0, tail = 0;
  const seed = (i: number) => { if (!bg[i] && toBg(i) < 130) { bg[i] = 1; queue[tail++] = i; } };
  for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
  while (head < tail) {
    const p = queue[head++];
    const px = p % W, py = (p / W) | 0;
    const nbs = [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, py > 0 ? p - W : -1, py < H - 1 ? p + W : -1];
    for (const q of nbs) if (q >= 0 && !bg[q] && dist(p, q) < 26 && toBg(q) < 160) { bg[q] = 1; queue[tail++] = q; }
  }

  // Keep the largest foreground component, then erode one pixel to drop the background fringe.
  const label = new Int32Array(W * H);
  let best = 0, bestId = 0, id = 0;
  for (let s = 0; s < W * H; s++) {
    if (bg[s] || label[s]) continue;
    id++; let size = 0; head = 0; tail = 0; queue[tail++] = s; label[s] = id;
    while (head < tail) {
      const p = queue[head++]; size++;
      const px = p % W, py = (p / W) | 0;
      for (const q of [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, py > 0 ? p - W : -1, py < H - 1 ? p + W : -1]) {
        if (q >= 0 && !bg[q] && !label[q]) { label[q] = id; queue[tail++] = q; }
      }
    }
    if (size > best) { best = size; bestId = id; }
  }
  if (best < W * H * 0.05 || best > W * H * 0.75) return null; // no clear garment in this photo
  const fg = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    fg[p] = label[p] === bestId && label[p - 1] === bestId && label[p + 1] === bestId && label[p - W] === bestId && label[p + W] === bestId ? 1 : 0;
  }

  // Row spans.
  let r0 = -1, r1 = -1;
  const lo = new Float32Array(H).fill(-1), hi = new Float32Array(H).fill(-1);
  for (let y = 0; y < H; y++) {
    let a = -1, z = -1;
    for (let x = 0; x < W; x++) if (fg[y * W + x]) { if (a < 0) a = x; z = x; }
    if (a >= 0) { lo[y] = a; hi[y] = z; if (r0 < 0) r0 = y; r1 = y; }
  }
  if (r0 < 0 || r1 - r0 < 40) return null;

  const x0 = new Float32Array(ROWS), x1 = new Float32Array(ROWS), ys = new Float32Array(ROWS), yf = new Float32Array(ROWS);
  for (let i = 0; i < ROWS; i++) {
    let y = Math.round(r0 + (i / (ROWS - 1)) * (r1 - r0));
    while (lo[y] < 0 && y < r1) y++;
    yf[i] = r0 + (i / (ROWS - 1)) * (r1 - r0); // continuous height: integer rows would jitter the normals
    ys[i] = y; x0[i] = lo[y] < 0 ? W / 2 : lo[y]; x1[i] = hi[y] < 0 ? W / 2 : hi[y];
  }
  // Smooth the silhouette so row-to-row pixel jitter doesn't become normal noise or texture banding.
  // The mesh follows this smoothed outline, so front and back shells meet exactly at its edge.
  const t0 = new Float32Array(ROWS), t1 = new Float32Array(ROWS);
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < ROWS; i++) {
      let sa = 0, sz = 0, c = 0;
      for (let d = -3; d <= 3; d++) { const j = Math.min(ROWS - 1, Math.max(0, i + d)); sa += x0[j]; sz += x1[j]; c++; }
      t0[i] = sa / c; t1[i] = sz / c;
    }
    x0.set(t0); x1.set(t1);
  }
  for (let i = 0; i < ROWS; i++) { x0[i] -= 1.5; x1[i] += 1.5; }
  let cxG = 0;
  for (let i = 0; i < ROWS; i++) cxG += (x0[i] + x1[i]) / 2;
  cxG /= ROWS;

  const s = height / (r1 - r0);
  const count = ROWS * COLS * 2;
  const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2), uv1 = new Float32Array(count * 2), col = new Float32Array(count * 3), sway = new Float32Array(count);
  for (let i = 0; i < ROWS; i++) {
    const cx = (x0[i] + x1[i]) / 2, half = Math.max(1, (x1[i] - x0[i]) / 2);
    const rowFrac = i / (ROWS - 1);
    const ratio = MathUtils.lerp(0.5, 0.92, MathUtils.smoothstep(rowFrac, 0.22, 0.92));
    const hem = Math.pow(MathUtils.smoothstep(rowFrac, 0.4, 1), 1.4);
    for (let j = 0; j < COLS; j++) {
      const t = (j / (COLS - 1)) * 2 - 1;
      const px = cx + t * half;
      const depth = half * s * ratio * Math.pow(Math.max(0, 1 - t * t), 0.55);
      const X = (px - cxG) * s, Y = (r1 - yf[i]) * s - height / 2;
      const f = (i * COLS + j), bk = count / 2 + f;
      const tc = t; // stop the photo stretching at the sides
      pos.set([X, Y, depth], f * 3); pos.set([X, Y, -depth], bk * 3);
      // Colour: the photo on the front; on the back the row's centre colour (a plain satin back, since the photo has no rear view).
      uv.set([(cx + tc * half) / W, 1 - yf[i] / H], f * 2); uv.set([0.5, 1 - yf[i] / H], bk * 2);
      // Cut-out: the true silhouette on both sides.
      uv1.set([px / W, 1 - yf[i] / H], f * 2); uv1.set([px / W, 1 - yf[i] / H], bk * 2);
      col.set([1, 1, 1], f * 3); col.set([0.92, 0.9, 0.9], bk * 3);
      sway[f] = hem; sway[bk] = hem;
    }
  }
  const front: number[] = [], back: number[] = [];
  const off = count / 2;
  for (let i = 0; i < ROWS - 1; i++) for (let j = 0; j < COLS - 1; j++) {
    const a = i * COLS + j, bq = a + 1, c = a + COLS, d = c + 1;
    front.push(a, c, bq, bq, c, d);
    back.push(off + a, off + bq, off + c, off + bq, off + d, off + c);
  }
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(pos, 3);
  geometry.setAttribute('position', position);
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('uv1', new BufferAttribute(uv1, 2));
  geometry.setAttribute('color', new BufferAttribute(col, 3));
  geometry.setIndex([...front, ...back]);
  geometry.addGroup(0, front.length, 0);
  geometry.addGroup(front.length, back.length, 1);
  geometry.computeVertexNormals();

  // Colour map at a higher resolution, with background pixels replaced by the nearest garment colour.
  const km = Math.min(1, 640 / Math.max(img.width, img.height));
  const WB = Math.round(img.width * km), HB = Math.round(img.height * km);
  const big = document.createElement('canvas');
  big.width = WB; big.height = HB;
  const bctx = big.getContext('2d', { willReadFrequently: true });
  if (!bctx) return null;
  bctx.drawImage(img, 0, 0, WB, HB);
  const bimg = bctx.getImageData(0, 0, WB, HB);
  const bd = bimg.data;
  const own = new Int32Array(WB * HB).fill(-1);
  const bq2 = new Int32Array(WB * HB);
  let bh = 0, bt = 0;
  for (let y = 0; y < HB; y++) for (let x = 0; x < WB; x++) {
    const sx = Math.min(W - 1, (x * W / WB) | 0), sy = Math.min(H - 1, (y * H / HB) | 0);
    if (fg[sy * W + sx]) { const p = y * WB + x; own[p] = p; bq2[bt++] = p; }
  }
  while (bh < bt) {
    const p = bq2[bh++];
    const px = p % WB, py = (p / WB) | 0;
    for (const q of [px > 0 ? p - 1 : -1, px < WB - 1 ? p + 1 : -1, py > 0 ? p - WB : -1, py < HB - 1 ? p + WB : -1]) {
      if (q >= 0 && own[q] < 0) { own[q] = own[p]; bq2[bt++] = q; }
    }
  }
  const rowSum = new Float32Array(HB * 3), rowCnt = new Float32Array(HB);
  for (let p = 0; p < WB * HB; p++) {
    const src = own[p];
    if (src < 0) continue;
    const y = (p / WB) | 0;
    if (src === p) { rowSum[y * 3] += bd[p * 4]; rowSum[y * 3 + 1] += bd[p * 4 + 1]; rowSum[y * 3 + 2] += bd[p * 4 + 2]; rowCnt[y]++; }
    else { bd[p * 4] = bd[src * 4]; bd[p * 4 + 1] = bd[src * 4 + 1]; bd[p * 4 + 2] = bd[src * 4 + 2]; }
  }
  bctx.putImageData(bimg, 0, 0);

  // Back colour: per-row mean of the fabric, smoothed vertically.
  const avg = new Float32Array(HB * 3);
  let last = [128, 128, 128];
  for (let y = 0; y < HB; y++) {
    if (rowCnt[y] > 0) last = [rowSum[y * 3] / rowCnt[y], rowSum[y * 3 + 1] / rowCnt[y], rowSum[y * 3 + 2] / rowCnt[y]];
    avg[y * 3] = last[0]; avg[y * 3 + 1] = last[1]; avg[y * 3 + 2] = last[2];
  }
  const backCanvas = document.createElement('canvas');
  backCanvas.width = 2; backCanvas.height = HB;
  const backCtx = backCanvas.getContext('2d');
  if (!backCtx) return null;
  const backImg = backCtx.createImageData(2, HB);
  for (let y = 0; y < HB; y++) {
    let sr = 0, sg = 0, sb = 0, c = 0;
    for (let d = -10; d <= 10; d++) { const yy = Math.min(HB - 1, Math.max(0, y + d)); sr += avg[yy * 3]; sg += avg[yy * 3 + 1]; sb += avg[yy * 3 + 2]; c++; }
    for (let x = 0; x < 2; x++) { const o = (y * 2 + x) * 4; backImg.data[o] = sr / c; backImg.data[o + 1] = sg / c; backImg.data[o + 2] = sb / c; backImg.data[o + 3] = 255; }
  }
  backCtx.putImageData(backImg, 0, 0);

  const mask = document.createElement('canvas');
  mask.width = W; mask.height = H;
  const mctx = mask.getContext('2d');
  if (!mctx) return null;
  const mimg = mctx.createImageData(W, H);
  // Dilate the cut-out by two pixels so the seam where front and back meet is never clipped.
  let grown: Uint8Array = fg;
  for (let it = 0; it < 2; it++) {
    const next = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      next[p] = grown[p] || grown[p - 1] || grown[p + 1] || grown[p - W] || grown[p + W] ? 1 : 0;
    }
    grown = next;
  }
  for (let p = 0; p < W * H; p++) { const v = grown[p] ? 255 : 0; mimg.data[p * 4] = v; mimg.data[p * 4 + 1] = v; mimg.data[p * 4 + 2] = v; mimg.data[p * 4 + 3] = 255; }
  mctx.putImageData(mimg, 0, 0);
  const map = new CanvasTexture(big); map.colorSpace = SRGBColorSpace; map.anisotropy = 8;
  const backMap = new CanvasTexture(backCanvas); backMap.colorSpace = SRGBColorSpace;
  const alphaMap = new CanvasTexture(mask);
  alphaMap.channel = 1;
  return { geometry, map, backMap, alphaMap, sway };
}
