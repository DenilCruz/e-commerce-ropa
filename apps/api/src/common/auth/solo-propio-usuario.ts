import { ForbiddenException } from '@nestjs/common';

/**
 * The user an action is performed for is always the one in the session token. A request may still name a
 * user (the clients always sent their own id) but it must be the same one: nobody acts on behalf of another.
 * Returns the user the service has to use.
 */
export function exigirMismoUsuario(usuarioSolicitado: string | undefined | null, usuarioDelToken: string | undefined | null): string {
  if (!usuarioDelToken) {
    throw new ForbiddenException('No se pudo identificar al usuario de la sesión.');
  }
  if (usuarioSolicitado && usuarioSolicitado !== usuarioDelToken) {
    throw new ForbiddenException('No puedes actuar en nombre de otro usuario.');
  }
  return usuarioDelToken;
}
