import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import { adminApi } from '../services/admin.api';
import { ReporteDinamicoResultado } from '../types';

export const AdminDynamicReportsPage: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [proveedor, setProveedor] = useState<'GROQ' | 'OLLAMA'>('GROQ');
  const [cargando, setCargando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ReporteDinamicoResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mostrarSql, setMostrarSql] = useState<boolean>(false);

  // Estados de Reconocimiento de Voz (Web Speech API)
  const [escuchando, setEscuchando] = useState<boolean>(false);
  const [soporteVoz, setSoporteVoz] = useState<boolean>(true);
  const [textoVozInterim, setTextoVozInterim] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Helper para filtrar cualquier columna que sea identificador/ID
  const esColumnaValida = (col: string): boolean => {
    const c = col.toLowerCase().trim();
    if (
      c === 'id' ||
      c === '_id' ||
      c.endsWith('_id') ||
      c.endsWith('id') ||
      c.includes('_id_') ||
      c.includes(' id') ||
      c.includes('id ')
    ) {
      return false;
    }
    return true;
  };

  const columnasVisibles = (resultado?.columnas || []).filter(esColumnaValida);

  // Inicializar Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSoporteVoz(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-BO'; // Español Bolivia / Latino
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setEscuchando(true);
      setError(null);
      setTextoVozInterim('Escuchando tu voz...');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        setTextoVozInterim(interimTranscript);
      }

      if (finalTranscript) {
        setPrompt(finalTranscript);
        setTextoVozInterim('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento de voz:', event.error);
      setEscuchando(false);
      setTextoVozInterim('');
      if (event.error !== 'no-speech') {
        setError(`Error en el micrófono: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setEscuchando(false);
      setTextoVozInterim('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleEscuchaVoz = () => {
    if (!recognitionRef.current) return;

    if (escuchando) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('No se pudo iniciar el micrófono:', err);
      }
    }
  };

  const procesarReporte = async (textoPrompt?: string) => {
    const query = textoPrompt || prompt;
    if (!query.trim()) {
      setError('Por favor di o escribe una instrucción para generar el reporte.');
      return;
    }

    if (escuchando && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    try {
      setCargando(true);
      setError(null);
      const res = await adminApi.generarReporteDinamico(query, proveedor);
      setResultado(res);
    } catch (err: any) {
      console.error('Error generando reporte:', err);
      setError(
        err.response?.data?.message ||
          'No se pudo generar el reporte. Intenta reformular tu pregunta.',
      );
    } finally {
      setCargando(false);
    }
  };

  // 1. Exportar resultados dinámicos a CSV sin IDs
  const exportarCSV = () => {
    if (!resultado || resultado.filas.length === 0) return;

    const cols = columnasVisibles.length > 0 ? columnasVisibles : resultado.columnas;
    const headers = cols.map((c) => `"${c.replace(/_/g, ' ')}"`).join(',');
    const rows = resultado.filas.map((fila) =>
      cols
        .map((col) => {
          const val = fila[col];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'number') return val;
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(','),
    );

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_dinamico_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Exportar a PDF (documento formateado e impresión nativa)
  const exportarPDF = () => {
    if (!resultado || resultado.filas.length === 0) return;

    const cols = columnasVisibles.length > 0 ? columnasVisibles : resultado.columnas;
    const fechaGeneracion = new Date().toLocaleString('es-BO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite las ventanas emergentes en tu navegador para generar el PDF.');
      return;
    }

    const filasHtml = resultado.filas
      .map(
        (fila, idx) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
          ${cols
            .map((col) => {
              const val = fila[col];
              let displayVal = val === null || val === undefined ? '-' : String(val);
              const colLower = col.toLowerCase();
              if (
                (colLower.includes('precio') ||
                  colLower.includes('total') ||
                  colLower.includes('subtotal') ||
                  colLower.includes('descuento') ||
                  colLower.includes('ingreso') ||
                  colLower.includes('monto')) &&
                typeof val === 'number'
              ) {
                displayVal = `$${val.toFixed(2)}`;
              }
              return `<td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;">${displayVal}</td>`;
            })
            .join('')}
        </tr>
      `,
      )
      .join('');

    const columnasHtml = cols
      .map(
        (col) => `
        <th style="padding: 10px 10px; text-align: left; background: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 700; border-bottom: 2px solid #cbd5e1;">
          ${col.replace(/_/g, ' ')}
        </th>
      `,
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte_Dinamico_${Date.now()}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 30px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; }
          .logo span { background: #0f172a; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 6px; }
          .meta { font-size: 11px; color: #64748b; text-align: right; }
          .query-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; }
          .query-box strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print {
            body { margin: 15mm; }
            @page { size: auto; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo"><span>A</span> AURA Atelier</div>
            <div style="font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600;">Reporte Dinámico de Datos</div>
          </div>
          <div class="meta">
            <div><strong>Fecha de Emisión:</strong> ${fechaGeneracion}</div>
            <div><strong>Total Filas:</strong> ${resultado.totalFilas}</div>
          </div>
        </div>

        <div class="query-box">
          <strong>Consulta Solicitada:</strong> "${resultado.promptOriginal}"
        </div>

        <table>
          <thead>
            <tr>
              <th style="padding: 10px 8px; text-align: center; background: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 700; border-bottom: 2px solid #cbd5e1; width: 30px;">#</th>
              ${columnasHtml}
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>

        <div class="footer">
          Documento oficial emitido por el Sistema de Administración de AURA.
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Sugerencias de voz
  const sugerencias = [
    'Stock actual de vestidos',
    'Stock de pantalones azules',
    'Top 5 productos más vendidos y sus ingresos totales',
    'Prendas con stock agotado o menor al stock mínimo',
    'Total de stock por categoría',
    'Ventas agrupadas por categoría de ropa',
    'Clientes con mayor monto acumulado en compras',
    'Resumen de pedidos según su estado actual',
    'Cupones más utilizados y total de descuentos',
  ];

  // Helper para formatear valores en la tabla
  const renderValorCelda = (col: string, val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-gray-300 italic">null</span>;
    }

    const colLower = col.toLowerCase();

    // Moneda Bolivianos
    if (
      (colLower.includes('precio') ||
        colLower.includes('total') ||
        colLower.includes('subtotal') ||
        colLower.includes('descuento') ||
        colLower.includes('ingreso') ||
        colLower.includes('monto') ||
        colLower.includes('gastado')) &&
      typeof val === 'number'
    ) {
      return <span className="font-bold text-gray-900">${val.toFixed(2)}</span>;
    }

    // Fechas
    if (
      (colLower.includes('fecha') || colLower.includes('creado')) &&
      typeof val === 'string' &&
      val.length >= 10
    ) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return <span className="text-gray-600">{d.toLocaleString('es-BO')}</span>;
      }
    }

    // Estados
    if (colLower === 'estado' && typeof val === 'string') {
      const color =
        val === 'COMPLETADO' || val === 'PAGADO' || val === 'ENTREGADO' || val === 'APROBADO'
          ? 'bg-emerald-100 text-emerald-800'
          : val === 'PENDIENTE' || val === 'PREPARANDO'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-gray-100 text-gray-800';
      return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>{val}</span>;
    }

    if (typeof val === 'boolean') {
      return (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            val ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {val ? 'SÍ' : 'NO'}
        </span>
      );
    }

    return <span>{String(val)}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/admin/reportes"
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Reportes Estándar
            </Link>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <span>Reportes Dinámicos por Voz</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> IA PostgreSQL
            </span>
          </h1>
          <p className="text-sm text-gray-500">
            Dicta o escribe cualquier consulta y la inteligencia artificial generará y ejecutará el reporte en tiempo real.
          </p>
        </div>

        {/* Selector de Proveedor IA */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200 text-xs shadow-sm self-start md:self-auto">
          <span className="text-gray-400 font-bold px-2 text-[10px] uppercase tracking-wider">
            Motor IA:
          </span>
          <button
            onClick={() => setProveedor('GROQ')}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              proveedor === 'GROQ' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Groq Cloud (Ultra Rápido)
          </button>
          <button
            onClick={() => setProveedor('OLLAMA')}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              proveedor === 'OLLAMA' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Ollama Local
          </button>
        </div>
      </div>

      {/* TARJETA PRINCIPAL DE ENTRADA POR VOZ Y TEXTO */}
      <div className="bg-gradient-to-b from-white to-gray-50/50 p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* BOTÓN DE MICRÓFONO CON ANIMACIÓN */}
          <div className="flex flex-col items-center shrink-0">
            <button
              onClick={toggleEscuchaVoz}
              disabled={!soporteVoz || cargando}
              title={escuchando ? 'Detener micrófono' : 'Presiona para dictar tu reporte'}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                escuchando
                  ? 'bg-rose-600 text-white scale-105 ring-8 ring-rose-100 animate-pulse'
                  : 'bg-black text-white hover:bg-gray-800 hover:scale-105'
              } disabled:opacity-50`}
            >
              {escuchando ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            <span className="text-[11px] font-bold text-gray-500 mt-2 uppercase tracking-wider">
              {escuchando ? 'Escuchando...' : 'Presiona para hablar'}
            </span>
          </div>

          {/* CAMPO DE ENTRADA DE TEXTO Y FORMULARIO */}
          <div className="flex-1 w-full space-y-3">
            <div className="relative">
              <textarea
                rows={2}
                placeholder="Ejemplo: 'Muéstrame los 5 productos con más ventas y su recaudación total'..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    procesarReporte();
                  }
                }}
                className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black pr-28 shadow-inner resize-none font-medium"
              />

              <button
                onClick={() => procesarReporte()}
                disabled={cargando || !prompt.trim()}
                className="absolute right-3 bottom-4 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-all flex items-center gap-2 shadow-sm"
              >
                {cargando ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{cargando ? 'Generando...' : 'Consultar'}</span>
              </button>
            </div>

            {/* Texto en vivo de voz */}
            {textoVozInterim && (
              <div className="text-xs text-indigo-600 font-medium italic flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>{textoVozInterim}</span>
              </div>
            )}
          </div>
        </div>

        {/* CHIPS DE SUGERENCIAS RÁPIDAS */}
        <div className="border-t border-gray-200/80 pt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Consultas Rápidas Sugeridas:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sugerencias.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(s);
                  procesarReporte(s);
                }}
                disabled={cargando}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-medium transition-all shadow-2xs hover:shadow-xs"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MENSAJES DE ERROR */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* RESULTADOS DEL REPORTE */}
      {resultado && (
        <div className="space-y-4">
          {/* BARRA SUPERIOR EXCLUSIVA: BOTONES EXPORTAR CSV Y EXPORTAR PDF */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 font-medium">
                Total registros: <strong className="text-gray-900">{resultado.totalFilas}</strong>
              </span>
              <span className="text-xs text-gray-500 font-mono bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                ⚡ {resultado.tiempoEjecucionMs} ms
              </span>
            </div>

            {/* BOTONES DE EXPORTACIÓN */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportarCSV}
                disabled={resultado.filas.length === 0}
                className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-40 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={exportarPDF}
                disabled={resultado.filas.length === 0}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-40 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          {/* TABLA DINÁMICA DE RESULTADOS (SIN COLUMNAS ID) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                  <Mic className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Instrucción solicitada:</span>
                  <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                    "{resultado.promptOriginal}"
                  </span>
                </div>
                {resultado.descripcion && (
                  <div className="text-xs text-indigo-700 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{resultado.descripcion}</span>
                  </div>
                )}
              </div>

              {resultado.sql && (
                <button
                  onClick={() => setMostrarSql(!mostrarSql)}
                  className="px-2.5 py-1 text-[11px] font-mono text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 transition-all self-start sm:self-auto shrink-0"
                >
                  {mostrarSql ? 'Ocultar SQL' : 'Ver SQL'}
                </button>
              )}
            </div>

            {mostrarSql && resultado.sql && (
              <div className="bg-gray-900 p-3 text-[11px] font-mono text-emerald-400 border-b border-gray-800 overflow-x-auto">
                <span className="text-gray-500 select-none">SQL &gt; </span>
                {resultado.sql}
              </div>
            )}

            {resultado.filas.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2">
                <div className="text-gray-500 text-xs font-medium">
                  La consulta se ejecutó con éxito pero no devolvió ningún registro con los filtros solicitados.
                </div>
                <div className="text-[11px] text-gray-400">
                  Prueba seleccionando una de las consultas sugeridas arriba o ajusta los términos de búsqueda.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center text-gray-400 font-normal">#</th>
                      {columnasVisibles.map((col) => (
                        <th key={col} className="py-3 px-4 whitespace-nowrap">
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {resultado.filas.map((fila, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-gray-400 text-[11px]">
                          {rowIdx + 1}
                        </td>
                        {columnasVisibles.map((col) => (
                          <td key={col} className="py-3 px-4 whitespace-nowrap">
                            {renderValorCelda(col, fila[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
