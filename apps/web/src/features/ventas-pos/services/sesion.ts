import { SesionVendedor } from './sincronizador';

/** Store (`tid`) and user (`sub`) inside the access token, or null when the token is missing or unreadable. */
export function leerSesion(token: string | null | undefined): SesionVendedor | null {
  if (!token) return null;
  try {
    const cuerpo = token.split('.')[1];
    if (!cuerpo) return null;
    const base64 = cuerpo.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(cuerpo.length / 4) * 4, '=');
    const binario = atob(base64);
    const json = new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
    const payload = JSON.parse(json);
    return payload?.tid && payload?.sub ? { tenantId: payload.tid, usuarioId: payload.sub } : null;
  } catch {
    return null;
  }
}
