export interface ResenaAdmin {
  id: string;
  productoId: string;
  usuarioId: string;
  calificacion: number;
  comentario: string;
  aprobada: boolean;
  creadoEn: string;
  usuario?: {
    id: string;
    nombre: string;
    apellido?: string;
    correo: string;
    foto?: string;
  };
  producto?: {
    id: string;
    nombre: string;
    imagenes?: { url: string }[];
  };
}

export interface ResenasKpisAdmin {
  totalResenas: number;
  promedioGlobal: number;
  resenasOcultas: number;
}
