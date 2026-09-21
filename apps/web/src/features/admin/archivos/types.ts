export interface ArchivoMultimedia {
  id?: string;
  nombreOriginal?: string;
  nombreArchivo: string;
  url: string;
  publicId?: string;
  formato: string;
  tamanio: number;
  tamanioOriginal?: number;
  porcentajeAhorro?: number;
  almacenamiento: 'cloudinary' | 'local';
  categoria: string;
  creadoEn?: string;
  enUso?: boolean;
  vinculadoA?: string | null;
}

export interface EstadoCloudinary {
  configurado: boolean;
  cloudName?: string;
  modoPorDefecto: 'cloudinary' | 'local';
}

export interface ResultadoSubida {
  id?: string;
  url: string;
  nombre: string;
  nombreOriginal?: string;
  publicId?: string;
  formato: string;
  tamanio: number;
  tamanioOriginal?: number;
  porcentajeAhorro?: number;
  almacenamiento: 'cloudinary' | 'local';
  categoria: string;
}

export interface ResultadoLimpieza {
  exito: boolean;
  totalEliminados: number;
  mensaje: string;
}
