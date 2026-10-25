import { describe, expect, it } from 'vitest';
import { ajustarAlDisponible } from '../conflictos';

const item = (varianteId: string, cantidad: number) => ({ varianteId, nombre: varianteId, talla: 'M', color: 'Rojo', cantidad, precio: 10 });

describe('ajustarAlDisponible', () => {
  it('cuts the short items to what is left and drops the ones with nothing left', () => {
    const lineas = ajustarAlDisponible({
      items: [item('a', 3), item('b', 2), item('c', 1)],
      conflicto: [
        { varianteId: 'a', nombre: 'a', solicitado: 3, disponible: 1 },
        { varianteId: 'b', nombre: 'b', solicitado: 2, disponible: 0 },
      ],
    });

    expect(lineas).toEqual([{ varianteId: 'a', cantidad: 1 }, { varianteId: 'c', cantidad: 1 }]);
  });

  it('never raises a quantity above what was asked', () => {
    const lineas = ajustarAlDisponible({
      items: [item('a', 2)],
      conflicto: [{ varianteId: 'a', nombre: 'a', solicitado: 2, disponible: 9 }],
    });

    expect(lineas).toEqual([{ varianteId: 'a', cantidad: 2 }]);
  });
});
