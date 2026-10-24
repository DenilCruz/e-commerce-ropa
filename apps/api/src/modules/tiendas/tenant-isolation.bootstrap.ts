import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { installTenantConnectionHook } from '../../common/tenant/tenant-connection.hook';

const DEFAULT_APP_PASSWORD = 'aura_app_dev';

/** Installs the per-connection tenant hook and checks that row-level security can actually apply. */
@Injectable()
export class TenantIsolationBootstrap implements OnModuleInit {
  private readonly logger = new Logger(TenantIsolationBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    installTenantConnectionHook(this.dataSource);

    if (process.env.NODE_ENV === 'production' && process.env.DB_PASSWORD === DEFAULT_APP_PASSWORD) {
      throw new Error(
        'DB_PASSWORD usa la contraseña de desarrollo del rol aura_app. ' +
          "Cámbiala con: ALTER ROLE aura_app PASSWORD '...' y actualiza apps/api/.env.",
      );
    }

    const [row] = await this.dataSource.query(
      'SELECT current_user AS usuario, (rolsuper OR rolbypassrls) AS omite_rls FROM pg_roles WHERE rolname = current_user',
    );
    if (row?.omite_rls) {
      const message =
        `El rol de base de datos "${row.usuario}" omite Row-Level Security: el aislamiento por tienda ` +
        'depende solo de los filtros del código. Conecta el API con el rol aura_app (database/05_rls.sql).';
      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
      this.logger.warn(message);
    }
  }
}
