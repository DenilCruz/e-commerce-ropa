import { api } from '../../../services/api';

export interface StorePublicPaymentConfig {
  tiendaId: string;
  nombre: string;
  slug: string;
  modalidad: 'MODELO_A_CUSTODIA' | 'MODELO_B_DIRECTO';
  tituloModalidad: string;
  qrUrl: string;
  titularCuenta: string;
  banco: string;
  numeroCuenta: string;
  descripcion: string;
}

export interface StoreAdminPaymentConfig {
  tienda: {
    id: string;
    nombre: string;
    slug: string;
    plan: string;
    qrUrl: string | null;
    titularCuenta: string | null;
    banco: string | null;
    numeroCuenta: string | null;
    modalidadPagoActiva: 'MODELO_A_CUSTODIA' | 'MODELO_B_DIRECTO';
  };
  billeteraCustodia: {
    saldoAcumulado: number;
    totalVentas: number;
    estadoLiquidacion: string;
    descripcion: string;
  };
}

export interface ActualizarConfigPagoPayload {
  qrUrl?: string | null;
  titularCuenta?: string | null;
  banco?: string | null;
  numeroCuenta?: string | null;
}

export const pagosConfigApi = {
  /**
   * Consulta pública de pasarela para el Checkout del cliente.
   */
  obtenerPublica: async (slug?: string): Promise<StorePublicPaymentConfig> => {
    const res = await api.get<StorePublicPaymentConfig>('/auth/tiendas/config-pago-publica', {
      params: slug ? { slug } : undefined,
    });
    return res.data;
  },

  /**
   * Consulta de configuración y saldo acumulado para el administrador de la tienda.
   */
  obtenerAdmin: async (): Promise<StoreAdminPaymentConfig> => {
    const res = await api.get<StoreAdminPaymentConfig>('/auth/tiendas/mi-config-pago');
    return res.data;
  },

  /**
   * Actualiza los datos de cobro de la tienda (Subir QR propio, titular, banco).
   */
  actualizarAdmin: async (payload: ActualizarConfigPagoPayload): Promise<StoreAdminPaymentConfig> => {
    const res = await api.patch<StoreAdminPaymentConfig>('/auth/tiendas/mi-config-pago', payload);
    return res.data;
  },
};
