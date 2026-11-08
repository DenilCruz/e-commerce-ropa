import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StoreEntity } from '../tiendas/entities/store.entity';
import { TenantResolverService } from '../tiendas/tenant-resolver.service';
import { PLANES_CONFIG, TipoPlan } from '../tiendas/plan-limits.service';
import { ListarSuscripcionesQueryDto, ListarTiendasQueryDto } from './dto/consulta-plataforma.dto';

/** The platform's own store: it hosts the operator account and can never be suspended. */
export const TIENDA_BASE_ID = 'a0a0a0a0-0000-4000-8000-000000000001';

export interface SuscripcionVigente {
  plan: string;
  periodo: string;
  cantidad: number;
}

/** Monthly recurring revenue in USD. An annual plan counts its per-month price (annual charge / 12). */
export function calcularMrr(vigentes: SuscripcionVigente[]): number {
  const total = vigentes.reduce((suma, fila) => {
    const config = PLANES_CONFIG[fila.plan as TipoPlan];
    if (!config) return suma;
    const mensual = fila.periodo === 'ANUAL' ? config.precioAnual : config.precioMensual;
    return suma + mensual * Number(fila.cantidad);
  }, 0);
  return Math.round(total * 100) / 100;
}

function paginar(dto: { pagina?: number; limite?: number }) {
  const pagina = dto.pagina ?? 1;
  const limite = dto.limite ?? 20;
  return { pagina, limite, offset: (pagina - 1) * limite };
}

/**
 * Cross-tenant reads go through SECURITY DEFINER functions (database/16_plataforma.sql): the API role
 * stays subject to row-level security and the functions return only the aggregates shown in the console.
 */
@Injectable()
export class PlataformaService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    private readonly resolver: TenantResolverService,
  ) {}

  async resumen() {
    const [fila] = await this.dataSource.query('SELECT plataforma_resumen() AS datos');
    const datos = fila?.datos ?? {};
    const vigentes: SuscripcionVigente[] = datos.suscripcionesVigentes ?? [];
    return {
      tiendasTotal: Number(datos.tiendasTotal ?? 0),
      porEstado: this.numeros(datos.porEstado),
      porPlan: this.numeros(datos.porPlan),
      nuevas30d: Number(datos.nuevas30d ?? 0),
      mrrUsd: calcularMrr(vigentes),
      ingresosMesUsd: Number(datos.ingresosMesUsd ?? 0),
      suscripcionesVigentes: vigentes.reduce((n, f) => n + Number(f.cantidad), 0),
    };
  }

  async listarTiendas(query: ListarTiendasQueryDto) {
    const { pagina, limite, offset } = paginar(query);
    const filas: any[] = await this.dataSource.query(
      'SELECT * FROM plataforma_listar_tiendas($1, $2, $3, $4, $5)',
      [query.busqueda?.trim() || null, query.plan ?? null, query.estado ?? null, limite, offset],
    );
    return {
      items: filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        slug: f.slug,
        plan: f.plan,
        estado: f.estado,
        propietarioCorreo: f.propietario_correo,
        usuarios: Number(f.usuarios),
        productos: Number(f.productos),
        pedidos: Number(f.pedidos),
        venceEn: f.vence_en,
        creadoEn: f.creado_en,
        esBase: f.id === TIENDA_BASE_ID,
      })),
      ...this.paginacion(filas, pagina, limite),
    };
  }

  async listarSuscripciones(query: ListarSuscripcionesQueryDto) {
    const { pagina, limite, offset } = paginar(query);
    const filas: any[] = await this.dataSource.query(
      'SELECT * FROM plataforma_listar_suscripciones($1, $2, $3)',
      [query.estado ?? null, limite, offset],
    );
    return {
      items: filas.map((f) => ({
        id: f.id,
        tiendaId: f.tienda_id,
        tiendaNombre: f.tienda_nombre,
        plan: f.plan,
        periodo: f.periodo,
        monto: Number(f.monto),
        moneda: String(f.moneda).toUpperCase(),
        estado: f.estado,
        inicioEn: f.inicio_en,
        venceEn: f.vence_en,
        creadoEn: f.creado_en,
      })),
      ...this.paginacion(filas, pagina, limite),
    };
  }

  suspender(tiendaId: string, operadorId: string) {
    return this.cambiarEstado(tiendaId, operadorId, 'SUSPENDIDA', 'SUSPENDER_TIENDA');
  }

  reactivar(tiendaId: string, operadorId: string) {
    return this.cambiarEstado(tiendaId, operadorId, 'ACTIVA', 'REACTIVAR_TIENDA');
  }

  private async cambiarEstado(tiendaId: string, operadorId: string, estado: 'ACTIVA' | 'SUSPENDIDA', accion: string) {
    if (estado === 'SUSPENDIDA' && tiendaId === TIENDA_BASE_ID) {
      throw new BadRequestException('La tienda base de la plataforma no se puede suspender.');
    }
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) throw new NotFoundException('Tienda no encontrada.');
    if (tienda.estado === estado) {
      throw new BadRequestException(
        estado === 'SUSPENDIDA' ? 'La tienda ya está suspendida.' : 'La tienda ya está activa.',
      );
    }

    const anterior = tienda.estado;
    await this.dataSource.transaction(async (manager) => {
      await manager.update(StoreEntity, { id: tiendaId }, { estado });
      await manager.query(
        'INSERT INTO plataforma_auditoria (usuario_id, accion, tienda_id, detalle) VALUES ($1, $2, $3, $4::jsonb)',
        [operadorId, accion, tiendaId, JSON.stringify({ estadoAnterior: anterior, estadoNuevo: estado, slug: tienda.slug })],
      );
    });
    // Slugs resolve through a short cache: drop it so the change is immediate on this instance
    this.resolver.forget(tiendaId);

    return { id: tiendaId, estado };
  }

  private paginacion(filas: any[], pagina: number, limite: number) {
    const total = filas.length ? Number(filas[0].total) : 0;
    return { total, pagina, limite, totalPaginas: Math.max(1, Math.ceil(total / limite)) };
  }

  private numeros(mapa: Record<string, number> | undefined): Record<string, number> {
    return Object.fromEntries(Object.entries(mapa ?? {}).map(([k, v]) => [k, Number(v)]));
  }
}
