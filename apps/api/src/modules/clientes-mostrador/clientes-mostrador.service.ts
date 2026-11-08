import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../../common/tenant/tenant-context';
import { ClienteMostradorEntity } from './entities/cliente-mostrador.entity';
import { ClienteMostradorDto } from './dto/cliente-mostrador.dto';
import { upsertarClienteMostrador } from './cliente-mostrador.upsert';

export const LIMITE_MAXIMO = 200;
export const LIMITE_POR_DEFECTO = 50;

/** Walk-in customers: people who buy at the counter and have no account. */
@Injectable()
export class ClientesMostradorService {
  constructor(
    @InjectRepository(ClienteMostradorEntity)
    private readonly repo: Repository<ClienteMostradorEntity>,
  ) {}

  private get tid(): string {
    return TenantContext.require();
  }

  /**
   * Saves a customer created on a device. The same id again answers with the stored row (`creado: false`),
   * so a retried request is harmless; another id with the same ci is a 409 CLIENTE_DUPLICADO.
   */
  async crear(dto: ClienteMostradorDto) {
    const resultado = await upsertarClienteMostrador(this.repo.manager, this.tid, dto);
    if (resultado.tipo === 'CI_DUPLICADO') {
      const { id, nombre, ci } = resultado.cliente;
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        codigo: 'CLIENTE_DUPLICADO',
        message: 'Ya existe un cliente con ese CI en esta tienda.',
        existente: { id, nombre, ci },
      });
    }
    return { creado: resultado.tipo === 'CREADO', cliente: resultado.cliente };
  }

  async listar(busqueda?: string, limite?: number) {
    const tamano = Math.min(Math.max(Math.trunc(Number(limite)) || LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.tenantId = :tid', { tid: this.tid })
      .orderBy('c.nombre', 'ASC')
      .addOrderBy('c.creadoEn', 'DESC')
      .limit(tamano);

    const texto = busqueda?.trim();
    if (texto) {
      qb.andWhere(
        `(c.nombre ILIKE :q OR c.apellido ILIKE :q OR c.ci ILIKE :q OR c.celular ILIKE :q OR c.correo ILIKE :q)`,
        { q: `%${texto.replace(/[\\%_]/g, '\\$&')}%` },
      );
    }
    return qb.getMany();
  }
}
