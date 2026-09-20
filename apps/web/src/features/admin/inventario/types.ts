export interface AlertaInventario {
  id: string;
  sku: string;
  stock: number;
  stockMinimo: number;
  producto?: {
    id: string;
    nombre: string;
    precio: string;
  };
  talla?: {
    nombre: string;
  };
  color?: {
    nombre: string;
  };
}

export interface AjustarStockPayload {
  operacion: 'AGREGAR' | 'REDUCIR';
  cantidad: number;
  motivo: string;
}
