const sharp = require('sharp');
import { quitarFondoUniforme } from '../../src/modules/uploads/quitar-fondo';

type Rgb = [number, number, number];

/** Builds a W x H photo: `fondo` everywhere, `prenda` rectangle in the centre. */
async function foto(
  w: number,
  h: number,
  fondo: Rgb,
  prenda: Rgb,
  opts: { ruido?: boolean; sombra?: boolean } = {},
): Promise<Buffer> {
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const dentro = x >= w * 0.3 && x < w * 0.7 && y >= h * 0.2 && y < h * 0.8;
      let c: Rgb = dentro ? prenda : fondo;
      if (!dentro && opts.sombra && y >= h * 0.8 && y < h * 0.88 && x >= w * 0.25 && x < w * 0.75) {
        const oscuro = 2 * (y - Math.floor(h * 0.8) + 1); // soft shadow: darkens 2 levels per row
        c = [fondo[0] - oscuro, fondo[1] - oscuro, fondo[2] - oscuro];
      }
      if (opts.ruido && !dentro && (x * 7 + y * 13) % 5 === 0) c = [20, 90, 40];
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

async function alphaEn(buf: Buffer, x: number, y: number): Promise<number> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * 4 + 3];
}

describe('quitarFondoUniforme', () => {
  it('hace transparente el fondo blanco y conserva la prenda opaca', async () => {
    const resultado = await quitarFondoUniforme(await foto(200, 200, [255, 255, 255], [120, 20, 30]));
    expect(resultado).not.toBeNull();
    expect(await alphaEn(resultado!, 3, 3)).toBe(0);
    expect(await alphaEn(resultado!, 196, 196)).toBe(0);
    expect(await alphaEn(resultado!, 100, 100)).toBe(255);
  });

  it('también quita fondos claros no blancos y la sombra suave del suelo', async () => {
    const resultado = await quitarFondoUniforme(
      await foto(200, 200, [236, 234, 230], [30, 30, 40], { sombra: true }),
    );
    expect(resultado).not.toBeNull();
    expect(await alphaEn(resultado!, 100, 168)).toBe(0); // sombra bajo la prenda
    expect(await alphaEn(resultado!, 100, 100)).toBe(255);
  });

  it('no toca una imagen que ya es transparente', async () => {
    const ya = await sharp({ create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .png()
      .toBuffer();
    expect(await quitarFondoUniforme(ya)).toBeNull();
  });

  it('no toca fotos cuyo fondo no es uniforme (escenario, calle, textura)', async () => {
    expect(await quitarFondoUniforme(await foto(200, 200, [255, 255, 255], [120, 20, 30], { ruido: true }))).toBeNull();
  });

  it('no borra una prenda del mismo color que el fondo', async () => {
    expect(await quitarFondoUniforme(await foto(200, 200, [255, 255, 255], [252, 252, 252]))).toBeNull();
  });

  it('no recorta cuando el relleno se cuela en una tela clara y deja un contorno roto', async () => {
    // Light garment fading into the backdrop on its left half, speckled with darker dots every 2 px.
    const w = 240; const h = 240;
    const data = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dentro = x >= 60 && x < 180 && y >= 40 && y < 200;
        let v = 240;
        if (dentro) {
          v = Math.round(238 - (x - 60) * 0.35);
          if (x < 120 && x % 2 === 0 && y % 2 === 0) v -= 40; // isolated dark dots: the fill seeps around them
        }
        const i = (y * w + x) * 3;
        data[i] = v; data[i + 1] = v; data[i + 2] = v;
      }
    }
    const img = await sharp(data, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
    expect(await quitarFondoUniforme(img)).toBeNull();
  });
});
