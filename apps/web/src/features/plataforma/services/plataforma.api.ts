import { api } from '../../../services/api';
import { limpiarParametros } from '../lib/formato';
import {
  FiltrosSuscripciones,
  FiltrosTiendas,
  Pagina,
  ResumenPlataforma,
  SuscripcionPlataforma,
  TiendaPlataforma,
} from '../types';

export const plataformaApi = {
  resumen: async (): Promise<ResumenPlataforma> => (await api.get<ResumenPlataforma>('/plataforma/resumen')).data,

  tiendas: async (filtros: FiltrosTiendas): Promise<Pagina<TiendaPlataforma>> =>
    (await api.get<Pagina<TiendaPlataforma>>('/plataforma/tiendas', { params: limpiarParametros(filtros) })).data,

  suscripciones: async (filtros: FiltrosSuscripciones): Promise<Pagina<SuscripcionPlataforma>> =>
    (await api.get<Pagina<SuscripcionPlataforma>>('/plataforma/suscripciones', { params: limpiarParametros(filtros) })).data,

  suspender: async (id: string) => (await api.post(`/plataforma/tiendas/${id}/suspender`)).data,

  reactivar: async (id: string) => (await api.post(`/plataforma/tiendas/${id}/reactivar`)).data,
};

/** Message of a failed request, whether the API sent one text or a list of validation messages. */
export function mensajeDeError(err: any): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join('. ');
  return message || 'No se pudo completar la operación. Inténtalo de nuevo.';
}
