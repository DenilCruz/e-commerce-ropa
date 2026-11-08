import { EntityManager } from 'typeorm';
import { ClienteMostradorDto } from './dto/cliente-mostrador.dto';

export interface ClienteMostrador {
  id: string;
  nombre: string;
  apellido: string | null;
  celular: string | null;
  ci: string | null;
  correo: string | null;
  creadoEn: Date;
}

export type ResultadoUpsertCliente =
  /** The id was new and the row was written. */
  | { tipo: 'CREADO'; cliente: ClienteMostrador }
  /** The id already existed in this store: nothing was written (idempotent replay). */
  | { tipo: 'EXISTENTE'; cliente: ClienteMostrador }
  /** Another id already owns this ci. `cliente` is that existing row. */
  | { tipo: 'CI_DUPLICADO'; cliente: ClienteMostrador };

const COLUMNAS = `id, nombre, apellido, celular, ci, correo, creado_en AS "creadoEn"`;

/** Empty strings and blanks are "not given"; the ci is what identifies a person, so it is trimmed. */
const limpio = (valor?: string | null): string | null => {
  const texto = valor?.trim();
  return texto ? texto : null;
};

/**
 * The single rule for saving a counter customer, shared by POST /clientes-mostrador and the POS sale so
 * both behave identically: idempotent by id, unique by ci within the store, race-safe (a conflicting
 * insert writes nothing instead of aborting the surrounding transaction). It never overwrites an
 * existing row: an id that is already there wins, and a ci that is already there is reported to the caller.
 * Runs on whatever manager it receives, so the sale can use it inside its own transaction.
 */
export async function upsertarClienteMostrador(
  manager: EntityManager,
  tenantId: string,
  dto: ClienteMostradorDto,
): Promise<ResultadoUpsertCliente> {
  const buscarPorId = async () =>
    (await manager.query(`SELECT ${COLUMNAS} FROM cliente_mostrador WHERE tenant_id = $1 AND id = $2`, [
      tenantId,
      dto.id,
    ])) as ClienteMostrador[];

  const [porId] = await buscarPorId();
  if (porId) return { tipo: 'EXISTENTE', cliente: porId };

  const ci = limpio(dto.ci);
  // ON CONFLICT DO NOTHING (any unique index): a concurrent insert of the same id or ci returns no row
  const insertado = (await manager.query(
    `INSERT INTO cliente_mostrador (id, tenant_id, nombre, apellido, celular, ci, correo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING
     RETURNING ${COLUMNAS}`,
    [dto.id, tenantId, dto.nombre.trim(), limpio(dto.apellido), limpio(dto.celular), ci, limpio(dto.correo)],
  )) as ClienteMostrador[];
  if (insertado.length) return { tipo: 'CREADO', cliente: insertado[0] };

  // Nothing was written: either the same id raced in, or the ci belongs to another customer
  const [carrera] = await buscarPorId();
  if (carrera) return { tipo: 'EXISTENTE', cliente: carrera };

  const [porCi] = (await manager.query(
    `SELECT ${COLUMNAS} FROM cliente_mostrador WHERE tenant_id = $1 AND ci = $2`,
    [tenantId, ci],
  )) as ClienteMostrador[];
  if (porCi) return { tipo: 'CI_DUPLICADO', cliente: porCi };

  // Should not happen (the row vanished between statements); let the caller retry
  throw new Error('No se pudo guardar el cliente; reintenta.');
}
