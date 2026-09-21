export interface Cupon {
  id: string;
  codigo: string;
  descripcion?: string;
  tipo: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  montoMinimo: number;
  usosMaximos?: number | null;
  usosActuales: number;
  usosPorUsuario: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  creadoEn: string;
}

export interface CrearCuponPayload {
  codigo: string;
  descripcion?: string;
  tipo: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  montoMinimo?: number;
  usosMaximos?: number;
  usosPorUsuario?: number;
  fechaInicio: string;
  fechaFin: string;
  activo?: boolean;
}

export interface AplicarCuponPayload {
  codigo: string;
  subtotal: number;
}
