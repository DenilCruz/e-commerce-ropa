import React, { useEffect, useState } from 'react';
import {
  Truck,
  Search,
  Edit2,
  Plus,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';
import { shippingApi, MetodoEnvio, ActualizarEstadoEnvioDto } from '../../../envios/services/shipping.api';
import { Link } from 'react-router-dom';

export const AdminShippingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'envios' | 'metodos'>('envios');

  // Estado para listado de envíos
  const [envios, setEnvios] = useState<any[]>([]);
  const [loadingEnvios, setLoadingEnvios] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Modal para actualizar despacho (HU-65)
  const [selectedEnvio, setSelectedEnvio] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState<'PREPARANDO' | 'EN_CAMINO' | 'EN_REPARTO' | 'ENTREGADO' | 'FALLIDO'>('EN_CAMINO');
  const [transportadora, setTransportadora] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [notas, setNotas] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Estado para métodos de envío (HU-61)
  const [metodos, setMetodos] = useState<MetodoEnvio[]>([]);
  const [loadingMetodos, setLoadingMetodos] = useState(false);
  const [metodoModalOpen, setMetodoModalOpen] = useState(false);
  const [metodoEditando, setMetodoEditando] = useState<MetodoEnvio | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formCosto, setFormCosto] = useState<number>(15);
  const [formTiempo, setFormTiempo] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [savingMetodo, setSavingMetodo] = useState(false);

  const cargarEnvios = async () => {
    try {
      setLoadingEnvios(true);
      const data = await shippingApi.listarTodosAdmin({
        estado: filtroEstado !== 'TODOS' ? filtroEstado : undefined,
        busqueda: busqueda || undefined,
      });
      setEnvios(data);
    } catch (err) {
      console.error('Error al cargar envíos:', err);
    } finally {
      setLoadingEnvios(false);
    }
  };

  const cargarMetodos = async () => {
    try {
      setLoadingMetodos(true);
      const data = await shippingApi.listarMetodosAdmin();
      setMetodos(data);
    } catch (err) {
      console.error('Error al cargar métodos de envío:', err);
    } finally {
      setLoadingMetodos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'envios') {
      cargarEnvios();
    } else {
      cargarMetodos();
    }
  }, [activeTab, filtroEstado]);

  const abrirModalDespacho = (envio: any) => {
    setSelectedEnvio(envio);
    setNuevoEstado(envio.estado || 'EN_CAMINO');
    setTransportadora(envio.empresaTransportadora || 'Courier Local Express');
    setNumeroGuia(envio.numeroTracking || '');
    setNotas('');
    setModalOpen(true);
  };

  const guardarActualizacionDespacho = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnvio) return;

    try {
      setSavingStatus(true);
      const dto: ActualizarEstadoEnvioDto = {
        estadoEnvio: nuevoEstado,
        transportadora,
        numeroGuia,
        notas,
      };
      await shippingApi.actualizarEstadoAdmin(selectedEnvio.id, dto);
      setModalOpen(false);
      await cargarEnvios();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar el despacho.');
    } finally {
      setSavingStatus(false);
    }
  };

  const abrirModalMetodo = (m?: MetodoEnvio) => {
    if (m) {
      setMetodoEditando(m);
      setFormNombre(m.nombre);
      setFormDescripcion(m.descripcion || '');
      setFormCosto(m.costo);
      setFormTiempo(m.tiempoEstimado || '');
      setFormActivo(m.activo);
    } else {
      setMetodoEditando(null);
      setFormNombre('');
      setFormDescripcion('');
      setFormCosto(15);
      setFormTiempo('2 a 3 días hábiles');
      setFormActivo(true);
    }
    setMetodoModalOpen(true);
  };

  const guardarMetodo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingMetodo(true);
      if (metodoEditando) {
        await shippingApi.actualizarMetodoAdmin(metodoEditando.id, {
          nombre: formNombre,
          descripcion: formDescripcion,
          costo: formCosto,
          tiempoEstimado: formTiempo,
          activo: formActivo,
        });
      } else {
        await shippingApi.crearMetodoAdmin({
          nombre: formNombre,
          descripcion: formDescripcion,
          costo: formCosto,
          tiempoEstimado: formTiempo,
          activo: formActivo,
        });
      }
      setMetodoModalOpen(false);
      await cargarMetodos();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar método de envío.');
    } finally {
      setSavingMetodo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Título de la Sección */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-600" />
            Gestión y Control de Envíos
          </h1>
          <p className="text-sm text-slate-500">
            Administra los despachos de paquetes (HU-65) y configura tarifas y zonas (HU-61).
          </p>
        </div>

        {/* Tabs de navegación */}
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('envios')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'envios'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Despachos y Guías
          </button>
          <button
            onClick={() => setActiveTab('metodos')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'metodos'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Métodos y Costos
          </button>
        </div>
      </div>

      {/* TAB 1: DESPACHOS Y GUÍAS (HU-65) */}
      {activeTab === 'envios' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Barra de Filtros */}
          <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {['TODOS', 'PREPARANDO', 'EN_CAMINO', 'EN_REPARTO', 'ENTREGADO'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroEstado(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filtroEstado === st
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cargarEnvios()}
                  placeholder="Buscar guía o cliente..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={cargarEnvios}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
                title="Refrescar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabla de Despachos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nro Guía</th>
                  <th className="px-6 py-4">Orden / Cliente</th>
                  <th className="px-6 py-4">Método / Courier</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha Despacho</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingEnvios ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Cargando despachos...
                    </td>
                  </tr>
                ) : envios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No se encontraron envíos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  envios.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                        {e.numeroTracking}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{e.orden?.nro || 'S/N'}</div>
                        <div className="text-xs text-slate-500">{e.orden?.cliente}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{e.empresaTransportadora}</div>
                        <div className="text-xs text-slate-400">{e.metodoEnvio}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            e.estado === 'ENTREGADO'
                              ? 'bg-green-100 text-green-800'
                              : e.estado === 'EN_REPARTO'
                              ? 'bg-amber-100 text-amber-800'
                              : e.estado === 'EN_CAMINO'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {e.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {e.fechaEnvio ? new Date(e.fechaEnvio).toLocaleDateString() : 'Pendiente'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          to={`/tracking/${e.numeroTracking}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Mapa
                        </Link>
                        <button
                          onClick={() => abrirModalDespacho(e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Actualizar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MÉTODOS Y COSTOS (HU-61) */}
      {activeTab === 'metodos' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Métodos y Tarifas de Entrega</h2>
              <p className="text-xs text-slate-500">
                Configura los costos que pagarán los clientes antes del checkout (HU-61).
              </p>
            </div>
            <button
              onClick={() => abrirModalMetodo()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition"
            >
              <Plus className="w-4 h-4" />
              Nuevo Método
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {loadingMetodos ? (
              <div className="text-center py-10 text-slate-400">Cargando métodos de envío...</div>
            ) : metodos.map((m) => (
              <div key={m.id} className="p-6 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-900">{m.nombre}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        m.activo ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{m.descripcion}</div>
                  <div className="text-xs text-slate-400 mt-1">Plazo: {m.tiempoEstimado}</div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-medium">Tarifa</div>
                    <div className="text-xl font-extrabold text-indigo-600">
                      ${Number(m.costo).toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => abrirModalMetodo(m)}
                    className="p-2 text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PARA ACTUALIZAR DESPACHO (HU-65) */}
      {modalOpen && selectedEnvio && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              Actualizar Despacho de Paquete
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Orden: <strong className="text-slate-800">{selectedEnvio.orden?.nro}</strong> | Guía: <strong className="text-indigo-600 font-mono">{selectedEnvio.numeroTracking}</strong>
            </p>

            <form onSubmit={guardarActualizacionDespacho} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Estado del Envío
                </label>
                <select
                  value={nuevoEstado}
                  onChange={(e: any) => setNuevoEstado(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="PREPARANDO">PREPARANDO (En almacén)</option>
                  <option value="EN_CAMINO">EN_CAMINO (Despachado en tránsito)</option>
                  <option value="EN_REPARTO">EN_REPARTO (En moto/camión de reparto local)</option>
                  <option value="ENTREGADO">ENTREGADO (Paquete recibido por cliente)</option>
                  <option value="FALLIDO">FALLIDO (No se pudo entregar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Empresa Transportadora
                </label>
                <input
                  type="text"
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  placeholder="Courier Local, FedEx, Moto Express..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Número de Guía / Tracking
                </label>
                <input
                  type="text"
                  value={numeroGuia}
                  onChange={(e) => setNumeroGuia(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notas de Despacho / Auditoría
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Detalles de la entrega o motivo de cambio..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl shadow transition"
                >
                  {savingStatus ? 'Guardando...' : 'Confirmar y Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR/EDITAR MÉTODO DE ENVÍO (HU-61) */}
      {metodoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setMetodoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {metodoEditando ? 'Modificar Tarifa de Envío' : 'Nuevo Método de Envío'}
            </h3>

            <form onSubmit={guardarMetodo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nombre del Método
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Envío Estándar, Express 24h..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Cobertura urbana y nacional..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Costo ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formCosto}
                    onChange={(e) => setFormCosto(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Tiempo Estimado
                  </label>
                  <input
                    type="text"
                    value={formTiempo}
                    onChange={(e) => setFormTiempo(e.target.value)}
                    placeholder="24h, 2 a 3 días..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="metodoActivo"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="metodoActivo" className="text-sm font-medium text-slate-700">
                  Método habilitado para clientes
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMetodo}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition"
                >
                  {savingMetodo ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminShippingPage;
