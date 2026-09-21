import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shirt, 
  FolderTree, 
  Package, 
  Users, 
  Image as ImageIcon, 
  Star, 
  ArrowRight, 
  TrendingUp 
} from 'lucide-react';
import { obtenerProductos, obtenerCategorias } from '../../catalogo/services/catalogo.api';
import { Producto, Categoria } from '../../catalogo/types';

export const AdminDashboardPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [prods, cats] = await Promise.all([obtenerProductos(), obtenerCategorias()]);
        setProductos(prods);
        setCategorias(cats);
      } catch (e) {
        console.error('Error cargando dashboard', e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const totalStock = productos.reduce((acc, p) => {
    const stockProd = p.variantes?.reduce((s, v) => s + (Number(v.stock) || 0), 0) || 0;
    return acc + stockProd;
  }, 0);

  const productosActivos = productos.filter(p => (p as any).activo !== false).length;

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-black" />
          Panel de Administración
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Métricas clave en tiempo real del catálogo, categorías e inventario.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Productos</p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{loading ? '...' : productos.length}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {loading ? '' : `${productosActivos} activos en tienda`}
              </p>
            </div>
            <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-sm">
              <Shirt className="w-6 h-6" />
            </div>
          </div>
        </div>

        <Link 
          to="/admin/categorias" 
          className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-black transition-all group block"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-black transition-colors">
                Categorías
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{loading ? '...' : categorias.length}</h3>
              <p className="text-xs text-gray-500 mt-1">Líneas y subcategorías organizadas</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <FolderTree className="w-6 h-6" />
            </div>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Stock en Almacén</p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{loading ? '...' : totalStock}</h3>
              <p className="text-xs text-blue-600 font-medium mt-1">Prendas disponibles en total</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg font-bold text-gray-900">Módulos Administrativos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/productos"
            className="p-5 bg-white rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gray-100 rounded-lg text-gray-800 group-hover:bg-black group-hover:text-white transition-colors">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-black text-sm">Productos</h4>
                <p className="text-xs text-gray-500">Crear y editar prendas</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/categorias"
            className="p-5 bg-white rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-lg text-purple-700 group-hover:bg-black group-hover:text-white transition-colors">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-black text-sm">Categorías</h4>
                <p className="text-xs text-gray-500">Árbol y subcategorías</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/inventario"
            className="p-5 bg-white rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700 group-hover:bg-black group-hover:text-white transition-colors">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-black text-sm">Inventario</h4>
                <p className="text-xs text-gray-500">Stock y alertas</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/usuarios"
            className="p-5 bg-white rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700 group-hover:bg-black group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-black text-sm">Usuarios</h4>
                <p className="text-xs text-gray-500">Roles y moderación</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/archivos"
            className="p-5 bg-white rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-lg text-blue-700 group-hover:bg-black group-hover:text-white transition-colors">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-black text-sm">Archivos</h4>
                <p className="text-xs text-gray-500">Cloudinary y multimedia</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/resenas"
            className="p-5 bg-white rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700 group-hover:bg-black group-hover:text-white transition-colors">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-black text-sm">Reseñas</h4>
                <p className="text-xs text-gray-500">Moderación y spam</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
};
