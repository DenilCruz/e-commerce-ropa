/** Same aliases as the API guard in apps/api/src/modules/autenticacion/roles-acceso.ts. */
export function canonRol(rol?: string | null): string {
  const nombre = (rol ?? '').trim().toUpperCase();
  if (nombre === 'EMPLEADO' || nombre === 'CAJERO') return 'VENDEDOR';
  if (nombre === 'ADMINISTRADOR') return 'ADMIN';
  return nombre;
}

export function esSuperadmin(rol?: string | null): boolean {
  return canonRol(rol) === 'SUPERADMIN';
}

/** Store owner or the platform operator. */
export function esDueno(rol?: string | null): boolean {
  const nombre = canonRol(rol);
  return nombre === 'ADMIN' || nombre === 'SUPERADMIN';
}

/** Anyone who works the store: owner, operator, or seller. */
export function esPersonal(rol?: string | null): boolean {
  const nombre = canonRol(rol);
  return nombre === 'ADMIN' || nombre === 'SUPERADMIN' || nombre === 'VENDEDOR';
}
