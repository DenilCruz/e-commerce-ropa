import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  Clock,
  Search,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Navigation,
} from 'lucide-react';
import { shippingApi, TrackingInfo } from '../services/shipping.api';

declare global {
  interface Window {
    L?: any;
  }
}

export const TrackingPage: React.FC = () => {
  const { codigo: urlCodigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();

  const [codigoInput, setCodigoInput] = useState(urlCodigo || '');
  const [trackingData, setTrackingData] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const buscarTracking = async (codigoABuscar: string) => {
    if (!codigoABuscar.trim()) {
      setError('Por favor ingresa un código de seguimiento o número de pedido válido.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await shippingApi.consultarTracking(codigoABuscar.trim());
      setTrackingData(data);
    } catch (err: any) {
      setTrackingData(null);
      setError(
        err.response?.data?.message ||
          'No se encontró el envío solicitado. Verifica el código e intenta nuevamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlCodigo) {
      setCodigoInput(urlCodigo);
      buscarTracking(urlCodigo);
    }
  }, [urlCodigo]);

  // Inicializar o actualizar mapa de Leaflet / OpenStreetMap
  useEffect(() => {
    if (!trackingData || !mapContainerRef.current) return;

    // Verificar si Leaflet está cargado en window.L
    const L = window.L;
    if (!L) {
      console.warn('Leaflet aún no está cargado');
      return;
    }

    try {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const { mapa } = trackingData;
      const initialLat = mapa?.posicionRepartidor?.lat || -17.7833;
      const initialLng = mapa?.posicionRepartidor?.lng || -63.1821;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
      mapInstanceRef.current = map;

      // Capa de mosaicos OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Iconos personalizados con HTML/SVG
      const createCustomIcon = (color: string, label: string) => {
        return L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="
              background-color: ${color};
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 13px;
              font-weight: bold;
            ">
              ${label}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -20],
        });
      };

      const latlngs: [number, number][] = [];

      // Marcador de Origen (Almacén)
      if (mapa?.origen) {
        const originPos: [number, number] = [mapa.origen.lat, mapa.origen.lng];
        latlngs.push(originPos);
        L.marker(originPos, { icon: createCustomIcon('#4f46e5', '🏢') })
          .addTo(map)
          .bindPopup(`<strong>${mapa.origen.nombre}</strong><br/>${mapa.origen.descripcion}`);
      }

      // Marcador de Destino (Entrega)
      if (mapa?.destino) {
        const destPos: [number, number] = [mapa.destino.lat, mapa.destino.lng];
        latlngs.push(destPos);
        L.marker(destPos, { icon: createCustomIcon('#10b981', '📍') })
          .addTo(map)
          .bindPopup(`<strong>Destino de Entrega</strong><br/>${trackingData.direccionEntrega}`);
      }

      // Marcador del Repartidor / Unidad Móvil
      if (mapa?.posicionRepartidor) {
        const currentPos: [number, number] = [
          mapa.posicionRepartidor.lat,
          mapa.posicionRepartidor.lng,
        ];
        L.marker(currentPos, { icon: createCustomIcon('#f59e0b', '🚚') })
          .addTo(map)
          .bindPopup(
            `<strong>${mapa.posicionRepartidor.nombre}</strong><br/>${mapa.posicionRepartidor.descripcion}<br/><i>Estado: ${trackingData.estado}</i>`,
          )
          .openPopup();
      }

      // Trazar ruta polilínea
      if (mapa?.puntosRuta && mapa.puntosRuta.length > 1) {
        const routePoints: [number, number][] = mapa.puntosRuta.map((p) => [p.lat, p.lng]);
        L.polyline(routePoints, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
        }).addTo(map);

        map.fitBounds(L.latLngBounds(routePoints), { padding: [40, 40] });
      }
    } catch (e) {
      console.error('Error inicializando mapa de Leaflet:', e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [trackingData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoInput.trim()) {
      navigate(`/tracking/${encodeURIComponent(codigoInput.trim())}`);
      buscarTracking(codigoInput.trim());
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'ENTREGADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Entregado
          </span>
        );
      case 'EN_REPARTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            <Navigation className="w-4 h-4 text-amber-600" />
            En Reparto Hoy
          </span>
        );
      case 'EN_CAMINO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#FAF8F5] text-stone-800 border border-[#E7E1D7]">
            <Truck className="w-4 h-4 text-[#9B7B54]" />
            En Tránsito
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#FAF8F5] text-stone-700 border border-[#E7E1D7]">
            <Package className="w-4 h-4 text-[#9B7B54]" />
            En Preparación
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Cabecera y Buscador */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stone-900 text-[#9B7B54] shadow-xs mb-4">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Rastreo de Envíos en Tiempo Real
          </h1>
          <p className="mt-2 text-stone-600 max-w-xl mx-auto">
            Ingresa tu código de seguimiento (ej. <code className="text-[#9B7B54] font-bold">TRK-BO-2026-XXXXX</code>) o número de pedido para conocer la ubicación exacta de tu compra.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-6 max-w-lg mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-stone-400" />
              <input
                type="text"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                placeholder="Código de guía o Nro Orden..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#E7E1D7] rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#9B7B54] focus:border-[#9B7B54] shadow-xs transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Rastrear</span>
                  <ArrowRight className="w-4 h-4 text-[#9B7B54]" />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 max-w-lg mx-auto p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Detalle de Rastreo si hay datos */}
        {trackingData && (
          <div className="space-y-6">
            {/* Card Principal de Resumen */}
            <div className="bg-white rounded-2xl shadow-xs border border-[#E7E1D7] overflow-hidden">
              <div className="p-6 sm:p-8 bg-[#161513] text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#9B7B54] font-semibold mb-1">
                    Número de Guía de Transporte
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white flex items-center gap-3">
                    {trackingData.numeroTracking}
                  </div>
                  <div className="text-sm text-stone-300 mt-1 flex items-center gap-2">
                    <span>Pedido: <strong className="text-white">{trackingData.orden.nro}</strong></span>
                    <span>•</span>
                    <span>Transportadora: <strong className="text-white">{trackingData.empresaTransportadora}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/20">
                    <div className="text-xs text-stone-300">Estado del Paquete</div>
                    <div className="mt-1">{getEstadoBadge(trackingData.estado)}</div>
                  </div>
                </div>
              </div>

              {/* Grid informativo de fechas y dirección */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#FAF8F5] border-b border-[#E7E1D7]">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-white border border-[#E7E1D7] text-[#9B7B54] rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-stone-500 uppercase">Fecha Estimada de Entrega</div>
                    <div className="text-sm font-bold text-stone-900 mt-0.5">
                      {trackingData.fechas.fechaEntregaEstimada
                        ? new Date(trackingData.fechas.fechaEntregaEstimada).toLocaleDateString('es-BO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Calculando...'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-white border border-[#E7E1D7] text-[#9B7B54] rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-stone-500 uppercase">Dirección de Destino</div>
                    <div className="text-sm font-semibold text-stone-900 mt-0.5">
                      {trackingData.direccionEntrega}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-white border border-[#E7E1D7] text-[#9B7B54] rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-stone-500 uppercase">Método Seleccionado</div>
                    <div className="text-sm font-bold text-stone-900 mt-0.5">
                      {trackingData.metodoEnvio}
                    </div>
                  </div>
                </div>
              </div>

              {/* Línea de Tiempo (4 Pasos Interactivos) */}
              <div className="p-6 sm:p-8">
                <h3 className="text-lg font-serif font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#9B7B54]" />
                  Etapas de Envío y Despacho
                </h3>

                <div className="relative">
                  {/* Línea de fondo */}
                  <div className="hidden md:block absolute top-5 left-10 right-10 h-1 bg-[#E7E1D7] -z-0" />

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                    {trackingData.timeline.map((step) => {
                      const isComplete = step.completado;
                      const isCurrent = step.actual;

                      return (
                        <div
                          key={step.codigo}
                          className={`flex md:flex-col items-start md:items-center text-left md:text-center p-4 rounded-xl transition ${
                            isCurrent
                              ? 'bg-[#FAF8F5] border border-[#E7E1D7]'
                              : 'bg-white'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 mb-0 md:mb-3 mr-4 md:mr-0 ${
                              isComplete
                                ? 'bg-stone-900 text-[#9B7B54]'
                                : 'bg-stone-100 text-stone-500'
                            } ${isCurrent ? 'ring-4 ring-[#9B7B54]/20 ring-offset-2' : ''}`}
                          >
                            {isComplete ? <CheckCircle2 className="w-5 h-5" /> : step.paso}
                          </div>

                          <div>
                            <div className="text-sm font-bold text-stone-900">{step.titulo}</div>
                            <div className="text-xs text-stone-500 mt-1 leading-relaxed">
                              {step.descripcion}
                            </div>
                            {step.fecha && (
                              <div className="text-xs text-[#9B7B54] font-medium mt-2">
                                {new Date(step.fecha).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mapa Interactivo con Leaflet y OpenStreetMap */}
              <div className="p-6 sm:p-8 bg-[#FAF8F5] border-t border-[#E7E1D7]">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-[#9B7B54]" />
                      Ruta Satelital y Cobertura (OpenStreetMap)
                    </h3>
                    <p className="text-xs text-stone-500">
                      Trazabilidad georreferenciada sin costo de API externa.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-stone-900 text-[#FAF8F5] rounded-lg">
                    En vivo
                  </span>
                </div>

                <div
                  ref={mapContainerRef}
                  className="w-full h-80 rounded-2xl border border-[#E7E1D7] shadow-inner overflow-hidden z-0"
                />
              </div>

              {/* Resumen de los artículos del paquete */}
              <div className="p-6 sm:p-8 bg-white border-t border-slate-200">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Contenido del Paquete ({trackingData.orden.items?.length || 0} prendas)
                </h4>
                <div className="divide-y divide-slate-100">
                  {trackingData.orden.items?.map((item) => (
                    <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                      <div>
                        <span className="font-semibold text-slate-800">{item.nombre}</span>
                        {(item.talla || item.color) && (
                          <span className="text-xs text-slate-500 ml-2">
                            ({item.talla ? `Talla ${item.talla}` : ''} {item.color ? `· ${item.color}` : ''})
                          </span>
                        )}
                        <span className="text-xs text-slate-500 block">Cantidad: {item.cantidad}</span>
                      </div>
                      <div className="font-bold text-slate-900">
                        ${Number(item.subtotal).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#E7E1D7] flex justify-between items-center">
                  <span className="font-bold text-stone-700">Total de la Compra:</span>
                  <span className="text-xl font-serif font-bold text-stone-900">
                    ${Number(trackingData.orden.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default TrackingPage;
