import React, { useMemo, useRef, useState } from 'react';
import { ProductoLocal, VarianteCatalogo } from '../types';
import { NuevoProductoLocal, opcionesDelCatalogo, sugerirSku } from '../services/productosLocales';
import { ModalPos, botonPrimario, botonSecundario, campo, etiqueta } from './ModalPos';

interface Props {
  catalogo: VarianteCatalogo[];
  isOnline: boolean;
  onGuardar: (datos: Omit<NuevoProductoLocal, 'tenantId' | 'usuarioId'>) => Promise<ProductoLocal>;
  onCerrar: () => void;
}

export const AltaRapidaProductoModal: React.FC<Props> = ({ catalogo, isOnline, onGuardar, onCerrar }) => {
  const opciones = useMemo(() => opcionesDelCatalogo(catalogo), [catalogo]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tallaId, setTallaId] = useState('');
  const [colorId, setColorId] = useState('');
  const [sku, setSku] = useState(() => sugerirSku('', catalogo.map((v) => v.sku)));
  const [skuEditado, setSkuEditado] = useState(false);
  const [stock, setStock] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  const sinCategorias = opciones.categorias.length === 0;

  const alCambiarNombre = (valor: string) => {
    setNombre(valor);
    // The suggestion follows the name until the seller types their own SKU
    if (!skuEditado) setSku(sugerirSku(valor, catalogo.map((v) => v.sku)));
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enCurso.current || sinCategorias) return;
    enCurso.current = true;
    setGuardando(true);
    setError(null);
    try {
      const categoria = opciones.categorias.find((c) => c.id === categoriaId);
      await onGuardar({
        nombre,
        precio: Number(precio.replace(',', '.')),
        categoriaId,
        categoriaNombre: categoria?.nombre ?? '',
        sku,
        stock: Number(stock),
        talla: opciones.tallas.find((t) => t.id === tallaId) ?? null,
        color: opciones.colores.find((c) => c.id === colorId) ?? null,
      });
      onCerrar();
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar el producto en este equipo.');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  return (
    <ModalPos
      titulo="Alta rápida de producto"
      descripcion={
        isOnline
          ? 'Se guarda en este equipo, aparece en el catálogo y se envía de inmediato.'
          : 'Sin conexión: el producto ya se puede vender y se enviará cuando vuelva internet.'
      }
      onCerrar={onCerrar}
    >
      {sinCategorias ? (
        <div className="space-y-4">
          <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Este equipo no tiene categorías guardadas. Conéctalo a internet una vez para descargar el catálogo; después podrás crear productos sin conexión.
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={onCerrar} className={botonSecundario}>Entendido</button>
          </div>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-3" noValidate>
          <div>
            <label htmlFor="prd-nombre" className={etiqueta}>Nombre *</label>
            <input id="prd-nombre" data-autofocus required maxLength={120} value={nombre} onChange={(e) => alCambiarNombre(e.target.value)} className={campo} aria-required="true" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="prd-precio" className={etiqueta}>Precio *</label>
              <input id="prd-precio" required inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" className={campo} aria-required="true" />
            </div>
            <div>
              <label htmlFor="prd-categoria" className={etiqueta}>Categoría *</label>
              <select id="prd-categoria" required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={campo} aria-required="true">
                <option value="">Elige una categoría</option>
                {opciones.categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          {(opciones.tallas.length > 0 || opciones.colores.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {opciones.tallas.length > 0 && (
                <div>
                  <label htmlFor="prd-talla" className={etiqueta}>Talla (opcional)</label>
                  <select id="prd-talla" value={tallaId} onChange={(e) => setTallaId(e.target.value)} className={campo}>
                    <option value="">Sin talla</option>
                    {opciones.tallas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              {opciones.colores.length > 0 && (
                <div>
                  <label htmlFor="prd-color" className={etiqueta}>Color (opcional)</label>
                  <select id="prd-color" value={colorId} onChange={(e) => setColorId(e.target.value)} className={campo}>
                    <option value="">Sin color</option>
                    {opciones.colores.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="prd-sku" className={etiqueta}>SKU *</label>
              <input id="prd-sku" required maxLength={60} value={sku} onChange={(e) => { setSku(e.target.value); setSkuEditado(true); }} className={campo} aria-required="true" />
            </div>
            <div>
              <label htmlFor="prd-stock" className={etiqueta}>Stock inicial *</label>
              <input id="prd-stock" required type="number" min={0} step={1} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={campo} aria-required="true" />
            </div>
          </div>
          <p className="text-xs text-stone-500">Sin foto: puedes agregarla después desde Productos.</p>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar} className={botonSecundario}>Cancelar</button>
            <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? 'Guardando…' : 'Guardar producto'}</button>
          </div>
        </form>
      )}
    </ModalPos>
  );
};
