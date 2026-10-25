/**
 * Row-level security checks against a real Postgres.
 * Runs only when TEST_DB_ADMIN_URL points at a superuser connection (for example
 * postgres://postgres:postgres@127.0.0.1:5432/postgres); otherwise the suite is skipped.
 * It creates a scratch database, applies the schema migrations and drops it afterwards.
 */
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const adminUrl = process.env.TEST_DB_ADMIN_URL;
const suite = adminUrl ? describe : describe.skip;

const MIGRATIONS = ['01_init_schema.sql', '03_multi_tenant.sql', '04_tienda_slug.sql', '05_rls.sql', '06_tienda_plan.sql'];
const APP_ROLE_PASSWORD = 'aura_app_dev';

suite('tenant isolation (row-level security)', () => {
  const dbName = `aura_isolation_${randomBytes(4).toString('hex')}`;
  const withDb = (url: string, name: string) => {
    const u = new URL(url);
    u.pathname = `/${name}`;
    return u.toString();
  };

  let admin: Client;
  let scratch: Client;
  const clients: Client[] = [];
  const ids = { luna: '', moda: '', user: '', rol: '' };

  /** Connects as the application role, which is subject to RLS, with the given session variables. */
  const asApp = async (tenantId: string, userId = ''): Promise<Client> => {
    const u = new URL(withDb(adminUrl!, dbName));
    u.username = 'aura_app';
    u.password = APP_ROLE_PASSWORD;
    const client = new Client({ connectionString: u.toString() });
    await client.connect();
    clients.push(client);
    await client.query("SELECT set_config('app.tenant_id', $1, false), set_config('app.user_id', $2, false)", [
      tenantId,
      userId,
    ]);
    return client;
  };

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${dbName}`);

    scratch = new Client({ connectionString: withDb(adminUrl!, dbName) });
    await scratch.connect();
    for (const file of MIGRATIONS) {
      await scratch.query(readFileSync(join(__dirname, '../../../../database', file), 'utf8'));
    }

    const insert = async (sql: string, params: unknown[] = []) => (await scratch.query(sql, params)).rows[0].id as string;
    ids.luna = await insert("INSERT INTO tienda (nombre, slug) VALUES ('Moda Luna', 'moda-luna') RETURNING id");
    ids.moda = await insert("INSERT INTO tienda (nombre, slug) VALUES ('Moda Sol', 'moda-sol') RETURNING id");
    ids.rol = await insert("INSERT INTO rol (nombre) VALUES ('ADMIN_TEST') RETURNING id");
    ids.user = await insert(
      "INSERT INTO usuario (rol_id, nombre, apellido, correo, contrasena) VALUES ($1, 'Ana', 'Test', 'ana@example.com', 'x') RETURNING id",
      [ids.rol],
    );
    for (const tienda of [ids.luna, ids.moda]) {
      await scratch.query('INSERT INTO usuario_tienda (usuario_id, tienda_id, rol_id) VALUES ($1, $2, $3)', [
        ids.user,
        tienda,
        ids.rol,
      ]);
    }
    await scratch.query("INSERT INTO categoria (tenant_id, nombre) VALUES ($1, 'Vestidos Luna')", [ids.luna]);
    await scratch.query("INSERT INTO categoria (tenant_id, nombre) VALUES ($1, 'Vestidos Sol')", [ids.moda]);
  }, 60_000);

  afterAll(async () => {
    await Promise.all(clients.map((c) => c.end().catch(() => undefined)));
    await scratch?.end().catch(() => undefined);
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`).catch(() => undefined);
      await admin.end().catch(() => undefined);
    }
  });

  it('shows each store only its own rows', async () => {
    const luna = await asApp(ids.luna);
    const sol = await asApp(ids.moda);

    expect((await luna.query('SELECT nombre FROM categoria')).rows).toEqual([{ nombre: 'Vestidos Luna' }]);
    expect((await sol.query('SELECT nombre FROM categoria')).rows).toEqual([{ nombre: 'Vestidos Sol' }]);
  });

  it('shows nothing when no store is active', async () => {
    const anonymous = await asApp('');

    expect((await anonymous.query('SELECT 1 FROM categoria')).rowCount).toBe(0);
  });

  it('denies reading another store by id', async () => {
    const sol = await asApp(ids.moda);
    const lunaRow = (await scratch.query('SELECT id FROM categoria WHERE tenant_id = $1', [ids.luna])).rows[0];

    expect((await sol.query('SELECT 1 FROM categoria WHERE id = $1', [lunaRow.id])).rowCount).toBe(0);
  });

  it('denies inserting a row into another store', async () => {
    const sol = await asApp(ids.moda);

    await expect(sol.query("INSERT INTO categoria (tenant_id, nombre) VALUES ($1, 'Intruso')", [ids.luna])).rejects.toThrow(
      /row-level security/,
    );
  });

  it('cannot update or delete rows of another store', async () => {
    const sol = await asApp(ids.moda);

    expect((await sol.query("UPDATE categoria SET nombre = 'Hackeada' WHERE tenant_id = $1", [ids.luna])).rowCount).toBe(0);
    expect((await sol.query('DELETE FROM categoria WHERE tenant_id = $1', [ids.luna])).rowCount).toBe(0);
    expect((await scratch.query('SELECT nombre FROM categoria WHERE tenant_id = $1', [ids.luna])).rows).toEqual([
      { nombre: 'Vestidos Luna' },
    ]);
  });

  it('keeps one email with a membership in each store and shows only the active one', async () => {
    const luna = await asApp(ids.luna);

    const memberships = (await luna.query('SELECT tienda_id FROM usuario_tienda')).rows;

    expect((await scratch.query("SELECT 1 FROM usuario WHERE correo = 'ana@example.com'")).rowCount).toBe(1);
    expect(memberships).toEqual([{ tienda_id: ids.luna }]);
  });

  it('lists all of a signed-in user memberships so the store selector can show them', async () => {
    const luna = await asApp(ids.luna, ids.user);

    const memberships = (await luna.query('SELECT tienda_id FROM usuario_tienda')).rows.map((r) => r.tienda_id);

    expect(memberships.sort()).toEqual([ids.luna, ids.moda].sort());
  });
});
