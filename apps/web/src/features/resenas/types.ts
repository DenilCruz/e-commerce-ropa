export interface UsuarioResena {
  id: string;
  nombre: string;
  apellido?: string;
  foto?: string;
}

export interface Resena {
  id: string;
  productoId: string;
  usuarioId: string;
  notaventaId?: string;
  calificacion: number;
  comentario: string;
  aprobada: boolean;
  creadoEn: string;
  actualizadoEn?: string;
  usuario?: UsuarioResena;
  producto?: {
    id: string;
    nombre: string;
    imagenes?: { url: string }[];
  };
}

export interface ResumenResenas {
  promedio: number;
  total: number;
  distribucion?: { [key: number]: number };
}

export interface CrearResenaPayload {
  productoId: string;
  usuarioId: string;
  calificacion: number;
  comentario?: string;
}

export interface ActualizarResenaPayload {
  usuarioId: string;
  calificacion?: number;
  comentario?: string;
}

export interface EstadoCompraResena {
  puedeCalificar: boolean;
  comproProducto: boolean;
  yaReseno: boolean;
  resenaExistente?: Resena;
}
