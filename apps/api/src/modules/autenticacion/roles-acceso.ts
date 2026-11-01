/** Canonical role name used by the guard. EMPLEADO and CAJERO sell; ADMINISTRADOR owns. */
export function canonRol(rol: string | null | undefined): string {
  const nombre = (rol ?? '').trim().toUpperCase();
  if (nombre === 'EMPLEADO' || nombre === 'CAJERO') return 'VENDEDOR';
  if (nombre === 'ADMINISTRADOR') return 'ADMIN';
  return nombre;
}

/**
 * SUPERADMIN passes any list. Everyone else must match after the alias.
 * A client route does not open for a higher role unless that role is listed
 * or the caller is the platform operator.
 */
export function rolAutorizado(rol: string | null | undefined, requeridos: string[]): boolean {
  if (!requeridos || requeridos.length === 0) return true;
  const actual = canonRol(rol);
  if (actual === 'SUPERADMIN') return true;
  return requeridos.some((pedido) => canonRol(pedido) === actual);
}
