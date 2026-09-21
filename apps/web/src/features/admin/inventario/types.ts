export interface VarianteInventario {
  id: string;
  sku: string;
  stock: number;
  stockMinimo: number;
  precioExtra?: number;
  activa?: boolean;
  estadoStock?: 'AGOTADO' | 'BAJO' | 'OPTIMO';
  diferenciaMinimo?: number;
  producto?: {
    id: string;
    nombre: string;
    precio: string | number;
    categoria?: {
      id: string;
      nombre: string;
    };
    imagenes?: {
      url: string;
      principal?: boolean;
    }[];
  };
  talla?: {
    id?: string;
    nombre: string;
  };
  color?: {
    id?: string;
    nombre: string;
    hex?: string;
  };
}

export type AlertaInventario = VarianteInventario;

export interface InventarioKpis {
  totalVariantes: number;
  totalStock: number;
  stockBajo: number;
  agotados: number;
  stockOptimo: number;
}

export interface AjustarStockPayload {
  operacion: 'AGREGAR' | 'REDUCIR' | 'ESTABLECER';
  cantidad: number;
  motivo: string;
}

export interface ItemStockPayload {
  varianteId: string;
  cantidad: number;
}

export interface ProcesarStockPedidoResultado {
  exito: boolean;
  mensaje: string;
  variantesActualizadas: {
    id: string;
    sku: string;
    stockAnterior: number;
    nuevoStock: number;
  }[];
}
