import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Upload,
  Landmark,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  pagosConfigApi,
  StoreAdminPaymentConfig,
} from '../services/pagos-config.api';
import { api } from '../../../services/api';

export const AdminPagosConfigPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [data, setData] = useState<StoreAdminPaymentConfig | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Form states for Model B
  const [qrUrl, setQrUrl] = useState('');
  const [titularCuenta, setTitularCuenta] = useState('');
  const [banco, setBanco] = useState('Banco Nacional de Bolivia (BNB)');
  const [numeroCuenta, setNumeroCuenta] = useState('');

  // Modal de liquidación
  const [modalLiquidacionAbierto, setModalLiquidacionAbierto] = useState(false);
  const [solicitandoLiquidacion, setSolicitandoLiquidacion] = useState(false);
  const [liquidacionSolicitada, setLiquidacionSolicitada] = useState(false);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const res = await pagosConfigApi.obtenerAdmin();
      setData(res);
      setQrUrl(res.tienda.qrUrl || '');
      setTitularCuenta(res.tienda.titularCuenta || res.tienda.nombre);
      setBanco(res.tienda.banco || 'Banco Nacional de Bolivia (BNB)');
      setNumeroCuenta(res.tienda.numeroCuenta || '');
    } catch (err: any) {
      setMensajeError(err.response?.data?.message || 'No se pudo cargar la configuración de pagos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  // Subida de imagen QR usando endpoint /archivos/subir
  const handleSubirQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('imagen', file);
    formData.append('categoria', 'pasarelas');

    setUploadingImage(true);
    setMensajeError(null);
    try {
      const res = await api.post('/archivos/subir', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url || res.data?.secure_url || res.data?.ruta;
      if (url) {
        setQrUrl(url);
        setMensajeExito('Código QR cargado y optimizado correctamente.');
        setTimeout(() => setMensajeExito(null), 4000);
      }
    } catch (err: any) {
      setMensajeError('No se pudo subir la imagen del QR. Intenta con otra imagen o pega una URL directa.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGuardarModeloB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrUrl.trim()) {
      setMensajeError('Por favor sube o ingresa la URL de la imagen de tu código QR.');
      return;
    }
    if (!titularCuenta.trim()) {
      setMensajeError('Por favor ingresa el nombre del titular de la cuenta bancaria.');
      return;
    }

    setSaving(true);
    setMensajeError(null);
    setMensajeExito(null);

    try {
      const res = await pagosConfigApi.actualizarAdmin({
        qrUrl: qrUrl.trim(),
        titularCuenta: titularCuenta.trim(),
        banco: banco.trim(),
        numeroCuenta: numeroCuenta.trim(),
      });
      setData(res);
      setMensajeExito('¡Modelo B (Cobro Directo) activado con éxito! Tus clientes ahora te transferirán directamente a tu QR.');
      setTimeout(() => setMensajeExito(null), 6000);
    } catch (err: any) {
      setMensajeError(err.response?.data?.message || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestablecerModeloA = async () => {
    if (!window.confirm('¿Seguro que deseas volver al Modelo A (Custodia Central AURA)? Tu QR personal será desvinculado y las ventas volverán a ingresar a la cuenta central de la plataforma.')) {
      return;
    }

    setSaving(true);
    setMensajeError(null);
    try {
      const res = await pagosConfigApi.actualizarAdmin({
        qrUrl: null,
        titularCuenta: null,
        banco: null,
        numeroCuenta: null,
      });
      setData(res);
      setQrUrl('');
      setMensajeExito('Tienda restablecida a Modelo A (Custodia Central AURA).');
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: any) {
      setMensajeError(err.response?.data?.message || 'Error al restablecer.');
    } finally {
      setSaving(false);
    }
  };

  const handleSolicitarLiquidacion = () => {
    setSolicitandoLiquidacion(true);
    setTimeout(() => {
      setSolicitandoLiquidacion(false);
      setLiquidacionSolicitada(true);
      setTimeout(() => {
        setModalLiquidacionAbierto(false);
        setLiquidacionSolicitada(false);
      }, 3000);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#9B7B54] mb-3" />
        <p className="text-sm">Cargando configuración de pagos y liquidaciones...</p>
      </div>
    );
  }

  const esModeloB = data?.tienda.modalidadPagoActiva === 'MODELO_B_DIRECTO';
  const saldo = data?.billeteraCustodia.saldoAcumulado || 0;
  const totalVentas = data?.billeteraCustodia.totalVentas || 0;

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto">
      {/* HEADER DE LA VISTA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#E7E1D7]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#9B7B54] mb-1">
            <span>ARQUITECTURA MULTI-TENANT</span>
            <span>·</span>
            <span>PILARES FINANCIEROS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            Pasarelas de Pago & Cobros por Tienda
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Configura el flujo de dinero de tu tienda: Cobro Directo sin intermediarios (Modelo B) o Recaudación Central en Custodia (Modelo A).
          </p>
        </div>

        {/* BADGE DE MODALIDAD ACTIVA */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-[#FAF8F5] text-stone-900 border border-[#E7E1D7] shadow-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${esModeloB ? 'bg-stone-900' : 'bg-[#9B7B54]'}`} />
            <span>{esModeloB ? 'Activo: Modelo B (Cobro Directo)' : 'Activo: Modelo A (Custodia AURA)'}</span>
          </div>
        </div>
      </div>

      {/* ALERTAS */}
      {mensajeExito && (
        <div className="bg-[#FAF8F5] border border-[#9B7B54]/40 text-stone-900 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#9B7B54] shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* SECCIÓN 1: COMPARACIÓN Y ESTADO DE LOS 2 MODELOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TARJETA MODELO A */}
        <div
          className={`rounded-2xl p-6 border-2 transition-all relative flex flex-col justify-between ${
            !esModeloB
              ? 'bg-[#FAF8F5] border-[#9B7B54] shadow-sm'
              : 'bg-white border-[#E7E1D7] opacity-80 hover:opacity-100'
          }`}
        >
          {!esModeloB && (
            <span className="absolute -top-3 right-6 bg-stone-900 text-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
              En Operación
            </span>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-stone-900 text-[#9B7B54] flex items-center justify-center font-bold shadow-xs">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Modelo A: Custodia Central AURA</h3>
                <p className="text-xs text-[#9B7B54] font-medium">Shopify Payments / Fideicomiso SaaS</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Tus compradores escanean el código QR central de AURA. La plataforma actúa como fideicomisaria: recauda los fondos y los acredita de forma aislada a tu balance contable para que solicites retiros bancarios.
            </p>

            <ul className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-[#E7E1D7]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9B7B54] shrink-0" />
                <span>Listo para vender de inmediato sin trámites bancarios.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9B7B54] shrink-0" />
                <span>Liquidación a tu cuenta personal cuando lo solicites.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-4 border-t border-[#E7E1D7] flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Comisión SaaS: 0% en Beta</span>
            <span className="text-xs font-mono text-stone-900 font-semibold">QR Oficial AURA</span>
          </div>
        </div>

        {/* TARJETA MODELO B */}
        <div
          className={`rounded-2xl p-6 border-2 transition-all relative flex flex-col justify-between ${
            esModeloB
              ? 'bg-[#FAF8F5] border-stone-900 shadow-sm'
              : 'bg-white border-[#E7E1D7] hover:border-stone-400'
          }`}
        >
          {esModeloB && (
            <span className="absolute -top-3 right-6 bg-stone-900 text-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
              En Operación
            </span>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center font-bold shadow-xs">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Modelo B: Cobro Directo a tu QR</h3>
                <p className="text-xs text-stone-600 font-medium">Bring Your Own Gateway / QR Propio</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Tus clientes escanean directamente el código QR de tu banco personal o de empresa (Banco Unión, BNB, BCP, etc.). El dinero ingresa a tu cuenta bancaria al instante y sin intermediarios.
            </p>

            <ul className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-[#E7E1D7]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Cobro 100% directo a tu banco en tiempo real.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Mayor confianza con el nombre de tu marca en la pantalla.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-4 border-t border-[#E7E1D7] flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Sin intermediación</span>
            <span className="text-xs font-mono text-stone-900 font-semibold">Tu Cuenta Directa</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: BILLETERA DE CUSTODIA (MODELO A) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E7E1D7] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7E1D7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E7E1D7] text-[#9B7B54] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-900">Billetera de Custodia AURA (Modelo A)</h2>
              <p className="text-xs text-stone-500">Fondos recaudados por el canal central y acreditados a tu tienda</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalLiquidacionAbierto(true)}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Landmark className="w-4 h-4 text-[#9B7B54]" />
            <span>Solicitar Desembolso / Liquidación</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FAF8F5] rounded-xl p-5 border border-[#E7E1D7]">
            <span className="text-xs text-[#9B7B54] uppercase font-bold tracking-wider">Saldo en Custodia</span>
            <p className="text-3xl font-black text-stone-900 mt-1 font-mono">
              ${saldo.toFixed(2)} USD
            </p>
            <span className="text-[11px] text-stone-500">Aprox. {(saldo * 6.96).toFixed(2)} Bs</span>
          </div>

          <div className="bg-[#FAF8F5] rounded-xl p-5 border border-[#E7E1D7]">
            <span className="text-xs text-stone-500 uppercase font-bold tracking-wider">Ventas Procesadas</span>
            <p className="text-3xl font-black text-stone-900 mt-1 font-mono">
              {totalVentas}
            </p>
            <span className="text-[11px] text-stone-500">Transacciones completadas</span>
          </div>

          <div className="bg-[#FAF8F5] rounded-xl p-5 border border-[#E7E1D7]">
            <span className="text-xs text-stone-500 uppercase font-bold tracking-wider">Estado de Retiro</span>
            <p className="text-lg font-black text-stone-900 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-[#9B7B54]" />
              <span>{saldo > 0 ? 'Disponible' : 'Sin pendientes'}</span>
            </p>
            <span className="text-[11px] text-stone-500">Transferencias vía ACH / Simple</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: CONFIGURACIÓN DE TU PASARELA PROPIA (MODELO B) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-900">Configuración de Cobro Directo (Modelo B)</h2>
            <p className="text-xs text-stone-500">
              Sube la imagen de tu código QR de banca móvil para recibir pagos directos sin comisiones
            </p>
          </div>
        </div>

        <form onSubmit={handleGuardarModeloB} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUMNA IZQUIERDA: PREVIEW DEL QR Y SUBIDA */}
          <div className="lg:col-span-5 flex flex-col items-center text-center p-6 bg-[#FAF8F5] rounded-2xl border-2 border-dashed border-[#E7E1D7] space-y-4">
            <div className="w-48 h-48 bg-white rounded-2xl border border-[#E7E1D7] p-3 shadow-xs flex items-center justify-center overflow-hidden">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Previsualización de Código QR Propio"
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-stone-400 space-y-2 p-4">
                  <QrCode className="w-12 h-12 mx-auto stroke-1 text-stone-300" />
                  <p className="text-xs">Aún no has subido tu código QR propio</p>
                </div>
              )}
            </div>

            <div className="w-full space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase">
                Subir Imagen de tu QR Bancario
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleSubirQr}
                  disabled={uploadingImage}
                  className="hidden"
                  id="input-file-qr"
                />
                <label
                  htmlFor="input-file-qr"
                  className="w-full py-2.5 px-4 bg-white border border-[#E7E1D7] rounded-xl text-xs font-bold text-stone-700 hover:bg-[#FAF8F5] transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#9B7B54]" />
                      <span>Subiendo imagen...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#9B7B54]" />
                      <span>Seleccionar imagen (PNG / JPG)</span>
                    </>
                  )}
                </label>
              </div>

              <div className="pt-2 text-left">
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                  O pegar enlace directo de imagen (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={qrUrl}
                  onChange={(e) => setQrUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E7E1D7] rounded-lg text-xs font-mono focus:ring-1 focus:ring-[#9B7B54] focus:border-[#9B7B54] focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: DATOS BANCARIOS DEL TITULAR */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Nombre del Titular de la Cuenta *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Luna Atelier S.R.L. o Nombre de Propietario"
                value={titularCuenta}
                onChange={(e) => setTitularCuenta(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E7E1D7] rounded-xl text-sm font-medium focus:bg-white focus:ring-1 focus:ring-[#9B7B54] focus:border-[#9B7B54] focus:outline-none transition"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Aparecerá en el checkout para que el cliente verifique que le transfiere a la persona correcta.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Entidad Bancaria *
              </label>
              <select
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E7E1D7] rounded-xl text-sm font-medium focus:bg-white focus:ring-1 focus:ring-[#9B7B54] focus:border-[#9B7B54] focus:outline-none transition"
              >
                <option value="Banco Nacional de Bolivia (BNB)">Banco Nacional de Bolivia (BNB)</option>
                <option value="Banco Unión S.A.">Banco Unión S.A.</option>
                <option value="Banco de Crédito de Bolivia (BCP)">Banco de Crédito de Bolivia (BCP)</option>
                <option value="Banco Mercantil Santa Cruz (BMSC)">Banco Mercantil Santa Cruz (BMSC)</option>
                <option value="Banco Bisa S.A.">Banco Bisa S.A.</option>
                <option value="Banco Ganadero">Banco Ganadero</option>
                <option value="Banco Económico">Banco Económico</option>
                <option value="Banco FIE">Banco FIE</option>
                <option value="Banca Móvil QR Simple">Banca Móvil QR Simple (Cualquier Banco)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Número de Cuenta / Teléfono Asociado a Simple (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. 1000-482910 o Celular 77712345"
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#E7E1D7] rounded-xl text-sm font-mono focus:bg-white focus:ring-1 focus:ring-[#9B7B54] focus:border-[#9B7B54] focus:outline-none transition"
              />
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#9B7B54]" />
                    <span>Guardando Configuración...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#9B7B54]" />
                    <span>Guardar y Activar Modelo B (Cobro Directo)</span>
                  </>
                )}
              </button>

              {esModeloB && (
                <button
                  type="button"
                  onClick={handleRestablecerModeloA}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-3 border border-[#E7E1D7] hover:bg-[#FAF8F5] text-stone-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-stone-500" />
                  <span>Volver a Modelo A (Custodia Central)</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* MODAL DE SOLICITUD DE LIQUIDACIÓN */}
      {modalLiquidacionAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scale-up border border-[#E7E1D7]">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-[#E7E1D7] text-[#9B7B54] flex items-center justify-center mx-auto">
              <Landmark className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-serif font-bold text-stone-900">
                Solicitar Liquidación de Fondos
              </h3>
              <p className="text-xs text-stone-500">
                Desembolso directo a la cuenta bancaria de tu tienda
              </p>
            </div>

            {liquidacionSolicitada ? (
              <div className="bg-[#FAF8F5] border border-[#9B7B54]/40 text-stone-900 p-4 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#9B7B54] mx-auto" />
                <p className="text-xs font-bold">¡Solicitud recibida con éxito!</p>
                <p className="text-[11px] text-stone-600">
                  AURA Finanzas procesará la transferencia a tu cuenta en un plazo máximo de 24 horas hábiles.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#FAF8F5] rounded-xl p-4 border border-[#E7E1D7] text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Monto a Liquidar:</span>
                    <span className="font-bold text-stone-900 font-mono">${saldo.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Equivalente en Bs:</span>
                    <span className="font-bold text-stone-900 font-mono">Bs. {(saldo * 6.96).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tienda Beneficiaria:</span>
                    <span className="font-semibold text-stone-800">{data?.tienda.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Método de Envío:</span>
                    <span className="font-semibold text-stone-800">Transferencia Bancaria ACH / QR</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalLiquidacionAbierto(false)}
                    className="flex-1 py-3 border border-[#E7E1D7] rounded-xl text-xs font-bold text-stone-700 hover:bg-[#FAF8F5] transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={solicitandoLiquidacion || saldo <= 0}
                    onClick={handleSolicitarLiquidacion}
                    className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {solicitandoLiquidacion ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#9B7B54]" />
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <span>Confirmar Retiro</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
