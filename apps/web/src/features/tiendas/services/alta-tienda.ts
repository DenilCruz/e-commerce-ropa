import type { SesionTiendaResponse } from '../types';
import { esPlanDePago, type AltaPendiente } from '../utils/planes';
import { planesApi } from './planes.api';
import { tiendasApi } from './tiendas.api';

export type ResultadoAlta =
  /** A paid plan: the store does not exist yet; it is created when the payment is approved on this page. */
  | { destino: 'PASARELA'; url: string }
  /** The free trial: the store exists right away and the session is already inside it. */
  | { destino: 'TIENDA'; sesion: SesionTiendaResponse };

/** Starts the store the visitor asked for at sign-up: straight away if it is free, after paying if it is not. */
export async function iniciarAltaDeTienda(alta: AltaPendiente): Promise<ResultadoAlta> {
  if (esPlanDePago(alta.plan)) {
    const compra = await planesApi.crearAltaTienda(alta.nombre, alta.plan, alta.periodo);
    return { destino: 'PASARELA', url: compra.url };
  }
  return { destino: 'TIENDA', sesion: await tiendasApi.crear({ nombre: alta.nombre, plan: alta.plan }) };
}
