import { Producto } from '../catalogo/types';

export interface Favorito {
  id: string;
  productoId: string;
  usuarioId: string;
  creadoEn: string;
  producto?: Producto;
}

export interface AgregarFavoritoPayload {
  productoId: string;
  usuarioId: string;
}

export interface MoverFavoritoAlCarritoPayload {
  usuarioId: string;
  productoId: string;
  varianteId?: string;
  cantidad?: number;
  eliminarDeFavoritos?: boolean;
}

export interface MoverFavoritoRespuesta {
  exito: boolean;
  mensaje: string;
  varianteId: string;
  carrito: any;
}
