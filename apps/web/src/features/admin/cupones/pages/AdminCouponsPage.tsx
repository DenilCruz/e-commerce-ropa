import React, { useEffect, useState } from 'react';
import { Ticket, AlertCircle } from 'lucide-react';
import { cuponesApi } from '../../../cupones/services/cupones.api';
import { Cupon, CrearCuponPayload } from '../../../cupones/types';

export const AdminCouponsPage: React.FC = () => {
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [form, setForm] = useState<CrearCuponPayload>({
    codigo: '',
    descripcion: '',
    tipo: 'PORCENTAJE',
    valor: 10,
    montoMinimo: 0,
    usosMaximos: 100,
    usosPorUsuario: 1,
    fechaInicio: new Date().toISOString().slice(0, 16),
    fechaFin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    activo: true,
  });

  const cargarCupones = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await cuponesApi.listarCupones(false);
      setCupones(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar cupones.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCupones();
  }, []);

  const handleToggleEstado = async (id: string, estadoActual: boolean) => {
    try {
      const updated = await cuponesApi.cambiarEstado(id, !estadoActual);
      setCupones((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'No se pudo cambiar el estado del cupón.');
    }
  };

  const handleEliminar = async (id: string, codigo: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el cupón "${codigo}"?`)) return;
    try {
      await cuponesApi.eliminarCupon(id);
      setCupones((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al eliminar cupón.');
    }
  };

  const handleCrearCupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    try {
      const nuevo = await cuponesApi.crearCupon({
        ...form,
        codigo: form.codigo.trim().toUpperCase(),
        valor: Number(form.valor),
        montoMinimo: Number(form.montoMinimo || 0),
        usosMaximos: form.usosMaximos ? Number(form.usosMaximos) : undefined,
        usosPorUsuario: Number(form.usosPorUsuario || 1),
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin).toISOString(),
      });

      setCupones([nuevo, ...cupones]);
      setModalAbierto(false);
      // Reset form
      setForm({
        codigo: '',
        descripcion: '',
        tipo: 'PORCENTAJE',
        valor: 10,
        montoMinimo: 0,
        usosMaximos: 100,
        usosPorUsuario: 1,
        fechaInicio: new Date().toISOString().slice(0, 16),
        fechaFin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
        activo: true,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear cupón.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E7E1D7]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9B7B54]">Promociones & Descuentos</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-[#9B7B54]" />
            <span>Gestión de Cupones</span>
            <span className="text-xs bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7] font-bold px-2.5 py-0.5 rounded-full">
              Atelier
            </span>
          </h1>
          <p className="text-sm text-stone-500">
            Crea promociones, restringe vigencia, montos mínimos y controla su estado comercial.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setModalAbierto(true);
          }}
          className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all text-xs uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+</span>
          <span>Crear Nuevo Cupón</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs underline font-bold">Cerrar</button>
        </div>
      )}

      {/* TABLA DE CUPONES */}
      <div className="bg-white rounded-2xl border border-[#E7E1D7] shadow-xs overflow-hidden">
        {cargando ? (
          <div className="py-12 text-center text-stone-500 text-sm">
            Cargando cupones registrados...
          </div>
        ) : cupones.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-sm">
            <Ticket className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-stone-800">No hay cupones creados aún.</p>
            <p className="text-xs text-stone-400 mt-1">Haz clic en "Crear Nuevo Cupón" para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E7E1D7] text-xs font-bold uppercase tracking-wider text-stone-600">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Descuento</th>
                  <th className="py-3 px-4">Mínimo</th>
                  <th className="py-3 px-4">Usos (Actual / Máx)</th>
                  <th className="py-3 px-4">Vigencia</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E1D7]/60">
                {cupones.map((c) => {
                  const inicio = new Date(c.fechaInicio).toLocaleDateString();
                  const fin = new Date(c.fechaFin).toLocaleDateString();
                  const expirado = new Date() > new Date(c.fechaFin);

                  return (
                    <tr key={c.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-stone-900 text-sm">{c.codigo}</div>
                        {c.descripcion && (
                          <div className="text-xs text-stone-500 truncate max-w-xs">{c.descripcion}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        {c.tipo === 'PORCENTAJE' ? (
                          <span className="text-[#9B7B54] bg-[#FAF8F5] border border-[#E7E1D7] px-2 py-0.5 rounded font-mono font-bold">
                            {c.valor}% OFF
                          </span>
                        ) : (
                          <span className="text-stone-900 bg-[#FAF8F5] border border-[#E7E1D7] px-2 py-0.5 rounded font-mono font-bold">
                            ${c.valor} OFF
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {Number(c.montoMinimo) > 0 ? `$${Number(c.montoMinimo).toFixed(2)}` : 'Sin mínimo'}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {c.usosActuales} / {c.usosMaximos ?? '∞'}
                        <span className="text-xs text-stone-400 block">({c.usosPorUsuario} por usuario)</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-600">
                        <div>{inicio} al {fin}</div>
                        {expirado && (
                          <span className="text-[10px] text-rose-600 font-bold uppercase">Expirado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(c.id, c.activo)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                            c.activo
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'
                          }`}
                          title="Clic para cambiar estado activo/inactivo (HU-75)"
                        >
                          {c.activo ? '● Activo' : '○ Inactivo'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEliminar(c.id, c.codigo)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR CUPÓN (HU-71 & HU-72) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#E7E1D7] shadow-xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#E7E1D7]">
              <h2 className="font-serif text-xl font-bold text-stone-900">Crear Nuevo Cupón</h2>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-stone-400 hover:text-stone-900 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCupon} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Código del Cupón *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. VERANO20"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 border border-[#E7E1D7] rounded-xl font-mono uppercase focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej. 20% de descuento en ropa de verano"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2 border border-[#E7E1D7] rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tipo de Descuento *</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="MONTO_FIJO">Monto Fijo ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Valor del Descuento *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={form.tipo === 'PORCENTAJE' ? 100 : undefined}
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-[#E7E1D7] rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Monto Mínimo ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.montoMinimo}
                    onChange={(e) => setForm({ ...form, montoMinimo: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-[#E7E1D7] rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Usos Máximos Globales</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej. 100 (vacío para ilimitado)"
                    value={form.usosMaximos || ''}
                    onChange={(e) => setForm({ ...form, usosMaximos: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3.5 py-2 border border-[#E7E1D7] rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Usos por Usuario</label>
                <input
                  type="number"
                  min="1"
                  value={form.usosPorUsuario}
                  onChange={(e) => setForm({ ...form, usosPorUsuario: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-[#E7E1D7] rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.fechaInicio}
                    onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-none text-xs bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Fecha de Fin *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.fechaFin}
                    onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl focus:ring-2 focus:ring-stone-900 focus:outline-none text-xs bg-white text-stone-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 text-stone-900 rounded focus:ring-stone-900"
                />
                <label htmlFor="activo" className="font-semibold text-stone-700 text-xs">
                  Activar cupón inmediatamente
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#E7E1D7]">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-[#E7E1D7] rounded-xl font-semibold text-stone-700 hover:bg-[#FAF8F5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Crear Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
