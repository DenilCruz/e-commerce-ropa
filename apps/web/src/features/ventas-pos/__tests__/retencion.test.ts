import { beforeEach, describe, expect, it } from 'vitest';
import { cerrarDb } from '../services/posDb';
import { RETENCION_DIAS, catalogoVencido, diasDeAntiguedad, ventaAntigua } from '../services/retencion';
import { guardarCatalogo, leerActualizacionCatalogo } from '../services/ventasLocales';

const DIA = 24 * 3600 * 1000;
const ahora = new Date('2026-10-25T12:00:00Z').getTime();
const hace = (dias: number) => new Date(ahora - dias * DIA).toISOString();

beforeEach(async () => {
  await cerrarDb();
  await new Promise<void>((resolve) => {
    const r = indexedDB.deleteDatabase('aura-pos');
    r.onsuccess = () => resolve();
  });
});

describe('retention window', () => {
  it('keeps local data for seven days unless configured otherwise', () => {
    expect(RETENCION_DIAS).toBe(7);
  });

  it('expires a catalog snapshot older than the limit and keeps a recent one', () => {
    expect(catalogoVencido(hace(6.9), ahora)).toBe(false);
    expect(catalogoVencido(hace(7.1), ahora)).toBe(true);
  });

  it('honors another limit (hours or days, as the business decides)', () => {
    expect(catalogoVencido(hace(1.5), ahora, 1)).toBe(true);
    expect(catalogoVencido(hace(0.4), ahora, 0.5)).toBe(false);
  });

  it('treats a missing snapshot as expired so nothing is sold from data that was never downloaded', () => {
    expect(catalogoVencido(null, ahora)).toBe(true);
  });

  it('flags a queued sale older than the limit, but never one already synced', () => {
    const base = { creadoEn: hace(8), estado: 'PENDIENTE' as const };
    expect(ventaAntigua(base, ahora)).toBe(true);
    expect(ventaAntigua({ ...base, creadoEn: hace(2) }, ahora)).toBe(false);
    expect(ventaAntigua({ ...base, estado: 'SINCRONIZADA' }, ahora)).toBe(false);
  });

  it('counts the whole days a sale has waited', () => {
    expect(diasDeAntiguedad(hace(8.6), ahora)).toBe(8);
    expect(diasDeAntiguedad(hace(0.2), ahora)).toBe(0);
  });
});

describe('snapshot date', () => {
  it('is stored with the snapshot, per store, in the local database', async () => {
    expect(await leerActualizacionCatalogo('tenant-a')).toBeNull();

    const antes = Date.now();
    await guardarCatalogo('tenant-a', []);

    const fecha = await leerActualizacionCatalogo('tenant-a');
    expect(new Date(fecha!).getTime()).toBeGreaterThanOrEqual(antes);
    expect(await leerActualizacionCatalogo('tenant-b')).toBeNull();
  });
});
