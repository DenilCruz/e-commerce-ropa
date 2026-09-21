export interface CartItemProduct {
  id: string;
  nombre: string;
  precioBase: number;
  imagen: string | null;
}

export interface CartItemTalla {
  id: string;
  nombre: string;
}

export interface CartItemColor {
  id: string;
  nombre: string;
}

export interface CartItem {
  id?: string;
  varianteId: string;
  productoId?: string;
  tallaId?: string;
  colorId?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  stockDisponible: number;
  stockSuficiente?: boolean;
  producto: CartItemProduct;
  talla: CartItemTalla | null;
  color: CartItemColor | null;
}

export interface Cart {
  id?: string;
  usuarioId?: string;
  items: CartItem[];
  totalItems: number;
  total: number;
  actualizadoEn?: string;
}

export interface CuponAplicado {
  id: string;
  codigo: string;
  descripcion?: string;
  tipo: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  montoMinimo?: number;
}

export interface AplicarCuponResponse {
  valido: boolean;
  cupon: CuponAplicado;
  subtotal: number;
  descuento: number;
  totalConDescuento: number;
  mensaje: string;
}
