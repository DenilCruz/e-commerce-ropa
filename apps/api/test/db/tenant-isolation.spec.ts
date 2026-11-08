/**
 * Row-level security checks against a real Postgres.
 *
 * Runs only when TEST_DB_ADMIN_URL points at a superuser connection (for example
 * postgres://postgres:postgres@127.0.0.1:5432/postgres); otherwise the suite is skipped so that
 * `pnpm test` stays green without Postgres. `pnpm test:db` (see test/db/README.md) starts a throwaway
 * Postgres in Docker and sets TEST_DB_REQUIRED=1, which turns a missing URL into a failure.
 *
 * The suite creates a scratch database, applies every schema migration in database/NN_*.sql in numeric
 * order, seeds two stores with the admin connection and drops the database afterwards.
 */
import { randomBytes } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const adminUrl = process.env.TEST_DB_ADMIN_URL;

if (!adminUrl && process.env.TEST_DB_REQUIRED) {
  describe('tenant isolation (row-level security)', () => {
    it('needs TEST_DB_ADMIN_URL', () => {
      throw new Error('TEST_DB_REQUIRED is set but TEST_DB_ADMIN_URL is not; run pnpm test:db or export the URL.');
    });
  });
}

const suite = adminUrl ? describe : describe.skip;
const suiteTitle = adminUrl
  ? 'tenant isolation (row-level security)'
  : 'tenant isolation (row-level security) [skipped: set TEST_DB_ADMIN_URL, see test/db/README.md]';

const DATABASE_DIR = join(__dirname, '../../../../database');

/**
 * Schema migrations, discovered in numeric order so new files (15_*, 16_*, ...) are picked up without
 * editing this spec. Excluded: data seeds (02_seed_*, 03_seed_*), which load demo rows and are not schema
 * or RLS migrations, and dump_completo.sql, a full pg_dump that is not numbered and would duplicate objects.
 */
export const discoverMigrations = (): string[] =>
  readdirSync(DATABASE_DIR)
    .filter((f) => /^\d{2}_.*\.sql$/.test(f) && !/seed/i.test(f))
    .sort((a, b) => a.localeCompare(b));

const APP_ROLE_PASSWORD = 'aura_app_dev';

/**
 * Tables that intentionally have neither a tenant_id column nor row-level security. Keep each reason
 * accurate: the guard fails when an entry here is stale (table gone, or it now has RLS / tenant_id) and
 * when a new tenant-less table appears that is not listed.
 */
const GLOBAL_TABLES: Record<string, string> = {
  tienda: 'the tenant registry itself; the API resolves a store by slug before any tenant is active',
  rol: 'global catalog of role names shared by every store',
  estado_rol: 'history of the global role catalog',
  talla: 'global catalog of sizes',
  color: 'global catalog of colors',
  metodo_pago: 'global catalog of payment methods',
  metodo_envio: 'global catalog of shipping methods',
  token: 'auth tokens belong to a global user and are looked up by an unguessable value',
  direccion: 'addresses hang off a global user; no tenant column by design',
  evento_webhook:
    'Stripe event ids are deduplicated platform-wide; the event arrives before any tenant is known. ' +
    'KNOWN GAP: it has a tenant_id column but no RLS, so aura_app can read every store event metadata',
};

/**
 * Platform tables that only exist once later migrations are applied (15_*, 16_*). They are global by
 * design (platform console), tolerated when present and never reported as stale when absent.
 */
const OPTIONAL_GLOBAL_TABLES: Record<string, string> = {
  alta_tienda: 'store provisioning requests created before the tenant exists',
  plataforma_auditoria: 'platform operator audit trail, not owned by a store',
  suscripcion_stripe: 'global index from a Stripe subscription id to its store, read by webhooks that carry no session',
};

/**
 * Tables with row-level security but no tenant_id column. usuario is global with a by-design policy
 * (the API sees every user, the reports role only members of the active store); usuario_tienda is keyed
 * by tienda_id.
 */
const SPECIAL_RLS_TABLES = ['usuario', 'usuario_tienda'];

/** Tables seeded for both stores; the per-tenant reads must find rows in each of them. */
const SEEDED_TABLES = [
  'sucursal',
  'categoria',
  'marca',
  'producto',
  'producto_variante',
  'cliente',
  'nota_venta',
  'suscripcion',
  'push_suscripcion',
  'idempotencia',
  'movimiento_qr_simulado',
];

suite(suiteTitle, () => {
  const dbName = `aura_isolation_${randomBytes(4).toString('hex')}`;
  const withDb = (url: string, name: string) => {
    const u = new URL(url);
    u.pathname = `/${name}`;
    return u.toString();
  };

  let admin: Client;
  let scratch: Client;
  const clients: Client[] = [];
  const ids = { luna: '', sol: '', rol: '', ana: '', beto: '', carla: '', catSol: '' };
  let tables: { name: string; tenantColumn: string | null; rls: boolean; policies: number; checks: number }[] = [];

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

  /** Runs the callback inside a transaction that is always rolled back, so the seed never changes. */
  const rolledBack = async <T>(client: Client, fn: () => Promise<T>): Promise<T> => {
    await client.query('BEGIN');
    try {
      return await fn();
    } finally {
      await client.query('ROLLBACK');
    }
  };

  /** Same as rolledBack but executing as the read-only reports role, like dynamic-reports.service.ts. */
  const asReports = <T>(client: Client, fn: () => Promise<T>): Promise<T> =>
    rolledBack(client, async () => {
      await client.query('SET LOCAL ROLE aura_reports');
      return fn();
    });

  const count = async (client: Client, sql: string, params: unknown[] = []) =>
    Number((await client.query(sql, params)).rows[0].n);

  /** Tables that carry tenant_id and are expected to be isolated (the documented global exceptions are excluded). */
  const tenantTables = () => tables.filter((t) => t.tenantColumn === 'tenant_id' && !(t.name in GLOBAL_TABLES));

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${dbName}`);

    scratch = new Client({ connectionString: withDb(adminUrl!, dbName) });
    await scratch.connect();
    for (const file of discoverMigrations()) {
      await scratch.query(readFileSync(join(DATABASE_DIR, file), 'utf8'));
    }

    const insert = async (sql: string, params: unknown[] = []) => (await scratch.query(sql, params)).rows[0].id as string;
    ids.luna = await insert("INSERT INTO tienda (nombre, slug) VALUES ('Moda Luna', 'moda-luna') RETURNING id");
    ids.sol = await insert("INSERT INTO tienda (nombre, slug) VALUES ('Moda Sol', 'moda-sol') RETURNING id");
    ids.rol = await insert("INSERT INTO rol (nombre) VALUES ('ADMIN_TEST') RETURNING id");
    const user = (nombre: string, correo: string) =>
      insert(
        "INSERT INTO usuario (rol_id, nombre, apellido, correo, contrasena) VALUES ($1, $2, 'Test', $3, 'x') RETURNING id",
        [ids.rol, nombre, correo],
      );
    ids.ana = await user('Ana', 'ana@example.com'); // member of both stores
    ids.beto = await user('Beto', 'beto@luna.example.com'); // Luna only
    ids.carla = await user('Carla', 'carla@sol.example.com'); // Sol only
    const members: [string, string][] = [
      [ids.ana, ids.luna],
      [ids.ana, ids.sol],
      [ids.beto, ids.luna],
      [ids.carla, ids.sol],
    ];
    for (const [usuario, tienda] of members) {
      await scratch.query('INSERT INTO usuario_tienda (usuario_id, tienda_id, rol_id) VALUES ($1, $2, $3)', [
        usuario,
        tienda,
        ids.rol,
      ]);
    }
    const talla = await insert("INSERT INTO talla (nombre) VALUES ('M') RETURNING id");
    const color = await insert("INSERT INTO color (nombre) VALUES ('Rojo') RETURNING id");

    const stores: [string, string, string, string][] = [
      [ids.luna, 'Luna', ids.beto, ids.ana],
      [ids.sol, 'Sol', ids.carla, ids.ana],
    ];
    for (const [tenant, label, owner, other] of stores) {
      await scratch.query("INSERT INTO sucursal (tenant_id, nombre) VALUES ($1, $2)", [tenant, `Sucursal ${label}`]);
      const categoria = await insert(
        'INSERT INTO categoria (tenant_id, nombre) VALUES ($1, $2) RETURNING id',
        [tenant, `Vestidos ${label}`],
      );
      if (label === 'Sol') ids.catSol = categoria;
      const marca = await insert('INSERT INTO marca (tenant_id, nombre) VALUES ($1, $2) RETURNING id', [
        tenant,
        `Marca ${label}`,
      ]);
      const producto = await insert(
        'INSERT INTO producto (tenant_id, categoria_id, marca_id, nombre, precio) VALUES ($1, $2, $3, $4, 49.90) RETURNING id',
        [tenant, categoria, marca, `Vestido ${label}`],
      );
      await scratch.query(
        'INSERT INTO producto_variante (tenant_id, producto_id, talla_id, color_id, sku, stock) VALUES ($1, $2, $3, $4, $5, 10)',
        [tenant, producto, talla, color, `SKU-${label}`],
      );
      const cliente = await insert('INSERT INTO cliente (tenant_id, usuario_id) VALUES ($1, $2) RETURNING id', [
        tenant,
        other,
      ]);
      await scratch.query(
        "INSERT INTO nota_venta (tenant_id, nro, usuario_id, cliente_id, total, estado) VALUES ($1, $2, $3, $4, 49.90, 'PENDIENTE')",
        [tenant, `NV-${label}-1`, owner, cliente],
      );
      await scratch.query(
        `INSERT INTO suscripcion (tenant_id, usuario_id, plan, periodo, monto, moneda, estado, stripe_session_id)
         VALUES ($1, $2, 'ESTANDAR', 'MENSUAL', 20, 'usd', 'ACTIVA', $3)`,
        [tenant, owner, `cs_test_${label}`],
      );
      await scratch.query(
        'INSERT INTO push_suscripcion (tenant_id, usuario_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4, $5)',
        [tenant, owner, `https://push.example.com/${label}`, 'p256dh', 'auth'],
      );
      await scratch.query(
        "INSERT INTO idempotencia (tenant_id, usuario_id, clave, huella) VALUES ($1, $2, $3, repeat('a', 64))",
        [tenant, owner, `key-${label}`],
      );
      await scratch.query(
        "INSERT INTO movimiento_qr_simulado (tenant_id, usuario_id, solicitud_id, tipo, monto) VALUES ($1, $2, uuid_generate_v4(), 'VENTA', 10)",
        [tenant, owner],
      );
    }
    await scratch.query(
      "INSERT INTO evento_webhook (stripe_event_id, tipo, tenant_id) VALUES ('evt_1', 'checkout.session.completed', $1)",
      [ids.luna],
    );

    tables = (
      await scratch.query(`
        SELECT c.relname AS name,
               (SELECT column_name FROM information_schema.columns k
                 WHERE k.table_schema = 'public' AND k.table_name = c.relname AND k.column_name = 'tenant_id') AS "tenantColumn",
               c.relrowsecurity AS rls,
               (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies,
               (SELECT count(*)::int FROM pg_policies p
                 WHERE p.schemaname = 'public' AND p.tablename = c.relname
                   AND p.qual LIKE '%app.tenant_id%' AND p.with_check LIKE '%app.tenant_id%') AS checks
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
         ORDER BY c.relname`)
    ).rows;
  }, 120_000);

  afterAll(async () => {
    await Promise.all(clients.map((c) => c.end().catch(() => undefined)));
    await scratch?.end().catch(() => undefined);
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`).catch(() => undefined);
      await admin.end().catch(() => undefined);
    }
  });

  describe('schema guard', () => {
    it('applies the numbered migrations in order and skips seeds and the dump', () => {
      const files = discoverMigrations();

      expect(files[0]).toBe('01_init_schema.sql');
      expect(files).toEqual([...files].sort((a, b) => a.localeCompare(b)));
      expect(files.some((f) => /seed|dump/i.test(f))).toBe(false);
      expect(files).toEqual(expect.arrayContaining(['05_rls.sql', '13_plan_roles.sql', '14_qr_simulado.sql']));
    });

    it('enables RLS with a tenant policy (USING and WITH CHECK) on every table that has tenant_id', () => {
      const offenders = tenantTables()
        .filter((t) => !t.rls || t.policies === 0 || t.checks === 0)
        .map((t) => `${t.name} (rls=${t.rls}, policies=${t.policies}, tenant policies=${t.checks})`);

      expect(tenantTables().length).toBeGreaterThan(20);
      expect(offenders).toEqual([]);
    });

    it('keeps the special tables protected by RLS and a policy', () => {
      for (const name of SPECIAL_RLS_TABLES) {
        const t = tables.find((x) => x.name === name);
        expect(t).toBeDefined();
        expect(t!.rls).toBe(true);
        expect(t!.policies).toBeGreaterThan(0);
      }
    });

    it('lists every other table in the documented global allow-list, exactly', () => {
      // Tables with no RLS at all, whether or not they carry a tenant_id column
      const unprotected = tables.filter((t) => !t.rls).map((t) => t.name);
      const allowed = { ...GLOBAL_TABLES, ...OPTIONAL_GLOBAL_TABLES };

      const unknown = unprotected.filter((n) => !(n in allowed));
      const stale = Object.keys(GLOBAL_TABLES).filter((n) => !unprotected.includes(n));
      const optionalStale = Object.keys(OPTIONAL_GLOBAL_TABLES).filter(
        (n) => tables.some((t) => t.name === n) && !unprotected.includes(n),
      );

      expect(unknown).toEqual([]); // a new tenant-less table must be classified here or given tenant_id + RLS
      expect(stale).toEqual([]); // an allow-list entry that no longer matches reality
      expect(optionalStale).toEqual([]);
    });

    it('never lets the app role own a table, since owners bypass RLS', async () => {
      const owned = await scratch.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner IN ('aura_app', 'aura_reports')",
      );

      expect(owned.rows).toEqual([]);
    });
  });

  describe('database roles', () => {
    it('makes aura_app a plain login role that cannot bypass RLS', async () => {
      const row = (await scratch.query("SELECT * FROM pg_roles WHERE rolname = 'aura_app'")).rows[0];

      expect(row).toMatchObject({
        rolsuper: false,
        rolbypassrls: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolcanlogin: true,
      });
    });

    it('makes aura_reports a non-login role that cannot bypass RLS and is reachable from aura_app', async () => {
      const row = (await scratch.query("SELECT * FROM pg_roles WHERE rolname = 'aura_reports'")).rows[0];
      const app = await asApp(ids.luna);

      expect(row).toMatchObject({ rolsuper: false, rolbypassrls: false, rolcanlogin: false, rolcreatedb: false });
      expect((await app.query("SELECT pg_has_role('aura_app', 'aura_reports', 'member') AS ok")).rows[0].ok).toBe(true);
    });

    it('agrees with the bootstrap check in tenant-isolation.bootstrap.ts', async () => {
      // The exact query the API runs at startup: an RLS-bypassing role must be flagged, aura_app must not.
      const query = 'SELECT current_user AS usuario, (rolsuper OR rolbypassrls) AS omite_rls FROM pg_roles WHERE rolname = current_user';
      const app = await asApp(ids.luna);

      expect((await app.query(query)).rows).toEqual([{ usuario: 'aura_app', omite_rls: false }]);
      expect((await scratch.query(query)).rows[0].omite_rls).toBe(true);
    });
  });

  describe('reads as aura_app', () => {
    it('returns only the active store rows on every RLS table, and never fails', async () => {
      const failures: string[] = [];
      for (const [tenant, other] of [
        [ids.luna, ids.sol],
        [ids.sol, ids.luna],
      ]) {
        const app = await asApp(tenant);
        for (const t of tenantTables()) {
          const expected = await count(scratch, `SELECT count(*) AS n FROM ${t.name} WHERE tenant_id = $1`, [tenant]);
          const seen = await count(app, `SELECT count(*) AS n FROM ${t.name}`);
          const foreign = await count(app, `SELECT count(*) AS n FROM ${t.name} WHERE tenant_id = $1`, [other]);
          if (seen !== expected || foreign !== 0) failures.push(`${t.name}: saw ${seen}, expected ${expected}, foreign ${foreign}`);
        }
      }

      expect(failures).toEqual([]);
    });

    it('finds seeded rows for both stores in every seeded table (the checks are not vacuous)', async () => {
      for (const table of SEEDED_TABLES) {
        for (const tenant of [ids.luna, ids.sol]) {
          expect(await count(scratch, `SELECT count(*) AS n FROM ${table} WHERE tenant_id = $1`, [tenant])).toBeGreaterThan(0);
        }
      }
    });

    it('shows nothing, without an error, when no store is active', async () => {
      const failures: string[] = [];
      for (const noTenant of ['', undefined]) {
        const app = await asApp(noTenant ?? '');
        if (noTenant === undefined) await app.query("SELECT set_config('app.tenant_id', NULL, false)");
        for (const t of tenantTables()) {
          const seen = await count(app, `SELECT count(*) AS n FROM ${t.name}`);
          if (seen !== 0) failures.push(`${t.name}: saw ${seen}`);
        }
        expect(await count(app, 'SELECT count(*) AS n FROM usuario_tienda')).toBe(0);
      }

      expect(failures).toEqual([]);
    });

    it('denies reading another store row by id', async () => {
      const sol = await asApp(ids.sol);
      const lunaRow = (await scratch.query('SELECT id FROM producto WHERE tenant_id = $1', [ids.luna])).rows[0];

      expect(await count(sol, 'SELECT count(*) AS n FROM producto WHERE id = $1', [lunaRow.id])).toBe(0);
    });

    it('shows only the active store membership rows when no user is signed in', async () => {
      const luna = await asApp(ids.luna);
      const rows = (await luna.query('SELECT tienda_id, usuario_id FROM usuario_tienda ORDER BY usuario_id')).rows;

      expect(rows.map((r) => r.tienda_id)).toEqual([ids.luna, ids.luna]);
      expect(rows.map((r) => r.usuario_id).sort()).toEqual([ids.ana, ids.beto].sort());
    });

    it('lists all memberships of the signed-in user so the store selector can show them', async () => {
      const luna = await asApp(ids.luna, ids.ana);
      const memberships = (await luna.query('SELECT tienda_id FROM usuario_tienda WHERE usuario_id = $1', [ids.ana])).rows;

      expect(memberships.map((r) => r.tienda_id).sort()).toEqual([ids.luna, ids.sol].sort());
      expect(await count(luna, 'SELECT count(*) AS n FROM usuario_tienda WHERE usuario_id = $1', [ids.carla])).toBe(0);
    });

    it('keeps one global user with a membership in each store', async () => {
      expect((await scratch.query("SELECT 1 FROM usuario WHERE correo = 'ana@example.com'")).rowCount).toBe(1);
      expect(await count(scratch, 'SELECT count(*) AS n FROM usuario_tienda WHERE usuario_id = $1', [ids.ana])).toBe(2);
    });

    it('lets the API see every user (by-design global policy) regardless of the active store', async () => {
      const none = await asApp('');

      expect(await count(none, 'SELECT count(*) AS n FROM usuario')).toBe(3);
    });
  });

  describe('WITH CHECK', () => {
    const rls = /row-level security/;
    const rows: Record<string, { insert: string; move: string }> = {
      categoria: {
        insert: "INSERT INTO categoria (tenant_id, nombre) VALUES ($1, 'Intruso')",
        move: "UPDATE categoria SET tenant_id = $1 WHERE nombre = 'Vestidos Sol'",
      },
      producto: {
        insert: "INSERT INTO producto (tenant_id, categoria_id, nombre) VALUES ($1, '%CAT%', 'Intruso')",
        move: "UPDATE producto SET tenant_id = $1 WHERE nombre = 'Vestido Sol'",
      },
      nota_venta: {
        insert: "INSERT INTO nota_venta (tenant_id, nro, usuario_id, total) VALUES ($1, 'NV-INTRUSO', '%USER%', 1)",
        move: "UPDATE nota_venta SET tenant_id = $1 WHERE nro = 'NV-Sol-1'",
      },
      suscripcion: {
        insert:
          "INSERT INTO suscripcion (tenant_id, plan, periodo, monto, stripe_session_id) VALUES ($1, 'ESTANDAR', 'MENSUAL', 20, 'cs_intruso')",
        move: "UPDATE suscripcion SET tenant_id = $1 WHERE stripe_session_id = 'cs_test_Sol'",
      },
      sucursal: {
        insert: "INSERT INTO sucursal (tenant_id, nombre) VALUES ($1, 'Intrusa')",
        move: "UPDATE sucursal SET tenant_id = $1 WHERE nombre = 'Sucursal Sol'",
      },
    };

    it.each(Object.keys(rows))('rejects inserting a %s row into another store', async (table) => {
      const sol = await asApp(ids.sol);
      const sql = rows[table].insert.replace('%USER%', ids.carla).replace('%CAT%', ids.catSol);
      const before = await count(scratch, `SELECT count(*) AS n FROM ${table}`);

      await rolledBack(sol, async () => {
        await expect(sol.query(sql, [ids.luna])).rejects.toThrow(rls);
      });

      expect(await count(scratch, `SELECT count(*) AS n FROM ${table}`)).toBe(before);
    });

    it.each(Object.keys(rows))('rejects inserting a %s row while no store is active', async (table) => {
      const none = await asApp('');
      const sql = rows[table].insert.replace('%USER%', ids.carla).replace('%CAT%', ids.catSol);

      await rolledBack(none, async () => {
        await expect(none.query(sql, [ids.luna])).rejects.toThrow(rls);
      });
    });

    it.each(Object.keys(rows))('rejects moving an own %s row to another store', async (table) => {
      const sol = await asApp(ids.sol);

      await rolledBack(sol, async () => {
        await expect(sol.query(rows[table].move, [ids.luna])).rejects.toThrow(rls);
      });

      expect(await count(scratch, `SELECT count(*) AS n FROM ${table} WHERE tenant_id = $1`, [ids.sol])).toBeGreaterThan(0);
    });

    it('rejects adding a membership to another store', async () => {
      const sol = await asApp(ids.sol);

      await rolledBack(sol, async () => {
        await expect(
          sol.query('INSERT INTO usuario_tienda (usuario_id, tienda_id, rol_id) VALUES ($1, $2, $3)', [ids.carla, ids.luna, ids.rol]),
        ).rejects.toThrow(rls);
      });
    });

    it('accepts the same writes inside the active store (the policy is not simply denying everything)', async () => {
      const sol = await asApp(ids.sol);

      await rolledBack(sol, async () => {
        const inserted = await sol.query("INSERT INTO sucursal (tenant_id, nombre) VALUES ($1, 'Nueva') RETURNING id", [ids.sol]);
        expect(inserted.rowCount).toBe(1);
        expect((await sol.query("UPDATE sucursal SET nombre = 'Renombrada' WHERE nombre = 'Nueva'")).rowCount).toBe(1);
      });
    });
  });

  describe('UPDATE and DELETE', () => {
    const updates: [string, string][] = [
      ['categoria', "UPDATE categoria SET descripcion = 'tocada'"],
      ['producto', "UPDATE producto SET descripcion = 'tocado'"],
      ['nota_venta', "UPDATE nota_venta SET estado = 'PAGADA'"],
      ['suscripcion', "UPDATE suscripcion SET stripe_payment_intent_id = 'pi_tocado'"],
      ['sucursal', "UPDATE sucursal SET direccion = 'tocada'"],
    ];

    it.each(updates)('an unfiltered %s UPDATE touches only the active store rows', async (table, sql) => {
      const sol = await asApp(ids.sol);
      const own = await count(scratch, `SELECT count(*) AS n FROM ${table} WHERE tenant_id = $1`, [ids.sol]);

      await rolledBack(sol, async () => {
        expect((await sol.query(sql)).rowCount).toBe(own);
      });

      // The other store must be byte-identical after the same statement ran (read it back inside the transaction)
      const lunaBefore = (await scratch.query(`SELECT * FROM ${table} WHERE tenant_id = $1 ORDER BY id`, [ids.luna])).rows;
      await rolledBack(sol, async () => {
        await sol.query(sql);
        await sol.query("SELECT set_config('app.tenant_id', $1, false)", [ids.luna]);
        expect((await sol.query(`SELECT * FROM ${table} ORDER BY id`)).rows).toEqual(lunaBefore);
      });
    });

    it.each(['categoria', 'producto', 'nota_venta', 'suscripcion', 'sucursal'])(
      'a %s UPDATE aimed at another store, and a DELETE too, affect zero rows',
      async (table) => {
        const sol = await asApp(ids.sol);

        await rolledBack(sol, async () => {
          expect((await sol.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [ids.luna])).rowCount).toBe(0);
          expect((await sol.query(`UPDATE ${table} SET tenant_id = tenant_id WHERE tenant_id = $1`, [ids.luna])).rowCount).toBe(0);
        });
        expect(await count(scratch, `SELECT count(*) AS n FROM ${table} WHERE tenant_id = $1`, [ids.luna])).toBeGreaterThan(0);
      },
    );

    it.each(['marca', 'sucursal', 'push_suscripcion', 'idempotencia'])(
      'an unfiltered %s DELETE removes only the active store rows',
      async (table) => {
        const sol = await asApp(ids.sol);
        const own = await count(scratch, `SELECT count(*) AS n FROM ${table} WHERE tenant_id = $1`, [ids.sol]);

        await rolledBack(sol, async () => {
          expect((await sol.query(`DELETE FROM ${table}`)).rowCount).toBe(own);
          expect(await count(sol, `SELECT count(*) AS n FROM ${table}`)).toBe(0);
        });

        expect(await count(scratch, `SELECT count(*) AS n FROM ${table} WHERE tenant_id = $1`, [ids.luna])).toBeGreaterThan(0);
      },
    );

    it('keeps movimiento_qr_simulado append-only for the app role', async () => {
      const luna = await asApp(ids.luna);

      await rolledBack(luna, async () => {
        await expect(luna.query("UPDATE movimiento_qr_simulado SET monto = 0")).rejects.toThrow(/permission denied/);
      });
      await rolledBack(luna, async () => {
        await expect(luna.query('DELETE FROM movimiento_qr_simulado')).rejects.toThrow(/permission denied/);
      });
    });
  });

  describe('aura_reports (AI-generated SQL)', () => {
    it('reads only the active store rows, like dynamic-reports.service.ts does', async () => {
      const luna = await asApp(ids.luna);

      await asReports(luna, async () => {
        expect((await luna.query('SELECT nombre FROM producto')).rows).toEqual([{ nombre: 'Vestido Luna' }]);
        expect((await luna.query('SELECT nro FROM nota_venta')).rows).toEqual([{ nro: 'NV-Luna-1' }]);
        expect((await luna.query('SELECT nombre FROM sucursal')).rows).toEqual([{ nombre: 'Sucursal Luna' }]);
      });
    });

    it('sees no rows without an active store', async () => {
      const none = await asApp('');

      await asReports(none, async () => {
        expect(await count(none, 'SELECT count(*) AS n FROM producto')).toBe(0);
        expect(await count(none, 'SELECT count(*) AS n FROM usuario')).toBe(0);
      });
    });

    it('sees only members of the active store in usuario, never the password column', async () => {
      const sol = await asApp(ids.sol);

      await asReports(sol, async () => {
        const nombres = (await sol.query('SELECT nombre FROM usuario ORDER BY nombre')).rows.map((r) => r.nombre);
        expect(nombres).toEqual(['Ana', 'Carla']);
      });
      await asReports(sol, async () => {
        await expect(sol.query('SELECT contrasena FROM usuario')).rejects.toThrow(/permission denied/);
      });
    });

    it('cannot read tables outside its grants', async () => {
      const luna = await asApp(ids.luna);

      for (const table of ['suscripcion', 'push_suscripcion', 'idempotencia', 'movimiento_qr_simulado', 'token', 'evento_webhook', 'tienda']) {
        await asReports(luna, async () => {
          await expect(luna.query(`SELECT * FROM ${table}`)).rejects.toThrow(/permission denied/);
        });
      }
    });

    it('holds no privilege other than SELECT on any table', async () => {
      const writes = await scratch.query(`
        SELECT c.relname, p.priv
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
               unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS p(priv)
         WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND has_table_privilege('aura_reports', c.oid, p.priv)`);

      expect(writes.rows).toEqual([]);
    });

    it('rejects INSERT, UPDATE and DELETE', async () => {
      const luna = await asApp(ids.luna);
      const statements = [
        `INSERT INTO sucursal (tenant_id, nombre) VALUES ('${ids.luna}', 'x')`,
        "UPDATE producto SET nombre = 'x'",
        'DELETE FROM categoria',
        'TRUNCATE producto',
      ];

      for (const sql of statements) {
        await asReports(luna, async () => {
          await expect(luna.query(sql)).rejects.toThrow(/permission denied/);
        });
      }
      expect(await count(scratch, 'SELECT count(*) AS n FROM producto')).toBe(2);
    });

    it('rejects DDL', async () => {
      const luna = await asApp(ids.luna);
      const statements = [
        'CREATE TABLE pwned (id int)',
        'DROP TABLE producto',
        'ALTER TABLE producto ADD COLUMN x int',
        'CREATE ROLE intruso',
      ];

      for (const sql of statements) {
        await asReports(luna, async () => {
          await expect(luna.query(sql)).rejects.toThrow(/permission denied|must be owner/);
        });
      }
      expect(await count(scratch, "SELECT count(*) AS n FROM pg_tables WHERE tablename = 'pwned'")).toBe(0);
    });
  });
});
