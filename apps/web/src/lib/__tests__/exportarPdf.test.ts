import { describe, expect, it } from 'vitest';
import { construirPdfTabla } from '../exportarPdf';

describe('construirPdfTabla', () => {
  it('empieza en %PDF y contiene el título y una fila', () => {
    const bytes = construirPdfTabla('Ventas del mes', ['producto', 'total'], [['Vestido', '120']]);
    const texto = new TextDecoder().decode(bytes);

    expect(texto.startsWith('%PDF')).toBe(true);
    expect(texto).toContain('(Ventas del mes) Tj');
    expect(texto).toContain('(Vestido | 120) Tj');
    expect(texto).toContain('%%EOF');
  });
});
