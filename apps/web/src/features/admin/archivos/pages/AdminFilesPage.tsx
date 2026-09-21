import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Cloud, 
  HardDrive, 
  Sparkles, 
  UploadCloud, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Search, 
  Filter, 
  Layers, 
  FolderArchive,
  Eye,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { archivosApi } from '../services/archivos.api';
import { ArchivoMultimedia, EstadoCloudinary } from '../types';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const resolverUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

const formatearBytes = (bytes?: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const AdminFilesPage: React.FC = () => {
  const [archivos, setArchivos] = useState<ArchivoMultimedia[]>([]);
  const [estadoCloudinary, setEstadoCloudinary] = useState<EstadoCloudinary | null>(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [ultimoAhorro, setUltimoAhorro] = useState<{ original: number; optimizado: number; ahorro: number } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [filtroUso, setFiltroUso] = useState<'todos' | 'en_uso' | 'obsoleto'>('todos');

  // Categoría para nuevas subidas
  const [categoriaSubida, setCategoriaSubida] = useState('productos');

  // Estado para copiar URL
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal de confirmación de limpieza masiva
  const [mostrarModalLimpieza, setMostrarModalLimpieza] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  // Modal para ver imagen ampliada
  const [imagenModal, setImagenModal] = useState<ArchivoMultimedia | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [dataCloudinary, dataArchivos] = await Promise.all([
        archivosApi.obtenerEstadoCloudinary(),
        archivosApi.obtenerArchivos(
          categoriaSeleccionada !== 'todas' ? categoriaSeleccionada : undefined,
          filtroUso !== 'todos' ? filtroUso : undefined,
        ),
      ]);
      setEstadoCloudinary(dataCloudinary);
      setArchivos(dataArchivos);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la galería de archivos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [categoriaSeleccionada, filtroUso]);

  // Manejo de subida de imágenes (HU-80 y HU-83)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validar tipo de imagen
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido (PNG, JPG, WebP, etc.).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setSubiendo(true);
      const toastId = toast.loading(`Comprimiendo a WebP y subiendo "${file.name}"...`);
      const resultado = await archivosApi.subirArchivo(file, categoriaSubida);

      if (resultado.porcentajeAhorro !== undefined && resultado.porcentajeAhorro > 0) {
        setUltimoAhorro({
          original: resultado.tamanioOriginal || file.size,
          optimizado: resultado.tamanio,
          ahorro: resultado.porcentajeAhorro,
        });
        toast.success(
          `Imagen optimizada a WebP y guardada (${resultado.porcentajeAhorro}% de ahorro en peso).`,
          { id: toastId }
        );
      } else {
        toast.success(`Imagen subida exitosamente (${resultado.almacenamiento}).`, { id: toastId });
      }

      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al procesar y subir la imagen.');
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Eliminar imagen individual (HU-81)
  const handleEliminar = async (archivo: ArchivoMultimedia) => {
    const ident = archivo.id || archivo.url;
    if (!confirm(`¿Deseas eliminar permanentemente esta imagen (${archivo.nombreArchivo}) del almacenamiento?`)) {
      return;
    }

    try {
      const toastId = toast.loading('Eliminando imagen...');
      await archivosApi.eliminarArchivo(ident);
      toast.success('Imagen eliminada del almacenamiento.', { id: toastId });
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al eliminar la imagen.');
    }
  };

  // Limpieza masiva de obsoletas (HU-81)
  const handleLimpiarObsoletas = async () => {
    try {
      setLimpiando(true);
      const res = await archivosApi.limpiarObsoletas();
      toast.success(res.mensaje || `Se eliminaron ${res.totalEliminados} imágenes obsoletas.`);
      setMostrarModalLimpieza(false);
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al ejecutar la limpieza de archivos obsoletos.');
    } finally {
      setLimpiando(false);
    }
  };

  const copiarAlPortapapeles = (url: string, id: string) => {
    const urlFinal = resolverUrl(url);
    navigator.clipboard.writeText(urlFinal);
    setCopiadoId(id);
    toast.success('URL copiada al portapapeles');
    setTimeout(() => setCopiadoId(null), 2000);
  };

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = archivos.length;
    const enUso = archivos.filter(a => a.enUso).length;
    const obsoletas = total - enUso;
    const pesoTotal = archivos.reduce((acc, a) => acc + (a.tamanio || 0), 0);
    return { total, enUso, obsoletas, pesoTotal };
  }, [archivos]);

  // Filtrar por término de búsqueda
  const archivosFiltrados = useMemo(() => {
    return archivos.filter(a => {
      const q = busqueda.toLowerCase().trim();
      if (!q) return true;
      return (
        a.nombreArchivo.toLowerCase().includes(q) ||
        (a.nombreOriginal && a.nombreOriginal.toLowerCase().includes(q)) ||
        (a.vinculadoA && a.vinculadoA.toLowerCase().includes(q))
      );
    });
  }, [archivos, busqueda]);

  const categoriasDisponibles = [
    { value: 'todas', label: 'Todas las categorías' },
    { value: 'productos', label: 'Productos' },
    { value: 'poleras', label: 'Poleras' },
    { value: 'vestidos', label: 'Vestidos' },
    { value: 'faldas', label: 'Faldas' },
    { value: 'camisas', label: 'Camisas' },
    { value: 'shorts', label: 'Shorts' },
    { value: 'perfiles', label: 'Perfiles de Usuario' },
    { value: 'categorias', label: 'Iconos de Categoría' },
    { value: 'general', label: 'General' },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado y Estado de Almacenamiento */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gray-900 text-white rounded-xl">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Gestor de Archivos y Multimedia
              </h1>
              <p className="text-sm text-gray-500">
                Almacenamiento Cloudinary, optimización WebP automática y eliminación de obsoletas
              </p>
            </div>
          </div>
        </div>

        {/* Indicadores de Integración Cloudinary y Sharp */}
        <div className="flex flex-wrap items-center gap-2.5">
          {estadoCloudinary?.configurado ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              <Cloud className="w-4 h-4 text-emerald-600" />
              <span>Cloudinary Conectado: <strong>{estadoCloudinary.cloudName}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span>Modo Local Optimizado (/uploads)</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sharp WebP 82%</span>
          </div>

          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            title="Refrescar galería"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FolderArchive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Archivos</p>
            <p className="text-2xl font-black text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">En Uso</p>
            <p className="text-2xl font-black text-emerald-600">{stats.enUso}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${stats.obsoletas > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Obsoletas / Huérfanas</p>
            <p className={`text-2xl font-black ${stats.obsoletas > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {stats.obsoletas}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Almacenamiento Total</p>
            <p className="text-2xl font-black text-gray-900">{formatearBytes(stats.pesoTotal)}</p>
          </div>
        </div>
      </div>

      {/* Zona de Subida y Optimización (HU-80 y HU-83) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-gray-700" />
              <span>Subir y Optimizar Nueva Imagen</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cualquier imagen (JPG, PNG, WebP) se convertirá y comprimirá automáticamente a WebP de alta fidelidad.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600">Carpeta destino:</label>
            <select
              value={categoriaSubida}
              onChange={e => setCategoriaSubida(e.target.value)}
              className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:outline-none"
            >
              <option value="productos">Productos (General)</option>
              <option value="poleras">Poleras</option>
              <option value="vestidos">Vestidos</option>
              <option value="faldas">Faldas</option>
              <option value="camisas">Camisas</option>
              <option value="shorts">Shorts</option>
              <option value="perfiles">Perfiles de Usuario</option>
              <option value="categorias">Categorías</option>
            </select>
          </div>
        </div>

        {/* Botón / Input de Subida */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="admin-file-upload-input"
          />
          <label
            htmlFor="admin-file-upload-input"
            className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all ${
              subiendo
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800 shadow-sm hover:shadow'
            }`}
          >
            <UploadCloud className={`w-4 h-4 ${subiendo ? 'animate-bounce' : ''}`} />
            <span>{subiendo ? 'Optimizando imagen...' : 'Seleccionar Imagen para Subir'}</span>
          </label>

          {ultimoAhorro && (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl animate-fade-in">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>
                Última compresión: de {formatearBytes(ultimoAhorro.original)} a{' '}
                <strong>{formatearBytes(ultimoAhorro.optimizado)}</strong> (
                <strong className="text-emerald-700">-{ultimoAhorro.ahorro}% reducido</strong>)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Limpieza Masiva (HU-81) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Pestañas de Filtro de Uso */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setFiltroUso('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroUso === 'todos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas ({stats.total})
          </button>
          <button
            onClick={() => setFiltroUso('en_uso')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroUso === 'en_uso' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            En Uso ({stats.enUso})
          </button>
          <button
            onClick={() => setFiltroUso('obsoleto')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroUso === 'obsoleto' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Obsoletas ({stats.obsoletas})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Categoría */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoriaSeleccionada}
              onChange={e => setCategoriaSeleccionada(e.target.value)}
              className="text-xs font-medium bg-white border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-black focus:outline-none shadow-sm"
            >
              {categoriasDisponibles.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o vínculo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="text-xs pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:outline-none shadow-sm w-48 sm:w-64"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botón Limpiar Obsoletas (HU-81) */}
          {stats.obsoletas > 0 && (
            <button
              onClick={() => setMostrarModalLimpieza(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar {stats.obsoletas} obsoleta(s)</span>
            </button>
          )}
        </div>
      </div>

      {/* Galería de Archivos */}
      {cargando ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-900" />
          <p className="text-sm font-medium">Cargando archivos multimedia...</p>
        </div>
      ) : archivosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No se encontraron archivos</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            No hay imágenes que coincidan con los filtros seleccionados. Sube nuevas imágenes utilizando el selector superior.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {archivosFiltrados.map((item, idx) => {
            const urlResuelta = resolverUrl(item.url);
            const esCloudinary = item.almacenamiento === 'cloudinary' || item.url.includes('cloudinary.com');

            return (
              <div
                key={item.id || item.url || idx}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  !item.enUso
                    ? 'border-amber-200 shadow-sm hover:border-amber-300'
                    : 'border-gray-100 hover:border-gray-200 shadow-sm'
                }`}
              >
                {/* Previsualización de Imagen */}
                <div className="relative aspect-square bg-gray-100 group overflow-hidden">
                  <img
                    src={urlResuelta}
                    alt={item.nombreArchivo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Overlay con botones rápidos al pasar el cursor */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                    <button
                      onClick={() => setImagenModal(item)}
                      className="p-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-sm transition-transform hover:scale-110"
                      title="Ver tamaño completo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={urlResuelta}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-sm transition-transform hover:scale-110"
                      title="Abrir enlace directo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => copiarAlPortapapeles(item.url, item.id || item.url)}
                      className="p-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-sm transition-transform hover:scale-110"
                      title="Copiar URL"
                    >
                      {copiadoId === (item.id || item.url) ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Badges Flotantes sobre la Imagen */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    {/* Almacenamiento */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase backdrop-blur-md shadow-sm ${
                        esCloudinary
                          ? 'bg-blue-600/90 text-white'
                          : 'bg-gray-900/80 text-white'
                      }`}
                    >
                      {esCloudinary ? 'Cloudinary' : 'Local'}
                    </span>

                    {/* Badge WebP */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-600/90 text-white backdrop-blur-md shadow-sm">
                      WebP
                    </span>
                  </div>

                  {/* Estado En Uso u Obsoleta */}
                  <div className="absolute top-2.5 right-2.5">
                    {item.enUso ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-bold rounded-md shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>En Uso</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/95 text-white text-[10px] font-bold rounded-md shadow-sm animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Obsoleta</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadatos y Acciones */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-900 truncate" title={item.nombreArchivo}>
                      {item.nombreArchivo}
                    </p>

                    {item.vinculadoA ? (
                      <p className="text-[11px] text-emerald-700 font-medium truncate" title={item.vinculadoA}>
                        {item.vinculadoA}
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-600 font-medium">
                        Sin vincular a ningún producto
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <span>{formatearBytes(item.tamanio)}</span>
                      {item.porcentajeAhorro ? (
                        <span className="text-emerald-600 font-bold">-{item.porcentajeAhorro}% optimizado</span>
                      ) : (
                        <span className="text-gray-400 capitalize">{item.categoria}</span>
                      )}
                    </div>
                  </div>

                  {/* Botón de Eliminación (HU-81) */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => copiarAlPortapapeles(item.url, item.id || item.url)}
                      className="text-xs text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </button>

                    <button
                      onClick={() => handleEliminar(item)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Limpieza Masiva de Obsoletas (HU-81) */}
      {mostrarModalLimpieza && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Limpiar Imágenes Obsoletas</h3>
                <p className="text-xs text-gray-500">Mantenimiento de almacenamiento</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Se detectaron <strong>{stats.obsoletas} imágenes</strong> que no están vinculadas a ninguna prenda, categoría ni usuario. Esta acción las eliminará permanentemente de Cloudinary y del servidor para liberar espacio.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalLimpieza(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={limpiando}
                onClick={handleLimpiarObsoletas}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{limpiando ? 'Eliminando...' : 'Confirmar y Limpiar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Ampliada de Imagen */}
      {imagenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 truncate">
                {imagenModal.nombreArchivo}
              </h3>
              <button
                onClick={() => setImagenModal(null)}
                className="p-1 text-gray-400 hover:text-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 flex items-center justify-center bg-gray-50 max-h-[60vh] overflow-hidden">
              <img
                src={resolverUrl(imagenModal.url)}
                alt={imagenModal.nombreArchivo}
                className="max-h-[55vh] object-contain rounded-lg"
              />
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-gray-500">
                  Formato: <strong className="text-gray-900 uppercase">{imagenModal.formato}</strong> · Peso:{' '}
                  <strong className="text-gray-900">{formatearBytes(imagenModal.tamanio)}</strong>
                </p>
                {imagenModal.vinculadoA && (
                  <p className="text-emerald-700 font-medium">Vinculado a: {imagenModal.vinculadoA}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copiarAlPortapapeles(imagenModal.url, imagenModal.id || imagenModal.url)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar URL</span>
                </button>
                <a
                  href={resolverUrl(imagenModal.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-black text-white rounded-xl font-semibold flex items-center gap-1.5 hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Original</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
