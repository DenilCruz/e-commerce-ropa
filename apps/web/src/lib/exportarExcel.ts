import type { Workbook } from 'exceljs';

export type ValorCelda = string | number | boolean | Date | null | undefined;

export interface ColumnaExcel<T> {
  titulo: string;
  valor: (fila: T) => ValorCelda;
  /** Excel number format, e.g. '#,##0.00' or 'dd/mm/yyyy' */
  formato?: string;
}

export interface OpcionesExcel<T> {
  nombreArchivo: string;
  hoja: string;
  columnas: ColumnaExcel<T>[];
  filas: T[];
}

export const FORMATO_MONEDA = '#,##0.00';
const FORMATO_FECHA = 'dd/mm/yyyy';
const FORMATO_FECHA_HORA = 'dd/mm/yyyy hh:mm';

const COLUMNAS_MONEDA = ['precio', 'total', 'subtotal', 'descuento', 'ingreso', 'monto', 'gastado', 'costo'];
// Identifiers that look like numbers but must keep their leading zeros and exact digits
const COLUMNAS_TEXTO = ['sku', 'codigo', 'nro', 'telefono', 'celular', 'ci', 'nit', 'cuenta'];

const NUMERICO = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** "unidades_vendidas" -> "Unidades vendidas" */
export function tituloDeColumna(clave: string): string {
  const texto = clave.replace(/_/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Turns a value of a dynamic report row into what the Excel cell should hold: PostgreSQL sends NUMERIC and
 * COUNT as strings and dates as ISO text, so they are converted to real numbers and dates for Excel to sort and sum.
 */
export function inferirCelda(columna: string, valor: unknown): { valor: ValorCelda; formato?: string } {
  if (valor === null || valor === undefined) return { valor: null };
  if (typeof valor === 'boolean') return { valor: valor ? 'SÍ' : 'NO' };

  const nombre = columna.toLowerCase();
  const esMoneda = COLUMNAS_MONEDA.some((p) => nombre.includes(p));
  const esTexto = COLUMNAS_TEXTO.some((p) => nombre === p || nombre.startsWith(`${p}_`) || nombre.endsWith(`_${p}`));

  if (typeof valor === 'number') return { valor, formato: esMoneda ? FORMATO_MONEDA : undefined };

  const texto = String(valor);
  if (!esTexto && NUMERICO.test(texto) && texto.replace(/[-.]/g, '').length <= 15) {
    return { valor: Number(texto), formato: esMoneda ? FORMATO_MONEDA : undefined };
  }

  if (FECHA_ISO.test(texto) && texto.length >= 10) {
    const fecha = new Date(texto);
    if (!isNaN(fecha.getTime())) {
      // Excel stores no time zone: shift so the cell shows the same wall-clock time the table shows
      const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
      const sinHora = local.getUTCHours() === 0 && local.getUTCMinutes() === 0 && local.getUTCSeconds() === 0;
      return { valor: local, formato: sinHora ? FORMATO_FECHA : FORMATO_FECHA_HORA };
    }
  }

  return { valor: texto };
}

function nombreDeHoja(nombre: string): string {
  // Excel rejects : \ / ? * [ ] and anything over 31 characters
  return nombre.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Reporte';
}

/** Builds the workbook; kept apart from the download so it can be tested without a browser. */
export async function construirLibro<T>(opciones: OpcionesExcel<T>): Promise<Workbook> {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'AURA';
  libro.created = new Date();

  const hoja = libro.addWorksheet(nombreDeHoja(opciones.hoja));
  const encabezado = hoja.addRow(opciones.columnas.map((c) => c.titulo));
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  encabezado.alignment = { vertical: 'middle' };
  encabezado.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B7B54' } };
  });

  const anchos = opciones.columnas.map((c) => c.titulo.length);
  for (const fila of opciones.filas) {
    const celdas = opciones.columnas.map((c) => c.valor(fila));
    const nueva = hoja.addRow(celdas);
    opciones.columnas.forEach((c, i) => {
      if (c.formato) nueva.getCell(i + 1).numFmt = c.formato;
      const v = celdas[i];
      const largo = v instanceof Date ? 16 : String(v ?? '').length;
      anchos[i] = Math.max(anchos[i], largo);
    });
  }

  hoja.columns.forEach((col, i) => {
    col.width = Math.min(Math.max(anchos[i] + 2, 10), 50);
  });
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  if (opciones.columnas.length > 0) {
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: opciones.columnas.length } };
  }
  return libro;
}

export async function exportarExcel<T>(opciones: OpcionesExcel<T>): Promise<void> {
  const libro = await construirLibro(opciones);
  const datos = await libro.xlsx.writeBuffer();
  const blob = new Blob([datos], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = opciones.nombreArchivo.endsWith('.xlsx') ? opciones.nombreArchivo : `${opciones.nombreArchivo}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/** Walks every page of a paginated endpoint (bounded, so a huge report cannot loop forever). */
export async function obtenerTodasLasPaginas<T>(
  pedir: (pagina: number) => Promise<{ items: T[]; totalPaginas: number }>,
  maxPaginas = 50,
): Promise<T[]> {
  const todos: T[] = [];
  let totalPaginas = 1;
  for (let pagina = 1; pagina <= Math.min(totalPaginas, maxPaginas); pagina++) {
    const resultado = await pedir(pagina);
    todos.push(...resultado.items);
    totalPaginas = resultado.totalPaginas;
  }
  return todos;
}
