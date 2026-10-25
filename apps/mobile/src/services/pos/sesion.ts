import { SesionVendedor } from './types';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodes unpadded base64url into a UTF-8 string without relying on atob or TextDecoder. Throws on bad input. */
export function decodificarBase64Url(texto: string): string {
  const limpio = texto.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (limpio.length % 4 === 1) throw new Error('Base64 inválido');
  const bytes: number[] = [];
  let acumulado = 0;
  let bits = 0;
  for (const ch of limpio) {
    const valor = ALFABETO.indexOf(ch);
    if (valor < 0) throw new Error('Base64 inválido');
    acumulado = (acumulado << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulado >> bits) & 0xff);
      acumulado &= (1 << bits) - 1;
    }
  }
  return utf8ATexto(bytes);
}

function utf8ATexto(bytes: number[]): string {
  let salida = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let punto: number;
    let extra: number;
    if (b < 0x80) { punto = b; extra = 0; }
    else if (b >= 0xc0 && b < 0xe0) { punto = b & 0x1f; extra = 1; }
    else if (b >= 0xe0 && b < 0xf0) { punto = b & 0x0f; extra = 2; }
    else if (b >= 0xf0 && b < 0xf8) { punto = b & 0x07; extra = 3; }
    else throw new Error('UTF-8 inválido');
    for (let k = 0; k < extra; k++) {
      const c = bytes[i++];
      if (c === undefined || (c & 0xc0) !== 0x80) throw new Error('UTF-8 inválido');
      punto = (punto << 6) | (c & 0x3f);
    }
    salida += String.fromCodePoint(punto);
  }
  return salida;
}

/** Store (`tid`) and user (`sub`) inside the access token, or null when the token is missing or unreadable. */
export function leerSesion(token: string | null | undefined): SesionVendedor | null {
  if (!token) return null;
  try {
    const cuerpo = token.split('.')[1];
    if (!cuerpo) return null;
    const payload = JSON.parse(decodificarBase64Url(cuerpo));
    return payload?.tid && payload?.sub ? { tenantId: payload.tid, usuarioId: payload.sub } : null;
  } catch {
    return null;
  }
}
