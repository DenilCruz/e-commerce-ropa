import { esSuperadmin } from '../../../lib/roles';

export type DecisionAcceso = 'login' | 'inicio' | 'permitir';

/** Console access: unauthenticated visitors log in, everyone but the platform operator goes home. */
export function decidirAccesoPlataforma(estado: { isAuthenticated: boolean; rol?: string | null }): DecisionAcceso {
  if (!estado.isAuthenticated) return 'login';
  return esSuperadmin(estado.rol) ? 'permitir' : 'inicio';
}

const CLAVE_EN_TIENDA = 'aura_operador_en_tienda';

/** The operator chose to work inside a store: /admin stops redirecting to the console until they return to it. */
export function marcarEntradaATienda(valor: boolean): void {
  try {
    if (valor) sessionStorage.setItem(CLAVE_EN_TIENDA, '1');
    else sessionStorage.removeItem(CLAVE_EN_TIENDA);
  } catch {
    /* storage unavailable: the redirect simply keeps pointing at the console */
  }
}

function operadorEnTienda(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_EN_TIENDA) === '1';
  } catch {
    return false;
  }
}

/** Where /admin leads: the operator lands on the console unless they came from it into a store. */
export function destinoEntradaAdmin(rol?: string | null, enTienda: boolean = operadorEnTienda()): 'plataforma' | 'dashboard' {
  return esSuperadmin(rol) && !enTienda ? 'plataforma' : 'dashboard';
}
