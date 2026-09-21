import React, { useEffect, useState, useMemo } from 'react';
import { 
  FolderTree, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  X, 
  Layers, 
  Tag, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Upload, 
  Folder, 
  Check, 
  Ban, 
  Image as ImageIcon 
} from 'lucide-react';
import { toast } from 'sonner';
import { Categoria } from '../../catalogo/types';
import { adminCategoriasApi, CrearCategoriaPayload } from './admin-categorias.api';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const AdminCategoriesPage: React.FC = () => {
  const [categoriasArbol, setCategoriasArbol] = useState<Categoria[]>([]);
  const [categoriasPlanas, setCategoriasPlanas] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activas' | 'inactivas' | 'vacias'>('todas');
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Modal de Creación / Edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);

  // Campos de Formulario
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPadreId, setFormPadreId] = useState<string>('');
  const [formOrden, setFormOrden] = useState<number>(0);
  const [formActiva, setFormActiva] = useState<boolean>(true);
  const [formImagenUrl, setFormImagenUrl] = useState<string>('');
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // Modal de confirmación de eliminación
  const [categoriaEliminando, setCategoriaEliminando] = useState<Categoria | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [arbol, planas] = await Promise.all([
        adminCategoriasApi.obtenerCategorias(),
        adminCategoriasApi.obtenerCategoriasPlano(),
      ]);
      setCategoriasArbol(arbol);
      setCategoriasPlanas(planas);

      // Por defecto expandir todas las que tienen subcategorías
      const initialExp: Record<string, boolean> = {};
      arbol.forEach(c => {
        if (c.subcategorias && c.subcategorias.length > 0) {
          initialExp[c.id] = true;
        }
      });
      setExpandidos(prev => ({ ...initialExp, ...prev }));
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar las categorías');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const toggleExpansion = (id: string) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = categoriasPlanas.length;
    const principales = categoriasPlanas.filter(c => !c.padre_id).length;
    const subcats = categoriasPlanas.filter(c => !!c.padre_id).length;
    const vacias = categoriasPlanas.filter(c => c.esVacia).length;
    return { total, principales, subcats, vacias };
  }, [categoriasPlanas]);

  // Lista de categorías raíz para seleccionar como padre
  const opcionesPadre = useMemo(() => {
    return categoriasPlanas.filter(c => {
      // Si estamos editando, una categoría no puede ser su propio padre
      if (categoriaEditando && c.id === categoriaEditando.id) return false;
      // Sólo permitir categorías raíz como padres (estructura de 2 niveles estándar)
      return !c.padre_id;
    });
  }, [categoriasPlanas, categoriaEditando]);

  // Abrir modal para crear categoría principal
  const handleAbrirCrear = (padreId: string = '') => {
    setCategoriaEditando(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormPadreId(padreId);
    setFormOrden(0);
    setFormActiva(true);
    setFormImagenUrl('');
    setModalAbierto(true);
  };

  // Abrir modal para editar categoría existente (HU-31)
  const handleAbrirEditar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setFormNombre(categoria.nombre);
    setFormDescripcion(categoria.descripcion || '');
    setFormPadreId(categoria.padre_id || '');
    setFormOrden(categoria.orden || 0);
    setFormActiva(categoria.activa !== false);
    setFormImagenUrl(categoria.imagen || '');
    setModalAbierto(true);
  };

  // Subir imagen WebP para la categoría
  const handleSubirImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validación WebP estricta
    if (!file.name.toLowerCase().endsWith('.webp') && file.type !== 'image/webp') {
      toast.error('Solo se admiten imágenes en formato WebP (.webp) para optimizar el rendimiento');
      e.target.value = '';
      return;
    }

    try {
      setSubiendoImagen(true);
      const res = await adminCategoriasApi.subirImagen(file);
      setFormImagenUrl(res.url);
      toast.success('Imagen WebP subida correctamente');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al subir la imagen');
    } finally {
      setSubiendoImagen(false);
    }
  };

  // Guardar (Crear HU-30 o Actualizar HU-31)
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    const payload: CrearCategoriaPayload = {
      nombre: formNombre.trim(),
      descripcion: formDescripcion.trim() || undefined,
      padre_id: formPadreId ? formPadreId : null,
      orden: Number(formOrden) || 0,
      activa: formActiva,
      imagen: formImagenUrl.trim() || null,
    };

    try {
      setGuardando(true);
      if (categoriaEditando) {
        // HU-31: Editar nombre o imagen
        await adminCategoriasApi.actualizarCategoria(categoriaEditando.id, payload);
        toast.success(`Categoría "${payload.nombre}" actualizada con éxito`);
      } else {
        // HU-30: Crear categoría o subcategoría
        await adminCategoriasApi.crearCategoria(payload);
        toast.success(
          payload.padre_id 
            ? `Subcategoría "${payload.nombre}" creada con éxito` 
            : `Categoría "${payload.nombre}" creada con éxito`
        );
      }
      setModalAbierto(false);
      cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar la categoría');
    } finally {
      setGuardando(false);
    }
  };

  // Alternar activo / inactivo
  const handleToggleEstado = async (cat: Categoria) => {
    try {
      await adminCategoriasApi.toggleEstado(cat.id);
      toast.success(`Categoría "${cat.nombre}" ${cat.activa ? 'desactivada' : 'activada'}`);
      cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo cambiar el estado de la categoría');
    }
  };

  // Intentar eliminar (HU-32)
  const handleSolicitarEliminar = (cat: Categoria) => {
    // Verificar si está vacía
    const directProds = cat.totalProductos ?? 0;
    const subcatsCount = cat.totalSubcategorias ?? (cat.subcategorias?.length || 0);

    if (directProds > 0) {
      toast.error(`No se puede eliminar: contiene ${directProds} producto(s) asignado(s).`);
      return;
    }

    if (subcatsCount > 0) {
      toast.error(`No se puede eliminar: contiene ${subcatsCount} subcategoría(s) asociada(s).`);
      return;
    }

    setCategoriaEliminando(cat);
  };

  const handleConfirmarEliminar = async () => {
    if (!categoriaEliminando) return;

    try {
      setEliminando(true);
      await adminCategoriasApi.eliminarCategoria(categoriaEliminando.id);
      toast.success(`Categoría "${categoriaEliminando.nombre}" eliminada exitosamente.`);
      setCategoriaEliminando(null);
      cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al eliminar la categoría');
    } finally {
      setEliminando(false);
    }
  };

  // Filtrado de árbol según búsqueda y estado
  const arbolFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return categoriasArbol.filter(cat => {
      // Filtro por estado
      if (filtroEstado === 'activas' && !cat.activa) return false;
      if (filtroEstado === 'inactivas' && cat.activa) return false;
      if (filtroEstado === 'vacias' && ((cat.totalProductos || 0) > 0 || (cat.subcategorias && cat.subcategorias.length > 0))) return false;

      // Filtro por búsqueda
      if (q) {
        const coincidePadre = cat.nombre.toLowerCase().includes(q) || (cat.descripcion?.toLowerCase().includes(q) ?? false);
        const coincideHijo = cat.subcategorias?.some(sub => 
          sub.nombre.toLowerCase().includes(q) || (sub.descripcion?.toLowerCase().includes(q) ?? false)
        );
        return coincidePadre || coincideHijo;
      }

      return true;
    });
  }, [categoriasArbol, busqueda, filtroEstado]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <FolderTree className="w-8 h-8 text-black" />
            Gestión de Categorías
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administración jerárquica de categorías, subcategorías, imágenes y restricciones de catálogo (HU-30 a HU-32).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAbrirCrear()}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-lg text-gray-700">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Total Categorías</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Principales</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.principales}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Subcategorías</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.subcats}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Vacías (Eliminables)</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.vacias}</p>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-black transition-colors"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {(['todas', 'activas', 'inactivas', 'vacias'] as const).map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroEstado(tipo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                filtroEstado === tipo
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tipo === 'vacias' ? 'Vacías (HU-32)' : tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Jerárquica de Categorías */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {cargando ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <p className="text-xs uppercase tracking-widest">Cargando árbol de categorías...</p>
          </div>
        ) : arbolFiltrado.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <FolderTree className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-700">No se encontraron categorías</p>
            <p className="text-xs text-gray-400 mt-1">Crea una nueva categoría para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center"></th>
                  <th className="py-3.5 px-4">Categoría / Subcategoría</th>
                  <th className="py-3.5 px-4">Imagen</th>
                  <th className="py-3.5 px-4">Orden</th>
                  <th className="py-3.5 px-4">Productos</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {arbolFiltrado.map(cat => {
                  const tieneHijos = cat.subcategorias && cat.subcategorias.length > 0;
                  const estaExpandido = expandidos[cat.id];
                  const totalProds = cat.totalProductos ?? 0;
                  const esVacia = totalProds === 0 && !tieneHijos;

                  return (
                    <React.Fragment key={cat.id}>
                      {/* FILA CATEGORÍA PRINCIPAL */}
                      <tr className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-3.5 px-4 text-center">
                          {tieneHijos ? (
                            <button
                              onClick={() => toggleExpansion(cat.id)}
                              className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                              title={estaExpandido ? 'Colapsar subcategorías' : 'Expandir subcategorías'}
                            >
                              {estaExpandido ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span className="inline-block w-4 h-4 text-gray-300">•</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-semibold">
                              <Folder className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 flex items-center gap-2">
                                {cat.nombre}
                                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                  Principal
                                </span>
                              </p>
                              {cat.descripcion && (
                                <p className="text-xs text-gray-500 line-clamp-1">{cat.descripcion}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {cat.imagen ? (
                            <img
                              src={getImageUrl(cat.imagen)}
                              alt={cat.nombre}
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin imagen</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">
                          {cat.orden ?? 0}
                        </td>

                        <td className="py-3.5 px-4">
                          {esVacia ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Vacía (0)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {totalProds} productos
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleEstado(cat)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              cat.activa !== false
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {cat.activa !== false ? (
                              <>
                                <Check className="w-3 h-3" /> Activa
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3" /> Inactiva
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botón Añadir Subcategoría */}
                            <button
                              onClick={() => handleAbrirCrear(cat.id)}
                              className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                              title="Añadir subcategoría"
                            >
                              <Plus className="w-4 h-4" />
                            </button>

                            {/* Botón Editar (HU-31) */}
                            <button
                              onClick={() => handleAbrirEditar(cat)}
                              className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar categoría"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Botón Eliminar Vacía (HU-32) */}
                            <button
                              onClick={() => handleSolicitarEliminar(cat)}
                              disabled={!esVacia}
                              className={`p-1.5 rounded-lg transition-colors ${
                                esVacia
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-gray-300 cursor-not-allowed opacity-50'
                              }`}
                              title={
                                esVacia
                                  ? 'Eliminar categoría vacía'
                                  : `No se puede eliminar: tiene ${totalProds} producto(s) o subcategorías`
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* SUB-FILAS DE SUBCATEGORÍAS */}
                      {tieneHijos && estaExpandido && cat.subcategorias!.map(sub => {
                        const subProds = sub.totalProductos ?? 0;
                        const subEsVacia = subProds === 0;

                        return (
                          <tr key={sub.id} className="bg-gray-50/40 hover:bg-gray-100/50 transition-colors">
                            <td className="py-3 px-4 text-center">
                              <span className="text-gray-300 font-mono">└</span>
                            </td>

                            <td className="py-3 px-4 pl-8">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                                  <Tag className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 flex items-center gap-2">
                                    {sub.nombre}
                                    <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                                      Subcategoría
                                    </span>
                                  </p>
                                  {sub.descripcion && (
                                    <p className="text-xs text-gray-400 line-clamp-1">{sub.descripcion}</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {sub.imagen ? (
                                <img
                                  src={getImageUrl(sub.imagen)}
                                  alt={sub.nombre}
                                  className="w-8 h-8 object-cover rounded border border-gray-200"
                                />
                              ) : (
                                <span className="text-xs text-gray-400 italic">Sin imagen</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                              {sub.orden ?? 0}
                            </td>

                            <td className="py-3 px-4">
                              {subEsVacia ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Vacía (0)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {subProds} productos
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleEstado(sub)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                  sub.activa !== false
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                              >
                                {sub.activa !== false ? 'Activa' : 'Inactiva'}
                              </button>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Botón Editar (HU-31) */}
                                <button
                                  onClick={() => handleAbrirEditar(sub)}
                                  className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-lg transition-colors"
                                  title="Editar subcategoría"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                {/* Botón Eliminar Vacía (HU-32) */}
                                <button
                                  onClick={() => handleSolicitarEliminar(sub)}
                                  disabled={!subEsVacia}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    subEsVacia
                                      ? 'text-red-600 hover:bg-red-50'
                                      : 'text-gray-300 cursor-not-allowed opacity-50'
                                  }`}
                                  title={
                                    subEsVacia
                                      ? 'Eliminar subcategoría vacía'
                                      : `No se puede eliminar: tiene ${subProds} producto(s)`
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR (HU-30 y HU-31) */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-black" />
                {categoriaEditando 
                  ? `Editar Categoría: ${categoriaEditando.nombre}` 
                  : formPadreId 
                    ? 'Nueva Subcategoría' 
                    : 'Nueva Categoría Principal'}
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Camisas, Ropa Deportiva, Accesorios..."
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                />
              </div>

              {/* Categoría Padre (HU-30: Subcategorías) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Categoría Padre (Opcional)
                </label>
                <select
                  value={formPadreId}
                  onChange={e => setFormPadreId(e.target.value)}
                  className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                >
                  <option value="">Ninguna (Es Categoría Principal)</option>
                  {opcionesPadre.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Si seleccionas una categoría padre, se registrará como subcategoría anidada.
                </p>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Breve descripción de la categoría..."
                  value={formDescripcion}
                  onChange={e => setFormDescripcion(e.target.value)}
                  className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                />
              </div>

              {/* Imagen (HU-31: Formato WebP) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Imagen de la Categoría (.webp)
                </label>
                
                <div className="flex items-center gap-4">
                  {formImagenUrl ? (
                    <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                      <img
                        src={getImageUrl(formImagenUrl)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormImagenUrl('')}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar imagen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>{subiendoImagen ? 'Subiendo WebP...' : 'Seleccionar archivo .webp'}</span>
                      <input
                        type="file"
                        accept=".webp,image/webp"
                        onChange={handleSubirImagen}
                        className="hidden"
                        disabled={subiendoImagen}
                      />
                    </label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Solo formato WebP optimizado (Max 5MB).
                    </p>
                  </div>
                </div>
              </div>

              {/* Orden y Estado */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={formOrden}
                    onChange={e => setFormOrden(Number(e.target.value))}
                    className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Estado
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formActiva}
                      onChange={e => setFormActiva(e.target.checked)}
                      className="rounded text-black focus:ring-black h-4 w-4"
                    />
                    <span className="text-xs font-medium text-gray-800">
                      {formActiva ? 'Activa en la tienda' : 'Inactiva (Oculta)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || subiendoImagen}
                  className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : categoriaEditando ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN (HU-32) */}
      {categoriaEliminando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              ¿Eliminar categoría vacía?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Estás a punto de eliminar físicamente la categoría <strong className="text-gray-900">"{categoriaEliminando.nombre}"</strong>. Esta categoría no tiene productos ni subcategorías asociadas. Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCategoriaEliminando(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEliminar}
                disabled={eliminando}
                className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {eliminando ? 'Eliminando...' : 'Sí, eliminar categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
