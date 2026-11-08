import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Keeps the idempotencia table from growing forever: every 6 hours it deletes the keys older than
 * 45 days through the SECURITY DEFINER function idempotencia_purgar (the API role cannot read every
 * store's rows on its own). A key that old can no longer be retried by any device, since offline data
 * is kept at most 30 days.
 *
 * Off when IDEMPOTENCIA_PURGA=off or under tests. Never throws: a database without migration 18 only
 * gets one warning.
 */
@Injectable()
export class IdempotenciaLimpiezaService implements OnModuleInit, OnModuleDestroy {
  static readonly INTERVALO_MS = 6 * 60 * 60 * 1000;
  static readonly DIAS = 45;

  private readonly logger = new Logger(IdempotenciaLimpiezaService.name);
  private temporizador?: NodeJS.Timeout;
  private avisoFuncionAusente = false;

  constructor(private readonly dataSource: DataSource) {}

  private get apagado(): boolean {
    return process.env.IDEMPOTENCIA_PURGA === 'off' || process.env.NODE_ENV === 'test';
  }

  onModuleInit(): void {
    if (this.apagado) return;
    void this.purgar();
    this.temporizador = setInterval(() => void this.purgar(), IdempotenciaLimpiezaService.INTERVALO_MS);
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = undefined;
  }

  /** One purge pass. Returns how many keys were deleted (0 when it could not run). */
  async purgar(): Promise<number> {
    try {
      const filas = await this.dataSource.query('SELECT idempotencia_purgar($1) AS borradas', [
        IdempotenciaLimpiezaService.DIAS,
      ]);
      const borradas = Number(filas?.[0]?.borradas ?? 0);
      this.logger.log(`Idempotencia: ${borradas} claves de más de ${IdempotenciaLimpiezaService.DIAS} días eliminadas.`);
      return borradas;
    } catch (error: any) {
      // 42883: undefined_function, the migration (database/18) was not applied yet
      if (error?.code === '42883') {
        if (!this.avisoFuncionAusente) {
          this.avisoFuncionAusente = true;
          this.logger.warn('idempotencia_purgar no existe: aplica database/18_offline_clientes_retencion.sql. Sin limpieza.');
        }
      } else {
        this.logger.warn(`Limpieza de idempotencia fallida: ${error?.message ?? error}`);
      }
      return 0;
    }
  }
}
