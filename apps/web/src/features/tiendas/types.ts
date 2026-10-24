import { AuthResponse } from '../autenticacion/types';

export interface MiTienda {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  rol: string;
  esActiva: boolean;
}

export interface SesionTiendaResponse extends AuthResponse {
  tienda?: { id: string; nombre: string; slug: string; plan: string };
}

export interface CrearTiendaRequest {
  nombre: string;
}
