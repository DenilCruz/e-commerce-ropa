import { beforeEach, describe, expect, it, vi } from 'vitest';

const crearAltaTienda = vi.fn();
const crear = vi.fn();
vi.mock('../planes.api', () => ({ planesApi: { crearAltaTienda: (...a: unknown[]) => crearAltaTienda(...a) } }));
vi.mock('../tiendas.api', () => ({ tiendasApi: { crear: (...a: unknown[]) => crear(...a) } }));

import { iniciarAltaDeTienda } from '../alta-tienda';

describe('iniciarAltaDeTienda', () => {
  beforeEach(() => {
    crearAltaTienda.mockReset();
    crear.mockReset();
  });

  it('un plan de pago abre la pasarela y no crea la tienda todavía', async () => {
    crearAltaTienda.mockResolvedValue({ url: '/planes/pago-simulado?session_id=sim_cs_1' });

    const r = await iniciarAltaDeTienda({ nombre: 'Moda Luna', plan: 'ESTANDAR', periodo: 'ANUAL' });

    expect(r).toEqual({ destino: 'PASARELA', url: '/planes/pago-simulado?session_id=sim_cs_1' });
    expect(crearAltaTienda).toHaveBeenCalledWith('Moda Luna', 'ESTANDAR', 'ANUAL');
    expect(crear).not.toHaveBeenCalled();
  });

  it('el plan gratis crea la tienda al instante y no pasa por la pasarela', async () => {
    const sesion = { tienda: { slug: 'sol-andino' } };
    crear.mockResolvedValue(sesion);

    const r = await iniciarAltaDeTienda({ nombre: 'Sol Andino', plan: 'FREE_TRIAL', periodo: 'MENSUAL' });

    expect(r).toEqual({ destino: 'TIENDA', sesion });
    expect(crear).toHaveBeenCalledWith({ nombre: 'Sol Andino', plan: 'FREE_TRIAL' });
    expect(crearAltaTienda).not.toHaveBeenCalled();
  });

  it('si la pasarela no se puede abrir el error sube y no se crea nada', async () => {
    crearAltaTienda.mockRejectedValue(new Error('403'));

    await expect(iniciarAltaDeTienda({ nombre: 'Moda Luna', plan: 'CORPORATIVO', periodo: 'MENSUAL' })).rejects.toThrow('403');
    expect(crear).not.toHaveBeenCalled();
  });
});
