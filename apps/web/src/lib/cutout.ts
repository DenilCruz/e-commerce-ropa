/**
 * Garments uploaded as transparent cut-outs are stored as /uploads/<category>/<file>.webp,
 * while full photographs sit directly in /uploads. Views that show a garment on its own use this to tell them apart.
 */
export const isCutoutUrl = (url?: string | null): boolean =>
  !!url && /^\/?uploads\/[^/]+\/[^/]+\.webp$/.test(url.replace(/^https?:\/\/[^/]+/, ''));
