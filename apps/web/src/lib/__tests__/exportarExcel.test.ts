import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { construirLibro, inferirCelda, obtenerTodasLasPaginas, tituloDeColumna } from '../exportarExcel';

async function releer(libro: Awaited<ReturnType<typeof construirLibro>>) {
  const buffer = await libro.xlsx.writeBuffer();
  const leido = new ExcelJS.Workbook();
  await leido.xlsx.load(buffer as ArrayBuffer);
  return leido.worksheets[0];
}

describe('inferirCelda', () => {
  it('convierte los numéricos que PostgreSQL envía como texto en números reales', () => {
    expect(inferirCelda('unidades_vendidas', '24').valor).toBe(24);
    expect(inferirCelda('ingresos_totales', '7680.00')).toEqual({ valor: 7680, formato: '#,##0.00' });
  });

  it('no toca identificadores que parecen números', () => {
    expect(inferirCelda('sku', '00123').valor).toBe('00123');
    expect(inferirCelda('codigo_pedido', '2026001').valor).toBe('2026001');
    expect(inferirCelda('producto', '0042').valor).toBe('0042');
  });

  it('convierte fechas ISO en fechas de Excel con formato', () => {
    const solo = inferirCelda('periodo', '2026-09-30T00:00:00.000');
    const conHora = inferirCelda('fecha', '2026-10-29T18:33:56.800');

    expect(solo.valor).toBeInstanceOf(Date);
    expect(solo.formato).toBe('dd/mm/yyyy');
    expect(conHora.formato).toBe('dd/mm/yyyy hh:mm');
  });

  it('deja el texto, los nulos y los booleanos como corresponde', () => {
    expect(inferirCelda('cliente', 'Diego Astete').valor).toBe('Diego Astete');
    expect(inferirCelda('cliente', null).valor).toBeNull();
    expect(inferirCelda('activo', true).valor).toBe('SÍ');
  });
});

describe('tituloDeColumna', () => {
  it('quita guiones bajos y pone la primera letra en mayúscula', () => {
    expect(tituloDeColumna('unidades_vendidas')).toBe('Unidades vendidas');
  });
});

describe('construirLibro', () => {
  const filas = [
    { producto: 'Vestido de Gala', unidades: '24', ingresos: '7680.00' },
    { producto: 'Shorts', unidades: '14', ingresos: '1260.00' },
  ];
  const columnas = ['producto', 'unidades', 'ingresos'].map((clave) => ({
    titulo: tituloDeColumna(clave),
    valor: (f: Record<string, string>) => inferirCelda(clave, f[clave]).valor,
    formato: inferirCelda(clave, filas[0][clave as keyof (typeof filas)[0]]).formato,
  }));

  it('escribe encabezado y filas con números reales que Excel puede sumar', async () => {
    const hoja = await releer(await construirLibro({ nombreArchivo: 'x', hoja: 'Reporte', columnas, filas }));

    expect(hoja.getRow(1).values).toEqual([undefined, 'Producto', 'Unidades', 'Ingresos']);
    expect(hoja.getCell('A2').value).toBe('Vestido de Gala');
    expect(hoja.getCell('B2').value).toBe(24);
    expect(hoja.getCell('C3').value).toBe(1260);
    expect(hoja.getCell('C2').numFmt).toBe('#,##0.00');
    expect(hoja.rowCount).toBe(3);
  });

  it('congela el encabezado, activa el filtro y limpia el nombre de la hoja', async () => {
    const hoja = await releer(
      await construirLibro({ nombreArchivo: 'x', hoja: 'Ventas: 2026/10 [top] con un nombre demasiado largo', columnas, filas }),
    );

    expect(hoja.name).not.toMatch(/[:\\/?*[\]]/);
    expect(hoja.name.length).toBeLessThanOrEqual(31);
    expect(hoja.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(hoja.autoFilter).toBeTruthy();
  });

  it('genera solo el encabezado cuando no hay filas', async () => {
    const hoja = await releer(await construirLibro({ nombreArchivo: 'x', hoja: 'Reporte', columnas, filas: [] }));

    expect(hoja.rowCount).toBe(1);
  });
});

describe('obtenerTodasLasPaginas', () => {
  const paginas = [[1, 2], [3, 4], [5]];
  const pedir = (pagina: number) => Promise.resolve({ items: paginas[pagina - 1], totalPaginas: 3 });

  it('junta los elementos de todas las páginas en orden', async () => {
    expect(await obtenerTodasLasPaginas(pedir)).toEqual([1, 2, 3, 4, 5]);
  });

  it('con una sola página hace una sola petición', async () => {
    const llamadas: number[] = [];
    const resultado = await obtenerTodasLasPaginas((p) => {
      llamadas.push(p);
      return Promise.resolve({ items: ['a'], totalPaginas: 1 });
    });

    expect(resultado).toEqual(['a']);
    expect(llamadas).toEqual([1]);
  });

  it('se detiene en el máximo de páginas aunque el servidor diga que hay más', async () => {
    const llamadas: number[] = [];
    await obtenerTodasLasPaginas((p) => {
      llamadas.push(p);
      return Promise.resolve({ items: [p], totalPaginas: 1000 });
    }, 4);

    expect(llamadas).toEqual([1, 2, 3, 4]);
  });
});
