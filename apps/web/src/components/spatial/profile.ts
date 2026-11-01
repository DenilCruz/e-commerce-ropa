import { MathUtils, SplineCurve, Vector2 } from 'three';

/** Smooth radius lookup from knots of [v, radius], with v running from 0 (hem) to 1 (neckline). */
export function makeProfile(knots: [number, number][]) {
  const lut = new Float32Array(257);
  const pts = new SplineCurve(knots.map(([v, r]) => new Vector2(v, r))).getPoints(512);
  for (let k = 0; k <= 256; k++) {
    const v = k / 256;
    let best = pts[0];
    for (const p of pts) if (Math.abs(p.x - v) < Math.abs(best.x - v)) best = p;
    lut[k] = best.y;
  }
  return (v: number) => {
    const f = MathUtils.clamp(v, 0, 1) * 256;
    const i = Math.floor(f);
    return MathUtils.lerp(lut[i], lut[Math.min(256, i + 1)], f - i);
  };
}
