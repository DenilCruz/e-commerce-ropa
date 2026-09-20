import React, { useEffect, useState } from 'react';
import { Producto, Categoria } from '../types';
import { obtenerProductos, obtenerCategorias } from '../services/catalogo.api';
import { ProductCard } from '../components/ProductCard';

export const CatalogPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        // Cargamos categorías y productos al mismo tiempo
        const [prods, cats] = await Promise.all([
          obtenerProductos(),
          obtenerCategorias(),
        ]);
        setProductos(prods);
        setCategorias(cats);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el catálogo');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const productosFiltrados = categoriaSeleccionada === 'todas'
    ? productos
    : productos.filter(p => p.categoriaId === categoriaSeleccionada);

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-lg text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Catálogo de Ropa</h1>
          <p className="text-gray-500 mt-1">Explora nuestra colección y encuentra tu estilo.</p>
        </div>

        {/* Filtros de Categoría */}
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
          <button
            onClick={() => setCategoriaSeleccionada('todas')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              categoriaSeleccionada === 'todas'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {categorias.filter(c => c.activa).map(categoria => (
            <button
              key={categoria.id}
              onClick={() => setCategoriaSeleccionada(categoria.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoriaSeleccionada === categoria.id
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {categoria.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Productos */}
      {productosFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500">No hay productos disponibles en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productosFiltrados.map(producto => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
};
