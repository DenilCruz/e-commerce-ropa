export interface Categoria {
  id: string;
  nombre: string;
  slug?: string;
  descripcion?: string;
  imagen?: string;
  imagenUrl?: string;
  activa?: boolean;
  padre_id?: string | null;
  orden?: number;
  subcategorias?: Categoria[];
  padre?: Categoria | null;
  totalProductos?: number;
  totalProductosDirectos?: number;
  totalSubcategorias?: number;
  esVacia?: boolean;
}

export interface ImagenProducto {
  id: string;
  url: string;
  principal: boolean;
  esPrincipal?: boolean;
}

export interface Talla {
  id: string;
  nombre: string;
}

export interface Color {
  id: string;
  nombre: string;
  hex: string;
}

export interface VarianteProducto {
  id: string;
  sku: string;
  precio: string | number;
  precioExtra?: string | number;
  stock: number;
  talla?: Talla;
  color?: Color;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  destacado: boolean;
  activo?: boolean;
  precio: string | number;
  categoriaId?: string;
  categoria: Categoria;
  imagenes: ImagenProducto[];
  variantes: VarianteProducto[];
}
