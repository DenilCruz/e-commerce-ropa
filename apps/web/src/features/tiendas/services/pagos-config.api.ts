import { api } from '../../../services/api';

export interface DatosLiquidacion {
  titularCuenta: string;
  banco: string;
  numeroCuenta: string;
}

export interface StoreAdminPaymentConfig {
  tienda: {
    nombre: string;
    titularCuenta: string | null;
    banco: string | null;
    numeroCuenta: string | null;
  };
  billeteraSimulada: {
    saldoAcumulado: number;
    totalVentas: number;
    totalStripePrueba: number;
  };
  movimientos: Array<{ referencia: string; tipo: 'VENTA' | 'RETIRO'; origen: 'QR' | 'STRIPE_PRUEBA' | 'RETIRO'; monto: number; creadoEn: string }>;
}

export const pagosConfigApi = {
  obtenerAdmin: async (): Promise<StoreAdminPaymentConfig> => {
    const res = await api.get<StoreAdminPaymentConfig>('/auth/tiendas/mi-config-pago');
    return res.data;
  },

  actualizarAdmin: async (datos: DatosLiquidacion): Promise<StoreAdminPaymentConfig> => {
    const res = await api.patch<StoreAdminPaymentConfig>('/auth/tiendas/mi-config-pago', datos);
    return res.data;
  },

  simularRetiro: async (solicitudId: string): Promise<{ referencia: string; monto: number }> => {
    const res = await api.post('/auth/tiendas/retiro-simulado', { solicitudId });
    return res.data;
  },
};
