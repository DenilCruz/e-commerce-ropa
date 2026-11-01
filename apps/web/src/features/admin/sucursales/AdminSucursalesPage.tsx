import React, { useEffect, useState } from 'react';
import { planesApi, Sucursal } from '../../tiendas/services/planes.api';

/** Owner screen for the branch quota. Same admin surfaces as the rest of the panel. */
export const AdminSucursalesPage: React.FC = () => {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    planesApi.listarSucursales().then(setSucursales).catch(() => setSucursales([]));
  };

  useEffect(() => {
    cargar();
  }, []);

  const crear = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await planesApi.crearSucursal(nombre);
      setNombre('');
      cargar();
    } catch (err: any) {
      const mensaje = err?.response?.data?.message || 'No se pudo abrir la sucursal.';
      setError(Array.isArray(mensaje) ? mensaje.join(' ') : mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9B7B54]">Tienda</p>
        <h1 className="font-serif text-3xl text-stone-900">Sucursales</h1>
        <p className="text-sm text-stone-600">Cada local cuenta para el cupo de tu plan.</p>
      </header>

      <ul className="border border-[#E7E1D7] bg-white divide-y divide-[#E7E1D7]">
        {sucursales.map((sucursal) => (
          <li key={sucursal.id} className="px-4 py-3 text-sm text-stone-900">
            {sucursal.nombre}
            {sucursal.direccion ? <span className="text-stone-500"> · {sucursal.direccion}</span> : null}
          </li>
        ))}
        {sucursales.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">Sin sucursales cargadas.</li>}
      </ul>

      <form onSubmit={crear} className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-stone-600" htmlFor="nombre-sucursal">
          Nueva sucursal
        </label>
        <input
          id="nombre-sucursal"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          className="border border-[#E7E1D7] bg-white px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={guardando}
          className="px-4 py-2 bg-[#161513] text-[#FAF8F5] text-xs uppercase tracking-widest disabled:opacity-60"
        >
          Abrir
        </button>
      </form>
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
};
