import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Tag, 
  FolderTree, 
  ArrowUpDown 
} from 'lucide-react';
import { Producto, Categoria } from '../types';
import { obtenerProductos, obtenerCategorias } from '../services/catalogo.api';
import { ProductCard } from '../components/ProductCard';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // HU-26: Búsqueda por nombre
  const [busqueda, setBusqueda] = useState('');

  // HU-25 y HU-34: Filtros (Categoría, Talla, Color, Precio)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>(
    searchParams.get('categoria') || 'todas'
  );
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string>('todas');
  const [colorSeleccionado, setColorSeleccionado] = useState<string>('todos');
  const [precioMaximoFiltro, setPrecioMaximoFiltro] = useState<number>(0);

  // HU-29: Ordenamiento (Novedad, Precio, Popularidad)
  const [ordenarPor, setOrdenarPor] = useState<'reciente' | 'precio_asc' | 'precio_desc' | 'popularidad'>('reciente');

  // HU-24: Paginación para visitantes
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 8;

  // Árbol interactivo desplegable para visitantes y clientes (HU-33)
  const [mostrarArbol, setMostrarArbol] = useState(false);

  // Sincronizar parámetro URL con estado de categoría (HU-34)
  useEffect(() => {
    const catUrl = searchParams.get('categoria');
    if (catUrl) {
      setCategoriaSeleccionada(catUrl);
      setPaginaActual(1);
    } else {
      setCategoriaSeleccionada('todas');
    }
  }, [searchParams]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        const [prods, cats] = await Promise.all([
          obtenerProductos(),
          obtenerCategorias(),
        ]);
        setProductos(prods);
        setCategorias(cats);

        // Calcular precio máximo del catálogo
        const maxP = Math.ceil(Math.max(...prods.map(p => Number(p.precio) || 0), 200));
        setPrecioMaximoFiltro(maxP);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el catálogo');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  // Extraer tallas y colores disponibles dinámicamente
  const tallasDisponibles = useMemo(() => {
    const tSet = new Set<string>();
    productos.forEach(p => {
      p.variantes?.forEach(v => {
        if (v.talla?.nombre) tSet.add(v.talla.nombre);
      });
    });
    return Array.from(tSet).sort();
  }, [productos]);

  const coloresDisponibles = useMemo(() => {
    const cSet = new Set<string>();
    productos.forEach(p => {
      p.variantes?.forEach(v => {
        if (v.color?.nombre) cSet.add(v.color.nombre);
      });
    });
    return Array.from(cSet).sort();
  }, [productos]);

  const precioMaximoAbsoluto = useMemo(() => {
    return Math.ceil(Math.max(...productos.map(p => Number(p.precio) || 0), 200));
  }, [productos]);

  // Al cambiar filtros, resetear a la página 1 (HU-24)
  const resetearPagina = () => setPaginaActual(1);

  // Seleccionar categoría y actualizar URL (HU-34)
  const handleSeleccionarCategoria = (catId: string) => {
    setCategoriaSeleccionada(catId);
    resetearPagina();
    if (catId === 'todas') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('categoria');
      setSearchParams(newParams);
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('categoria', catId);
      setSearchParams(newParams);
    }
  };

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    handleSeleccionarCategoria('todas');
    setTallaSeleccionada('todas');
    setColorSeleccionado('todos');
    setPrecioMaximoFiltro(precioMaximoAbsoluto);
    setOrdenarPor('reciente');
    resetearPagina();
  };

  const hayFiltrosActivos = 
    busqueda.trim() !== '' ||
    categoriaSeleccionada !== 'todas' ||
    tallaSeleccionada !== 'todas' ||
    colorSeleccionado !== 'todos' ||
    (precioMaximoFiltro > 0 && precioMaximoFiltro < precioMaximoAbsoluto);

  // Nombre de la categoría activa (para mostrar badge/resumen)
  const categoriaActivaObj = useMemo(() => {
    if (categoriaSeleccionada === 'todas') return null;
    // Buscar en raíces
    const raiz = categorias.find(c => c.id === categoriaSeleccionada);
    if (raiz) return raiz;
    // Buscar en subcategorías
    for (const c of categorias) {
      const sub = c.subcategorias?.find(s => s.id === categoriaSeleccionada);
      if (sub) return sub;
    }
    return null;
  }, [categorias, categoriaSeleccionada]);

  // Subcategorías de la categoría raíz seleccionada (si aplica)
  const subcategoriasVisibles = useMemo(() => {
    if (categoriaSeleccionada === 'todas') return [];
    const raiz = categorias.find(c => c.id === categoriaSeleccionada);
    if (raiz && raiz.subcategorias) {
      return raiz.subcategorias.filter(s => s.activa !== false);
    }
    // Si una subcategoría está seleccionada, buscar su categoría padre para mostrar las hermanas
    for (const c of categorias) {
      if (c.subcategorias?.some(s => s.id === categoriaSeleccionada)) {
        return c.subcategorias.filter(s => s.activa !== false);
      }
    }
    return [];
  }, [categorias, categoriaSeleccionada]);

  // Conteo de prendas por ID de categoría para visualización del árbol
  const conteoPorCategoria = useMemo(() => {
    const conteo: Record<string, number> = {};
    productos.forEach(p => {
      const catId = p.categoria?.id || p.categoriaId;
      if (catId) {
        conteo[catId] = (conteo[catId] || 0) + 1;
      }
    });
    return conteo;
  }, [productos]);

  const obtenerTotalCategoria = (cat: Categoria) => {
    let total = conteoPorCategoria[cat.id] || 0;
    if (cat.subcategorias) {
      cat.subcategorias.forEach(sub => {
        total += conteoPorCategoria[sub.id] || 0;
      });
    }
    return total;
  };

  // PIPELINE DE FILTRADO Y ORDENAMIENTO (HU-23, HU-25, HU-26, HU-29, HU-34)
  const productosProcesados = useMemo(() => {
    // 1. Filtrar solo productos activos (HU-23)
    let resultado = productos.filter(p => p.activo !== false);

    // 2. HU-26: Búsqueda por nombre
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      resultado = resultado.filter(p => p.nombre.toLowerCase().includes(q));
    }

    // 3. HU-25 y HU-34: Filtrar por Categoría (Jerárquico)
    if (categoriaSeleccionada !== 'todas') {
      // Identificar si la categoría seleccionada tiene subcategorías
      const catObj = categorias.find(c => c.id === categoriaSeleccionada);
      const subcatIds = catObj?.subcategorias?.map(s => s.id) || [];
      const idsPermitidos = new Set([categoriaSeleccionada, ...subcatIds]);

      resultado = resultado.filter(p => {
        const prodCatId = p.categoria?.id || p.categoriaId;
        return prodCatId ? idsPermitidos.has(prodCatId) : false;
      });
    }

    // 4. HU-25: Filtrar por Talla
    if (tallaSeleccionada !== 'todas') {
      resultado = resultado.filter(p =>
        p.variantes?.some(v => v.talla?.nombre === tallaSeleccionada || v.talla?.id === tallaSeleccionada)
      );
    }

    // 5. HU-25: Filtrar por Color
    if (colorSeleccionado !== 'todos') {
      resultado = resultado.filter(p =>
        p.variantes?.some(v => v.color?.nombre === colorSeleccionado || v.color?.id === colorSeleccionado)
      );
    }

    // 6. HU-25: Filtrar por Precio máximo
    if (precioMaximoFiltro > 0) {
      resultado = resultado.filter(p => Number(p.precio) <= precioMaximoFiltro);
    }

    // 7. HU-29: Ordenar
    resultado.sort((a, b) => {
      if (ordenarPor === 'precio_asc') return Number(a.precio) - Number(b.precio);
      if (ordenarPor === 'precio_desc') return Number(b.precio) - Number(a.precio);
      if (ordenarPor === 'popularidad') return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0);
      // 'reciente':
      return new Date((b as any).creadoEn || 0).getTime() - new Date((a as any).creadoEn || 0).getTime();
    });

    return resultado;
  }, [productos, busqueda, categoriaSeleccionada, categorias, tallaSeleccionada, colorSeleccionado, precioMaximoFiltro, ordenarPor]);

  // Cálculo de Paginación (HU-24)
  const totalPaginas = Math.max(1, Math.ceil(productosProcesados.length / itemsPorPagina));
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const productosPaginados = productosProcesados.slice(indiceInicio, indiceFin);

  const cambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Cargando colección...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 font-semibold mb-2">{error}</p>
        <button onClick={() => window.location.reload()} className="text-xs uppercase underline tracking-wider font-semibold">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* Título Principal */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Catálogo de Ropa</h1>
        <p className="text-sm text-gray-500 mt-1">Explora nuestra colección femenina y encuentra tu estilo ideal.</p>
        
        {/* Badge de filtro de categoría activa si existe (HU-34) */}
        {categoriaActivaObj && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-400">Filtrando por categoría:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black text-white">
              <FolderTree className="w-3.5 h-3.5" />
              {categoriaActivaObj.nombre}
              <button
                onClick={() => handleSeleccionarCategoria('todas')}
                className="hover:text-gray-300 p-0.5"
                title="Quitar filtro de categoría"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* BARRA DE BÚSQUEDA Y CATEGORÍAS (HU-26, HU-25 y HU-34) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Input Buscador (HU-26) */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={busqueda}
            onChange={e => {
              setBusqueda(e.target.value);
              resetearPagina();
            }}
            placeholder="Buscar prenda por nombre..."
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:bg-white focus:outline-none focus:border-black transition-all"
          />
          {busqueda && (
            <button
              onClick={() => {
                setBusqueda('');
                resetearPagina();
              }}
              className="absolute right-3.5 top-3 text-gray-400 hover:text-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categorías Principales Pills (HU-34) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setMostrarArbol(!mostrarArbol)}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              mostrarArbol
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-white text-gray-700 border-gray-300 hover:border-black'
            }`}
            title="Ver estructura en árbol de categorías"
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>{mostrarArbol ? 'Ocultar Árbol' : 'Árbol de Categorías'}</span>
          </button>
          <button
            onClick={() => handleSeleccionarCategoria('todas')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              categoriaSeleccionada === 'todas'
                ? 'bg-black text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {categorias.filter(c => c.activa !== false).map(cat => {
            const esActiva = categoriaSeleccionada === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSeleccionarCategoria(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  esActiva
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{cat.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visualizador Jerárquico del Árbol de Categorías (HU-33) */}
      {mostrarArbol && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-black" />
              <h2 className="text-sm uppercase tracking-wider font-bold text-gray-900">
                Árbol de Categorías
              </h2>
              <span className="text-xs text-gray-400 hidden sm:inline">
                — Selecciona una categoría principal o subcategoría para filtrar
              </span>
            </div>
            <button
              onClick={() => setMostrarArbol(false)}
              className="text-xs font-semibold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
            >
              <X className="w-4 h-4" /> Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Opción Todas */}
            <button
              onClick={() => handleSeleccionarCategoria('todas')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                categoriaSeleccionada === 'todas'
                  ? 'border-black bg-gray-50 ring-1 ring-black'
                  : 'border-gray-200 hover:border-gray-400 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900">Todas las Prendas</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 font-semibold text-gray-600">
                  {productos.length}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Ver todo el catálogo completo</p>
            </button>

            {/* Categorías con sus subcategorías */}
            {categorias.filter(c => c.activa !== false).map(cat => {
              const esActiva = categoriaSeleccionada === cat.id;
              const totalPrendas = obtenerTotalCategoria(cat);
              const tieneSubcats = cat.subcategorias && cat.subcategorias.length > 0;

              return (
                <div
                  key={cat.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    esActiva
                      ? 'border-black bg-gray-50/70 ring-1 ring-black'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSeleccionarCategoria(cat.id)}
                      className="font-bold text-sm text-gray-900 hover:text-black flex items-center gap-1.5 text-left flex-1"
                    >
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <span>{cat.nombre}</span>
                    </button>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 font-semibold text-gray-600">
                      {totalPrendas}
                    </span>
                  </div>

                  {tieneSubcats && (
                    <ul className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1.5 pl-1">
                      {cat.subcategorias!.filter(s => s.activa !== false).map(sub => {
                        const esSubActiva = categoriaSeleccionada === sub.id;
                        const countSub = conteoPorCategoria[sub.id] || 0;
                        return (
                          <li key={sub.id}>
                            <button
                              onClick={() => handleSeleccionarCategoria(sub.id)}
                              className={`w-full flex items-center justify-between text-xs py-1 px-2 rounded transition-colors text-left ${
                                esSubActiva
                                  ? 'bg-black text-white font-semibold'
                                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
                              }`}
                            >
                              <span className="truncate">↳ {sub.nombre}</span>
                              {countSub > 0 && (
                                <span className={`text-[10px] ml-1 font-medium ${esSubActiva ? 'text-gray-200' : 'text-gray-400'}`}>
                                  {countSub}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subcategorías Chips (si la categoría seleccionada tiene subcategorías) */}
      {subcategoriasVisibles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto bg-gray-50/80 p-3 rounded-xl border border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" /> Subcategorías:
          </span>
          {subcategoriasVisibles.map(sub => (
            <button
              key={sub.id}
              onClick={() => handleSeleccionarCategoria(sub.id)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                categoriaSeleccionada === sub.id
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-black'
              }`}
            >
              {sub.nombre}
            </button>
          ))}
        </div>
      )}

      {/* BARRA DE FILTROS SECUNDARIOS Y ORDENAMIENTO (HU-25 y HU-29) */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider pr-2 border-r border-gray-200">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-600" />
            <span>Filtros</span>
          </div>

          {/* Filtro por Talla (HU-25) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Talla:</span>
            <select
              value={tallaSeleccionada}
              onChange={e => {
                setTallaSeleccionada(e.target.value);
                resetearPagina();
              }}
              className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-1.5 font-medium outline-none focus:border-black cursor-pointer"
            >
              <option value="todas">Todas</option>
              {tallasDisponibles.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Color (HU-25) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Color:</span>
            <select
              value={colorSeleccionado}
              onChange={e => {
                setColorSeleccionado(e.target.value);
                resetearPagina();
              }}
              className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-1.5 font-medium outline-none focus:border-black cursor-pointer"
            >
              <option value="todos">Todos</option>
              {coloresDisponibles.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Precio Máximo (HU-25) */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <span className="text-xs font-medium text-gray-500">Hasta:</span>
            <span className="text-xs font-bold text-gray-900">${precioMaximoFiltro}</span>
            <input
              type="range"
              min={10}
              max={precioMaximoAbsoluto}
              step={5}
              value={precioMaximoFiltro}
              onChange={e => {
                setPrecioMaximoFiltro(Number(e.target.value));
                resetearPagina();
              }}
              className="w-24 accent-black cursor-pointer"
            />
          </div>

          {/* Botón Limpiar Filtros */}
          {hayFiltrosActivos && (
            <button
              onClick={handleLimpiarFiltros}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold underline ml-2"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* HU-29: Selector de Ordenamiento */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Ordenar por:</span>
          <select
            value={ordenarPor}
            onChange={e => {
              setOrdenarPor(e.target.value as any);
              resetearPagina();
            }}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-1.5 font-medium outline-none focus:border-black cursor-pointer"
          >
            <option value="reciente">Más recientes</option>
            <option value="precio_asc">Precio: Menor a Mayor</option>
            <option value="precio_desc">Precio: Mayor a Menor</option>
            <option value="popularidad">Popularidad (Destacados)</option>
          </select>
        </div>
      </div>

      {/* RESULTADOS / LISTA DE PRODUCTOS */}
      <div className="flex justify-between items-center text-xs text-gray-500 px-1">
        <span>Mostrando {productosPaginados.length} de {productosProcesados.length} prendas</span>
        <span>Página {paginaActual} de {totalPaginas}</span>
      </div>

      {productosPaginados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-lg font-bold text-gray-800">No encontramos prendas con los filtros seleccionados</p>
          <p className="text-sm text-gray-500 mt-1">Prueba seleccionando otra categoría, quitando filtros o buscando con otro término.</p>
          <button
            onClick={handleLimpiarFiltros}
            className="mt-4 px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Restablecer todos los filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productosPaginados.map(producto => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}

      {/* CONTROLES DE PAGINACIÓN (HU-24) */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-2 pt-8 border-t border-gray-100">
          <button
            onClick={() => cambiarPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => cambiarPagina(num)}
                className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                  paginaActual === num
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            onClick={() => cambiarPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
