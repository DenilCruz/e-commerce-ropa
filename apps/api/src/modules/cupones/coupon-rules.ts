import { TipoCupon } from './entities/coupon.entity';

/**
 * When a coupon may be applied and how much it takes off. The cart screen (aplicarCupon) and every payment flow
 * use the same rules, so a coupon rejected on screen cannot be redeemed by calling the payment endpoint directly.
 */
export interface ReglasCupon {
  codigo: string;
  activo: boolean;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  usosMaximos: number | null;
  usosActuales: number;
  montoMinimo: number | string;
  usosPorUsuario: number;
}

/** The reason a coupon cannot be applied to this purchase, or null when it can. */
export const motivoCuponNoAplicable = (
  cupon: ReglasCupon,
  subtotal: number,
  usosDelUsuario: number,
  ahora: Date = new Date(),
): string | null => {
  if (!cupon.activo) return `El cupón "${cupon.codigo}" está actualmente desactivado.`;

  const inicio = new Date(cupon.fechaInicio);
  const fin = new Date(cupon.fechaFin);
  if (ahora < inicio) {
    return `El cupón "${cupon.codigo}" aún no está vigente. Estará disponible a partir del ${inicio.toLocaleDateString()}.`;
  }
  if (ahora > fin) return `El cupón "${cupon.codigo}" ha expirado el ${fin.toLocaleDateString()}.`;

  if (cupon.usosMaximos != null && cupon.usosActuales >= cupon.usosMaximos) {
    return `El cupón "${cupon.codigo}" ha alcanzado el límite máximo de usos permitidos.`;
  }

  const minimo = Number(cupon.montoMinimo);
  if (subtotal < minimo) {
    return `El subtotal de la compra ($${subtotal.toFixed(2)}) no alcanza el monto mínimo requerido de $${minimo.toFixed(2)} para aplicar el cupón "${cupon.codigo}".`;
  }

  if (cupon.usosPorUsuario > 0 && usosDelUsuario >= cupon.usosPorUsuario) {
    return `Ya has utilizado este cupón ${usosDelUsuario} vez/veces. El límite permitido por usuario es ${cupon.usosPorUsuario}.`;
  }
  return null;
};

/** The discount in currency units, never more than the subtotal. */
export const descuentoDeCupon = (cupon: { tipo: TipoCupon | string; valor: number | string }, subtotal: number): number => {
  const valor = Number(cupon.valor);
  const bruto = cupon.tipo === TipoCupon.PORCENTAJE ? (subtotal * valor) / 100 : valor;
  return Number(Math.max(0, Math.min(bruto, subtotal)).toFixed(2));
};
