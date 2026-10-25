import { describe, expect, it } from 'vitest';
import { claveVapidABytes, estadoNotificaciones } from '../services/notificaciones';

describe('claveVapidABytes', () => {
  it('turns the URL-safe base64 public key into the bytes the browser asks for', () => {
    // 65-byte uncompressed P-256 point, as web-push generates
    const bytes = Uint8Array.from({ length: 65 }, (_, i) => (i * 7 + 4) % 256);
    const base64url = Buffer.from(bytes).toString('base64url');

    expect([...claveVapidABytes(base64url)]).toEqual([...bytes]);
  });
});

describe('estadoNotificaciones', () => {
  const todo = { soportado: true, habilitadoEnServidor: true, permiso: 'default' as const, suscrito: false };

  it('says push is unsupported when the browser lacks it', () => {
    expect(estadoNotificaciones({ ...todo, soportado: false })).toBe('NO_SOPORTADO');
  });

  it('says it is not configured when the server has no VAPID keys', () => {
    expect(estadoNotificaciones({ ...todo, habilitadoEnServidor: false })).toBe('SIN_CONFIGURAR');
  });

  it('says it was blocked when the user denied the permission', () => {
    expect(estadoNotificaciones({ ...todo, permiso: 'denied' })).toBe('BLOQUEADO');
  });

  it('offers to activate until the browser is subscribed', () => {
    expect(estadoNotificaciones(todo)).toBe('DISPONIBLE');
    expect(estadoNotificaciones({ ...todo, permiso: 'granted' })).toBe('DISPONIBLE');
    expect(estadoNotificaciones({ ...todo, permiso: 'granted', suscrito: true })).toBe('ACTIVAS');
  });
});
