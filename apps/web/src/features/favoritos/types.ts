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
