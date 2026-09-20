export interface UsuarioResena {
  id: string;
  nombre: string;
}

export interface Resena {
  id: string;
  productoId: string;
  usuarioId: string;
  calificacion: number;
  comentario: string;
  aprobada: boolean;
  creadoEn: string;
  usuario?: UsuarioResena;
}

export interface ResumenResenas {
  promedio: number;
  total: number;
}

export interface CrearResenaPayload {
  productoId: string;
  usuarioId: string;
  calificacion: number;
  comentario: string;
}
