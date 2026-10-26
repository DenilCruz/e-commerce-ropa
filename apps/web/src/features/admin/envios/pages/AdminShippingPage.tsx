import React, { useEffect, useState } from 'react';
import {
  Truck,
  Search,
  Edit2,
  Plus,
  RefreshCw,
  ExternalLink,
  X,
  Trash2,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
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
      toast.success('Estado de despacho y guía actualizados correctamente');
      setModalOpen(false);
      await cargarEnvios();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar el despacho.');
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

  const handleEliminarMetodo = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Deseas desactivar la zona o método de envío "${nombre}"?`)) return;
    try {
      await shippingApi.eliminarMetodoAdmin(id);
      toast.success(`Método "${nombre}" desactivado con éxito.`);
      await cargarMetodos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al desactivar el método de envío.');
    }
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
        toast.success(`Zona/Tarifa "${formNombre}" actualizada con éxito.`);
      } else {
        await shippingApi.crearMetodoAdmin({
          nombre: formNombre,
          descripcion: formDescripcion,
          costo: formCosto,
          tiempoEstimado: formTiempo,
          activo: formActivo,
        });
        toast.success(`Nueva zona de envío "${formNombre}" creada exitosamente.`);
      }
      setMetodoModalOpen(false);
      await cargarMetodos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar método de envío.');
    } finally {
      setSavingMetodo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Título de la Sección */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E7E1D7]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9B7B54]">Logística & Despachos</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Truck className="w-7 h-7 text-[#9B7B54]" />
            Gestión y Control de Envíos
          </h1>
          <p className="text-sm text-stone-500">
            Administra los despachos de paquetes (HU-65) y configura tarifas y zonas de cobertura (HU-61).
          </p>
        </div>

        {/* Tabs de navegación */}
        <div className="flex bg-[#FAF8F5] p-1 rounded-xl border border-[#E7E1D7]">
          <button
            onClick={() => setActiveTab('envios')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'envios'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Despachos y Guías (HU-65)
          </button>
          <button
            onClick={() => setActiveTab('metodos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'metodos'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Zonas y Costos de Envío (HU-61)
          </button>
        </div>
      </div>

      {/* TAB 1: DESPACHOS Y GUÍAS (HU-65) */}
      {activeTab === 'envios' && (
        <div className="bg-white rounded-2xl shadow-xs border border-[#E7E1D7] overflow-hidden">
          {/* Barra de Filtros */}
          <div className="p-4 sm:p-6 border-b border-[#E7E1D7] flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {['TODOS', 'PREPARANDO', 'EN_CAMINO', 'EN_REPARTO', 'ENTREGADO'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroEstado(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filtroEstado === st
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-stone-600 border border-[#E7E1D7] hover:bg-[#F2ECE1]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cargarEnvios()}
                  placeholder="Buscar guía o cliente..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E7E1D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
                />
              </div>
              <button
                onClick={cargarEnvios}
                className="p-2 border border-[#E7E1D7] rounded-lg hover:bg-[#FAF8F5] text-stone-600 transition"
                title="Refrescar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabla de Despachos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="bg-[#FAF8F5] text-[10px] uppercase font-bold tracking-wider text-stone-600 border-b border-[#E7E1D7]">
                <tr>
                  <th className="px-6 py-4">Nro Guía</th>
                  <th className="px-6 py-4">Orden / Cliente</th>
                  <th className="px-6 py-4">Método / Courier</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha Despacho</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E1D7]/60">
                {loadingEnvios ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-stone-400">
                      Cargando despachos...
                    </td>
                  </tr>
                ) : envios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-stone-400">
                      No se encontraron envíos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  envios.map((e) => (
                    <tr key={e.id} className="hover:bg-[#FAF8F5]/80 transition">
                      <td className="px-6 py-4 font-mono font-bold text-stone-900">
                        {e.numeroTracking}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-stone-900">{e.orden?.nro || 'S/N'}</div>
                        <div className="text-xs text-stone-500">{e.orden?.cliente}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-stone-800">{e.empresaTransportadora}</div>
                        <div className="text-xs text-stone-400">{e.metodoEnvio}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            e.estado === 'ENTREGADO'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : e.estado === 'EN_REPARTO'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : e.estado === 'EN_CAMINO'
                              ? 'bg-[#FAF8F5] text-stone-900 border border-[#E7E1D7]'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {e.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-500">
                        {e.fechaEnvio ? new Date(e.fechaEnvio).toLocaleDateString() : 'Pendiente'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          to={`/tracking/${e.numeroTracking}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 bg-[#FAF8F5] hover:bg-[#F2ECE1] border border-[#E7E1D7] rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Mapa
                        </Link>
                        <button
                          onClick={() => abrirModalDespacho(e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition shadow-2xs"
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
        <div className="bg-white rounded-2xl shadow-xs border border-[#E7E1D7] overflow-hidden">
          <div className="p-6 border-b border-[#E7E1D7] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#9B7B54]" />
                Zonas y Tarifas de Entrega (HU-61)
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Define las zonas geográficas, modalidades de despacho y costos de envío que se aplicarán automáticamente a los pedidos de los clientes.
              </p>
            </div>
            <button
              onClick={() => abrirModalMetodo()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Nueva Zona / Tarifa
            </button>
          </div>

          <div className="divide-y divide-[#E7E1D7]/60">
            {loadingMetodos ? (
              <div className="text-center py-10 text-stone-400">Cargando zonas de envío...</div>
            ) : metodos.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                <MapPin className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                No hay zonas de envío configuradas. Haz clic en <strong>Nueva Zona / Tarifa</strong> para comenzar.
              </div>
            ) : metodos.map((m) => (
              <div key={m.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#FAF8F5]/50 transition">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-[#FAF8F5] border border-[#E7E1D7] text-[#9B7B54] rounded-lg">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <span className="text-base font-bold text-stone-900">{m.nombre}</span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        m.activo ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-500 border border-stone-200'
                      }`}
                    >
                      {m.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 pl-10">{m.descripcion || 'Sin descripción de cobertura'}</p>
                  <p className="text-xs text-stone-400 pl-10 flex items-center gap-1">
                    <span>⏱️ Plazo estimado:</span>
                    <strong className="text-stone-700 font-medium">{m.tiempoEstimado || '24 a 48 horas'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Costo de Envío</div>
                    <div className="text-2xl font-serif font-bold text-stone-900">
                      ${Number(m.costo).toFixed(2)}{' '}
                      <span className="text-xs font-sans text-stone-400 font-normal">USD</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => abrirModalMetodo(m)}
                      className="p-2 text-stone-600 hover:text-stone-900 border border-[#E7E1D7] rounded-lg hover:bg-[#FAF8F5] transition"
                      title="Editar tarifa o plazo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {m.activo && (
                      <button
                        onClick={() => handleEliminarMetodo(m.id, m.nombre)}
                        className="p-2 text-stone-400 hover:text-rose-600 border border-[#E7E1D7] rounded-lg hover:bg-rose-50 transition"
                        title="Desactivar método"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PARA ACTUALIZAR DESPACHO (HU-65) */}
      {modalOpen && selectedEnvio && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E7E1D7] relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-lg font-bold text-stone-900 mb-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#9B7B54]" />
              Actualizar Despacho de Paquete
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Orden: <strong className="text-stone-800">{selectedEnvio.orden?.nro}</strong> | Guía: <strong className="text-stone-900 font-mono">{selectedEnvio.numeroTracking}</strong>
            </p>

            <form onSubmit={guardarActualizacionDespacho} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Estado del Envío
                </label>
                <select
                  value={nuevoEstado}
                  onChange={(e: any) => setNuevoEstado(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                >
                  <option value="PREPARANDO">PREPARANDO (En almacén)</option>
                  <option value="EN_CAMINO">EN_CAMINO (Despachado en tránsito)</option>
                  <option value="EN_REPARTO">EN_REPARTO (En moto/camión de reparto local)</option>
                  <option value="ENTREGADO">ENTREGADO (Paquete recibido por cliente)</option>
                  <option value="FALLIDO">FALLIDO (No se pudo entregar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Empresa Transportadora
                </label>
                <input
                  type="text"
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  placeholder="Courier Local, FedEx, Moto Express..."
                  className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Número de Guía / Tracking
                </label>
                <input
                  type="text"
                  value={numeroGuia}
                  onChange={(e) => setNumeroGuia(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl text-sm font-mono focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Notas de Despacho / Auditoría
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Detalles de la entrega o motivo de cambio..."
                  className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E7E1D7]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#E7E1D7] rounded-xl text-xs font-bold text-stone-700 hover:bg-[#FAF8F5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition"
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
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E7E1D7] relative">
            <button
              onClick={() => setMetodoModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-lg font-bold text-stone-900 mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#9B7B54]" />
              {metodoEditando ? 'Modificar Zona y Tarifa de Envío' : 'Nueva Zona y Tarifa de Envío'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              HU-61: Define la zona o modalidad y la tarifa que abonará el cliente durante el pedido.
            </p>

            <form onSubmit={guardarMetodo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Nombre de la Zona o Modalidad
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Santa Cruz Urbano, Nacional - La Paz / Cbba, Express 24h"
                  className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Cobertura y Descripción
                </label>
                <input
                  type="text"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej: Entrega a domicilio hasta el 4to anillo, Resto del país..."
                  className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                    Tarifa de Envío ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formCosto}
                    onChange={(e) => setFormCosto(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl text-sm font-bold text-stone-900 focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                    Plazo Estimado
                  </label>
                  <input
                    type="text"
                    value={formTiempo}
                    onChange={(e) => setFormTiempo(e.target.value)}
                    placeholder="Ej: 24 horas, 2 a 3 días hábiles"
                    className="w-full px-3 py-2 border border-[#E7E1D7] rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white text-stone-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="metodoActivo"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  className="w-4 h-4 text-stone-900 rounded border-[#E7E1D7] focus:ring-stone-900"
                />
                <label htmlFor="metodoActivo" className="text-sm font-medium text-stone-700 cursor-pointer">
                  Zona / Método habilitado para clientes en Checkout
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#E7E1D7]">
                <button
                  type="button"
                  onClick={() => setMetodoModalOpen(false)}
                  className="px-4 py-2 border border-[#E7E1D7] rounded-xl text-xs font-bold text-stone-700 hover:bg-[#FAF8F5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMetodo}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition"
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
