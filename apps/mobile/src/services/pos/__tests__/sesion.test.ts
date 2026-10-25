import { describe, expect, it } from 'vitest';
import { decodificarBase64Url, leerSesion } from '../sesion';

const token = (payload: object) => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
};

describe('decodificarBase64Url', () => {
  it('decodes unpadded base64url with the URL alphabet', () => {
    for (const texto of ['a', 'ab', 'abc', '?>>>???~~~', 'cañón ñandú €']) {
      expect(decodificarBase64Url(Buffer.from(texto).toString('base64url'))).toBe(texto);
    }
  });

  it('decodes four-byte characters', () => {
    expect(decodificarBase64Url(Buffer.from('tienda \u{1F6CD}').toString('base64url'))).toBe('tienda \u{1F6CD}');
  });

  it('throws on characters outside the alphabet', () => {
    expect(() => decodificarBase64Url('@@@')).toThrow();
  });
});

describe('leerSesion', () => {
  it('reads the store and user from the token', () => {
    expect(leerSesion(token({ tid: 'tienda-1', sub: 'user-9', rol: 'ADMIN' }))).toEqual({ tenantId: 'tienda-1', usuarioId: 'user-9' });
  });

  it('reads names with accents', () => {
    expect(leerSesion(token({ tid: 'tienda-ñ', sub: 'usuario-é' }))).toEqual({ tenantId: 'tienda-ñ', usuarioId: 'usuario-é' });
  });

  it('gives null for a missing, malformed or store-less token', () => {
    expect(leerSesion(null)).toBeNull();
    expect(leerSesion('abc')).toBeNull();
    expect(leerSesion('a.@@@.c')).toBeNull();
    expect(leerSesion(token({ sub: 'solo-usuario' }))).toBeNull();
  });
});
