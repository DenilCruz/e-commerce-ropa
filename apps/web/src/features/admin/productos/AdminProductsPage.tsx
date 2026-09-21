import React, { useState, useEffect } from 'react';
import { adminProductosApi } from './admin-productos.api';
import { obtenerProductos, obtenerCategorias } from '../../catalogo/services/catalogo.api';
import { Producto, Categoria } from '../../catalogo/types';
import { toast } from 'sonner';
import { Plus, Pencil, Check } from 'lucide-react';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const AdminProductsPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tallas, setTallas] = useState<any[]>([]);
  const [colores, setColores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado del Formulario
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [activo, setActivo] = useState(true);
  const [destacado, setDestacado] = useState(false);

  // Creación dinámica de Color
  const [nuevoColor, setNuevoColor] = useState('');
  const [isCreatingColor, setIsCreatingColor] = useState(false);

  // Variantes e Imágenes
  const [variantes, setVariantes] = useState<any[]>([{ tallaId: '', colorId: '', sku: '', stock: 0, precioExtra: 0 }]);
  const [imagenesFiles, setImagenesFiles] = useState<File[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prods, cats, tallasList, coloresList] = await Promise.all([
        obtenerProductos(), 
        obtenerCategorias(),
        adminProductosApi.obtenerTallas(),
        adminProductosApi.obtenerColores()
      ]);
      setProductos(prods);
      setCategorias(cats);
      setTallas(tallasList);
      setColores(coloresList);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos base');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearColor = async (index: number) => {
    if (!nuevoColor.trim()) return;
    try {
      const colorCreado = await adminProductosApi.crearColor(nuevoColor.trim());
      setColores([...colores, colorCreado]);
      updateVariante(index, 'colorId', colorCreado.id);
      setNuevoColor('');
      setIsCreatingColor(false);
      toast.success('Color agregado a la base de datos');
    } catch (e) {
      toast.error('Error al crear color');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setCategoriaId('');
    setActivo(true);
    setDestacado(false);
    setVariantes([{ tallaId: '', colorId: '', sku: '', stock: 0, precioExtra: 0 }]);
    setImagenesFiles([]);
    setIsCreatingColor(false);
  };

  // Abrir modal en modo Edición (HU-22)
  const handleAbrirEditar = (p: Producto) => {
    setEditingProduct(p);
    setNombre(p.nombre);
    setDescripcion(p.descripcion || '');
    setPrecio(String(p.precio));
    setCategoriaId(p.categoria?.id || p.categoriaId || '');
    setActivo(p.activo !== false);
    setDestacado(Boolean(p.destacado));
    setImagenesFiles([]);
    setShowModal(true);
  };

  // Activar / Desactivar producto sin borrarlo (HU-23)
  const handleToggleEstado = async (id: string, nombreProd: string) => {
    try {
      const actualizado = await adminProductosApi.toggleEstado(id);
      setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: actualizado.activo } : p));
      toast.success(`Producto "${nombreProd}" ${actualizado.activo ? 'activado' : 'desactivado'} en catálogo`);
    } catch (error) {
      console.error('Error alternando estado:', error);
      toast.error('No se pudo cambiar el estado del producto');
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaId) return toast.error('Debe seleccionar una categoría');

    // Validación si es nuevo producto (HU-21 requiere imágenes)
    if (!editingProduct && imagenesFiles.length === 0) {
      return toast.error('Debe subir al menos una imagen en formato .webp');
    }

    if (!editingProduct && variantes.some(v => !v.sku)) {
      return toast.error('Todas las variantes deben tener un SKU único');
    }

    setSaving(true);
    const toastId = toast.loading(editingProduct ? 'Actualizando producto...' : 'Creando producto y subiendo imágenes...');

    try {
      const catSeleccionada = categorias.find(c => c.id === categoriaId);
      const categoriaSlug = catSeleccionada?.slug || catSeleccionada?.nombre || 'general';

      // 1. Si se subieron nuevas imágenes, procesarlas
      let nuevasImagenes: any[] = [];
      if (imagenesFiles.length > 0) {
        for (let i = 0; i < imagenesFiles.length; i++) {
          const file = imagenesFiles[i];
          const resImagen = await adminProductosApi.subirImagen(file, categoriaSlug);
          nuevasImagenes.push({
            url: resImagen.url,
            principal: i === 0
          });
        }
      }

      if (editingProduct) {
        // Modo Edición (HU-22)
        const updatePayload: any = {
          nombre,
          descripcion,
          precio: Number(precio),
          categoriaId,
          activo,
          destacado,
        };
        if (nuevasImagenes.length > 0) {
          updatePayload.imagenes = nuevasImagenes;
        }

        await adminProductosApi.actualizarProducto(editingProduct.id, updatePayload);
        toast.success('Producto actualizado exitosamente', { id: toastId });
      } else {
        // Modo Creación (HU-18, 19, 20, 21)
        const variantesPayload = variantes.map(v => ({
          sku: v.sku,
          stock: Number(v.stock),
          precioExtra: Number(v.precioExtra),
          ...(v.tallaId ? { tallaId: v.tallaId } : {}),
          ...(v.colorId ? { colorId: v.colorId } : {})
        }));

        await adminProductosApi.crearProducto({
          nombre,
          descripcion,
          precio: Number(precio),
          categoriaId,
          activo,
          destacado,
          variantes: variantesPayload,
          imagenes: nuevasImagenes
        } as any);

        toast.success('Producto creado exitosamente', { id: toastId });
      }

      setShowModal(false);
      resetForm();
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error('Hubo un error al procesar el producto', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const invalidFiles = files.filter(f => !f.name.toLowerCase().endsWith('.webp') && f.type !== 'image/webp');
      
      if (invalidFiles.length > 0) {
        toast.error(`Formato no permitido: "${invalidFiles[0].name}". Solo se admiten imágenes en formato WebP (.webp).`);
        e.target.value = '';
        setImagenesFiles([]);
        return;
      }
      setImagenesFiles(files);
    }
  };

  const addVariante = () => {
    setVariantes([...variantes, { tallaId: '', colorId: '', sku: '', stock: 0, precioExtra: 0 }]);
  };

  const removeVariante = (index: number) => {
    setVariantes(variantes.filter((_, i) => i !== index));
  };

  const updateVariante = (index: number, field: string, value: string | number) => {
    const newVariantes = [...variantes];
    newVariantes[index] = { ...newVariantes[index], [field]: value };
    setVariantes(newVariantes);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando catálogo administrativo...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 mt-1">Gestión integral de prendas, variantes y estados de catálogo</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Foto</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Variantes</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productos.map(p => {
              const imgUrl = p.imagenes?.find(i => i.principal)?.url || p.imagenes?.[0]?.url;
              const esActivo = p.activo !== false;
              return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {imgUrl ? (
                    <img src={getImageUrl(imgUrl)} alt={p.nombre} className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs font-medium">Sin foto</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.categoria?.nombre || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${p.precio}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.variantes?.length || 0}</td>
                
                {/* Activar/Desactivar */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleToggleEstado(p.id, p.nombre)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      esActivo 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                    }`}
                    title="Haz clic para alternar visibilidad en la tienda pública"
                  >
                    {esActivo ? '● Activo' : '○ Inactivo'}
                  </button>
                </td>

                {/* Editar */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleAbrirEditar(p)}
                    className="inline-flex items-center text-xs text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 hover:text-black px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1 text-gray-500" />
                    Editar
                  </button>
                </td>
              </tr>
            )})}
            {productos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No hay productos. ¡Crea el primero!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? `Editar Producto: ${editingProduct.nombre}` : 'Crear Nuevo Producto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black text-2xl leading-none">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="productForm" onSubmit={handleGuardar} className="space-y-6">
                
                {/* BLOQUE 1: DATOS BÁSICOS */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                  <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">1. Datos Básicos</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto</label>
                    <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-black focus:border-black outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base ($)</label>
                      <input type="number" required step="0.01" min="0" value={precio} onChange={e => setPrecio(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-black focus:border-black outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <select required value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-black focus:border-black outline-none bg-white"
                      >
                        <option value="" disabled>Seleccionar...</option>
                        {categorias.map(c => (
                          <React.Fragment key={c.id}>
                            <option value={c.id} className="font-semibold">{c.nombre}</option>
                            {c.subcategorias?.map(sub => (
                              <option key={sub.id} value={sub.id}>&nbsp;&nbsp;↳ {sub.nombre}</option>
                            ))}
                          </React.Fragment>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea required rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-black focus:border-black outline-none resize-none"
                    />
                  </div>

                  {/* Interruptores de Estado y Destacado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Estado del Producto</span>
                        <span className="text-[11px] text-gray-500">{activo ? 'Visible en catálogo (Activo)' : 'Oculto al público (Inactivo)'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivo(!activo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          activo ? 'bg-black' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            activo ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Prenda Destacada</span>
                        <span className="text-[11px] text-gray-500">{destacado ? 'Aparece en sección destacada' : 'Visualización normal'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDestacado(!destacado)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          destacado ? 'bg-black' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            destacado ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* BLOQUE 2: IMAGENES (Exclusivo WebP) */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">
                      2. Imágenes (Exclusivo WebP) {editingProduct && <span className="text-gray-400 font-normal normal-case">(Opcional si deseas cambiar fotos)</span>}
                    </h3>
                    <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Recomendado .webp</span>
                  </div>
                  <input type="file" multiple accept=".webp,image/webp" onChange={handleFileChange} required={!editingProduct}
                    className="w-full border border-dashed border-gray-400 rounded-md p-4 bg-white cursor-pointer"
                  />
                  <p className="text-xs text-gray-500">
                    Solo se admiten archivos <strong>.webp</strong> para garantizar tiempos de carga ultrarrápidos y máxima calidad gráfica.
                  </p>
                  {imagenesFiles.length > 0 && (
                    <p className="text-sm text-emerald-600 font-medium flex items-center">
                      <Check className="w-4 h-4 mr-1 text-emerald-600" />
                      {imagenesFiles.length} imagen(es) .webp seleccionadas correctamente.
                    </p>
                  )}
                </div>

                {/* BLOQUE 3: VARIANTES (Solo en creación o visualización) */}
                {!editingProduct && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">3. Variantes (Tallas y Colores)</h3>
                      <button type="button" onClick={addVariante} className="text-sm text-blue-600 hover:underline font-medium">+ Agregar Variante</button>
                    </div>
                    
                    {variantes.map((v, i) => (
                      <div key={i} className="flex gap-2 items-end border-b border-gray-200 pb-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Talla</label>
                          <select value={v.tallaId} onChange={e => updateVariante(i, 'tallaId', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                            <option value="">Ninguna</option>
                            {tallas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                          {isCreatingColor ? (
                            <div className="flex gap-1">
                              <input type="text" value={nuevoColor} onChange={e => setNuevoColor(e.target.value)} className="w-full border border-gray-300 rounded-md p-1 text-sm" placeholder="Ej: Azul Noche" />
                              <button type="button" onClick={() => handleCrearColor(i)} className="bg-black text-white px-2 rounded text-xs">OK</button>
                              <button type="button" onClick={() => setIsCreatingColor(false)} className="bg-gray-200 text-black px-2 rounded text-xs">X</button>
                            </div>
                          ) : (
                            <select value={v.colorId} onChange={e => {
                              if(e.target.value === 'NEW') setIsCreatingColor(true);
                              else updateVariante(i, 'colorId', e.target.value);
                            }} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                              <option value="">Ninguno</option>
                              {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                              <option value="NEW" className="font-bold text-blue-600">+ Añadir Nuevo Color</option>
                            </select>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">SKU (Único)</label>
                          <input type="text" required value={v.sku} onChange={e => updateVariante(i, 'sku', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="EJ: SH-01" />
                        </div>
                        <div className="w-20">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                          <input type="number" required min="0" value={v.stock} onChange={e => updateVariante(i, 'stock', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                        </div>
                        {variantes.length > 1 && (
                          <button type="button" onClick={() => removeVariante(i)} className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200">
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-white font-medium">
                Cancelar
              </button>
              <button type="submit" form="productForm" disabled={saving} className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium flex items-center gap-2">
                {saving ? 'Guardando...' : (editingProduct ? 'Guardar Cambios' : 'Crear Producto')}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
