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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-purple-600" />
            <span>Gestión de Cupones</span>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
              Admin
            </span>
          </h1>
          <p className="text-sm text-gray-500">
            Crea promociones, restringe vigencia, montos mínimos y controla su estado (HU-71 a HU-75).
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setModalAbierto(true);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-sm flex items-center gap-2 self-start sm:self-auto"
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            Cargando cupones registrados...
          </div>
        ) : cupones.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">No hay cupones creados aún.</p>
            <p className="text-xs text-gray-400 mt-1">Haz clic en "Crear Nuevo Cupón" para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Descuento</th>
                  <th className="py-3 px-4">Mínimo</th>
                  <th className="py-3 px-4">Usos (Actual / Máx)</th>
                  <th className="py-3 px-4">Vigencia</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cupones.map((c) => {
                  const inicio = new Date(c.fechaInicio).toLocaleDateString();
                  const fin = new Date(c.fechaFin).toLocaleDateString();
                  const expirado = new Date() > new Date(c.fechaFin);

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-gray-900 text-sm">{c.codigo}</div>
                        {c.descripcion && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{c.descripcion}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {c.tipo === 'PORCENTAJE' ? (
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono">
                            {c.valor}% OFF
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                            Bs. {c.valor} OFF
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {Number(c.montoMinimo) > 0 ? `Bs. ${Number(c.montoMinimo).toFixed(2)}` : 'Sin mínimo'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {c.usosActuales} / {c.usosMaximos ?? '∞'}
                        <span className="text-xs text-gray-400 block">({c.usosPorUsuario} por usuario)</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        <div>{inicio} al {fin}</div>
                        {expirado && (
                          <span className="text-[10px] text-red-600 font-bold uppercase">Expirado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(c.id, c.activo)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                            c.activo
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                          className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded hover:bg-red-50"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Crear Nuevo Cupón</h2>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCupon} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Código del Cupón *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. VERANO20"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej. 20% de descuento en ropa de verano"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tipo de Descuento *</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none bg-white"
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="MONTO_FIJO">Monto Fijo (Bs.)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Valor del Descuento *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={form.tipo === 'PORCENTAJE' ? 100 : undefined}
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Monto Mínimo (Bs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.montoMinimo}
                    onChange={(e) => setForm({ ...form, montoMinimo: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Usos Máximos Globales</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej. 100 (vacío para ilimitado)"
                    value={form.usosMaximos || ''}
                    onChange={(e) => setForm({ ...form, usosMaximos: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Usos por Usuario</label>
                <input
                  type="number"
                  min="1"
                  value={form.usosPorUsuario}
                  onChange={(e) => setForm({ ...form, usosPorUsuario: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.fechaInicio}
                    onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fecha de Fin *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.fechaFin}
                    onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="activo" className="font-semibold text-gray-700 text-xs">
                  Activar cupón inmediatamente
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
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
