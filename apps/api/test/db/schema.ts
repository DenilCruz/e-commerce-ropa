/** Helpers shared by the real-database specs: migration discovery and connection URLs. */
import { readdirSync } from 'fs';
import { join } from 'path';

export const DATABASE_DIR = join(__dirname, '../../../../database');

/** Password the migrations give the aura_app login role (see database/05_rls.sql). */
export const APP_ROLE_PASSWORD = 'aura_app_dev';

/**
 * Schema migrations, discovered in numeric order so new files (15_*, 16_*, ...) are picked up without
 * editing any spec. Excluded: data seeds (02_seed_*, 03_seed_*), which load demo rows and are not schema
 * or RLS migrations, and dump_completo.sql, a full pg_dump that is not numbered and would duplicate objects.
 */
export const discoverMigrations = (): string[] =>
  readdirSync(DATABASE_DIR)
    .filter((f) => /^\d{2}_.*\.sql$/.test(f) && !/seed/i.test(f))
    .sort((a, b) => a.localeCompare(b));

/** The same server URL pointed at another database. */
export const withDb = (url: string, name: string): string => {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
};
