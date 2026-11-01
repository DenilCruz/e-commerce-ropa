function escaparPdf(texto: string): string {
  const ascii = texto.replace(/[^\x20-\x7E]/g, '?');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** ASCII PDF 1.4 with Helvetica. One or more pages. The stream length is the byte length. */
export function construirPdfTabla(titulo: string, columnas: string[], filas: string[][]): Uint8Array {
  const lineas = [titulo, columnas.join(' | ')];
  for (const fila of filas) lineas.push(fila.map((celda) => celda ?? '').join(' | '));

  const porPagina = 40;
  const paginas: string[][] = [];
  for (let i = 0; i < lineas.length; i += porPagina) paginas.push(lineas.slice(i, i + porPagina));
  if (paginas.length === 0) paginas.push(['']);

  const fontId = 3 + paginas.length * 2;
  const kids: string[] = [];
  const objetos: { id: number; body: string }[] = [];

  for (let p = 0; p < paginas.length; p++) {
    const pageId = 3 + p * 2;
    const contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    const comandos = ['BT', '/F1 10 Tf', '40 760 Td', '14 TL'];
    for (const linea of paginas[p]) comandos.push(`(${escaparPdf(linea)}) Tj`, 'T*');
    comandos.push('ET');
    const stream = `${comandos.join('\n')}\n`;
    objetos.push({
      id: contentId,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    });
    objetos.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    });
  }

  const todos = [
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, body: `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${paginas.length} >>` },
    ...objetos,
    { id: fontId, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
  ].sort((a, b) => a.id - b.id);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of todos) {
    offsets[obj.id] = pdf.length;
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${fontId + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= fontId; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function descargarPdf(nombre: string, bytes: Uint8Array): void {
  const archivo = nombre.endsWith('.pdf') ? nombre : `${nombre}.pdf`;
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
