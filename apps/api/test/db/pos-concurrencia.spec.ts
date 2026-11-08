/**
 * Offline POS conflict scenarios against a real Postgres and the real Nest application.
 *
 * The unit tests of pos-sales.service.ts mock the database; row locks, the advisory lock on the
 * Idempotency-Key and the unique index uq_nota_venta_clave can only be proven by real concurrent
 * requests. This suite boots AppModule over HTTP, connected as the aura_app role (so row-level security
 * is in force), and drives POST /api/v1/sales/pos the way two sellers and a replaying offline queue do.
 *
 * Runs only when TEST_DB_ADMIN_URL points at a superuser connection; otherwise it is skipped so that
 * `pnpm test` stays green without Postgres. `pnpm test:db:concurrencia` starts a throwaway Postgres
 * in Docker and sets TEST_DB_REQUIRED=1, which turns a missing URL into a failure.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { APP_ROLE_PASSWORD, DATABASE_DIR, discoverMigrations, withDb } from './schema';

const adminUrl = process.env.TEST_DB_ADMIN_URL;
const TITLE = 'offline POS concurrency (real database)';

if (!adminUrl && process.env.TEST_DB_REQUIRED) {
  describe(TITLE, () => {
    it('needs TEST_DB_ADMIN_URL', () => {
      throw new Error('TEST_DB_REQUIRED is set but TEST_DB_ADMIN_URL is not; run pnpm test:db:concurrencia.');
    });
  });
}

const suite = adminUrl ? describe : describe.skip;
const suiteTitle = adminUrl ? TITLE : `${TITLE} [skipped: set TEST_DB_ADMIN_URL, see test/db/README.md]`;

const JWT_SECRET = 'concurrency-test-jwt-secret';

interface Seller {
  id: string;
  token: string;
}
interface Resp {
  status: number;
  body: any;
  headers: Headers;
}

suite(suiteTitle, () => {
  const dbName = `aura_conc_${randomBytes(4).toString('hex')}`;
  let admin: Client;
  let scratch: Client;
  let app: INestApplication;
  let baseUrl = '';
  let tenantId = '';
  let sellerA: Seller;
  let sellerB: Seller;
  let categoriaId = '';
  let marcaId = '';
  let tallaId = '';
  let colorId = '';
  let skuCounter = 0;

  const insert = async (sql: string, params: unknown[] = []) => (await scratch.query(sql, params)).rows[0].id as string;
  const rows = async (sql: string, params: unknown[] = []) => (await scratch.query(sql, params)).rows;
  const scalar = async (sql: string, params: unknown[] = []) => Number((await scratch.query(sql, params)).rows[0].n);

  const stockOf = (varianteId: string) => scalar('SELECT stock AS n FROM producto_variante WHERE id = $1', [varianteId]);
  const ordersFor = (varianteId: string) =>
    rows(
      `SELECT DISTINCT n.id, n.nro FROM nota_venta n JOIN detalle_nota_venta d ON d.notaventa_id = n.id
        WHERE d.variante_id = $1 ORDER BY n.nro`,
      [varianteId],
    );
  const orderCount = () => scalar('SELECT count(*) AS n FROM nota_venta WHERE tenant_id = $1', [tenantId]);

  /** A product with one variant holding the given stock; returns the variant id. */
  const newVariant = async (stock: number, price = 25): Promise<string> => {
    skuCounter += 1;
    const producto = await insert(
      'INSERT INTO producto (tenant_id, categoria_id, marca_id, nombre, precio) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [tenantId, categoriaId, marcaId, `Camisa ${skuCounter}`, price],
    );
    return insert(
      `INSERT INTO producto_variante (tenant_id, producto_id, talla_id, color_id, sku, stock)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [tenantId, producto, tallaId, colorId, `CONC-${skuCounter}`, stock],
    );
  };

  const sell = (
    seller: Seller,
    items: { varianteId: string; cantidad: number }[],
    key: string = randomUUID(),
    extra: Record<string, unknown> = {},
  ): Promise<Resp> => post(seller, { items, ...extra }, key);

  const post = async (seller: Seller, body: unknown, key: string): Promise<Resp> => {
    const res = await fetch(`${baseUrl}/api/v1/sales/pos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${seller.token}`, 'idempotency-key': key },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };

  const one = (v: string, cantidad = 1) => ({ varianteId: v, cantidad });

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${dbName}`);
    scratch = new Client({ connectionString: withDb(adminUrl!, dbName) });
    await scratch.connect();
    for (const file of discoverMigrations()) {
      await scratch.query(readFileSync(join(DATABASE_DIR, file), 'utf8'));
    }

    // Seed through the admin connection (it bypasses RLS): a paid store, roles, two sellers, a catalog
    tenantId = await insert(
      "INSERT INTO tienda (nombre, slug, plan) VALUES ('Moda Concurrente', 'moda-concurrente', 'ESTANDAR') RETURNING id",
    );
    const role = async (nombre: string) =>
      insert('INSERT INTO rol (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id', [
        nombre,
      ]);
    await role('ADMIN');
    await role('CLIENTE');
    const vendedorRol = await role('VENDEDOR');
    const hash = await bcrypt.hash('Vendedor123!', 4);
    const jwt = new JwtService({ secret: JWT_SECRET });
    const seller = async (nombre: string): Promise<Seller> => {
      const id = await insert(
        "INSERT INTO usuario (rol_id, nombre, apellido, correo, contrasena, email_verificado) VALUES ($1, $2, 'Test', $3, $4, true) RETURNING id",
        [vendedorRol, nombre, `${nombre.toLowerCase()}@conc.example.com`, hash],
      );
      await scratch.query('INSERT INTO usuario_tienda (usuario_id, tienda_id, rol_id) VALUES ($1, $2, $3)', [
        id,
        tenantId,
        vendedorRol,
      ]);
      // Same payload shape the login flow signs (auth.service.ts generarTokens)
      const token = await jwt.signAsync(
        { sub: id, email: `${nombre.toLowerCase()}@conc.example.com`, tid: tenantId, role: 'VENDEDOR', jti: randomUUID(), type: 'access' },
        { expiresIn: '1h' },
      );
      return { id, token };
    };
    sellerA = await seller('Ana');
    sellerB = await seller('Beto');

    categoriaId = await insert('INSERT INTO categoria (tenant_id, nombre) VALUES ($1, $2) RETURNING id', [tenantId, 'Camisas']);
    marcaId = await insert('INSERT INTO marca (tenant_id, nombre) VALUES ($1, $2) RETURNING id', [tenantId, 'Aura']);
    tallaId = await insert("INSERT INTO talla (nombre) VALUES ('M') ON CONFLICT DO NOTHING RETURNING id").catch(
      async () => (await rows("SELECT id FROM talla WHERE nombre = 'M'"))[0].id,
    );
    colorId = await insert("INSERT INTO color (nombre) VALUES ('Azul') RETURNING id");
    if ((await scalar("SELECT count(*) AS n FROM metodo_pago WHERE LOWER(nombre) LIKE '%efectivo%'")) === 0) {
      await scratch.query("INSERT INTO metodo_pago (nombre) VALUES ('Efectivo')");
    }

    // Boot the real application as the aura_app role. Env first, AppModule imported afterwards.
    const u = new URL(withDb(adminUrl!, dbName));
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DB_HOST: u.hostname,
      DB_PORT: u.port || '5432',
      DB_USER: 'aura_app',
      DB_PASSWORD: APP_ROLE_PASSWORD,
      DB_NAME: dbName,
      JWT_SECRET,
      JWT_REFRESH_SECRET: 'concurrency-test-refresh-secret',
      IDEMPOTENCIA_PURGA: 'off',
    });
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = await import('../../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1'); // same bootstrap as main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  }, 180_000);

  afterAll(async () => {
    await app?.close().catch(() => undefined);
    await scratch?.end().catch(() => undefined);
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`).catch(() => undefined);
      await admin.end().catch(() => undefined);
    }
  });

  it('connects the API as a role that cannot bypass row-level security', async () => {
    const [row] = await rows("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'aura_app'");
    expect(row).toEqual({ rolsuper: false, rolbypassrls: false });

    const v = await newVariant(2);
    const res = await sell(sellerA, [one(v)]);
    expect(res.status).toBe(201); // the whole flow works under RLS: guards, plan check, sale
  });

  describe('(a) two sellers race for the last unit', () => {
    it.each(Array.from({ length: 20 }, (_, i) => i + 1))('round %i: exactly one wins, the other gets STOCK_CONFLICT', async () => {
      const v = await newVariant(1);
      const ordersBefore = await orderCount();

      const [ra, rb] = await Promise.all([sell(sellerA, [one(v)]), sell(sellerB, [one(v)])]);

      const statuses = [ra.status, rb.status].sort();
      expect(statuses).toEqual([201, 409]);
      const winner = ra.status === 201 ? ra : rb;
      const loser = ra.status === 201 ? rb : ra;
      expect(winner.body).toMatchObject({ total: 25, items: [{ varianteId: v, cantidad: 1 }] });
      expect(loser.body).toMatchObject({
        statusCode: 409,
        codigo: 'STOCK_CONFLICT',
        items: [{ varianteId: v, solicitado: 1, disponible: 0 }],
      });
      expect(await stockOf(v)).toBe(0); // never negative
      expect(await ordersFor(v)).toHaveLength(1);
      expect(await orderCount()).toBe(ordersBefore + 1);
    }, 30_000);
  });

  describe('(b) the same sale sent several times with the same Idempotency-Key', () => {
    it('registers one sale; concurrent copies get the order or a retryable 409, and every retry gets the same order', async () => {
      const v = await newVariant(3);
      const key = randomUUID();

      const first = await Promise.all(Array.from({ length: 5 }, () => sell(sellerA, [one(v)], key)));
      // A copy that arrives while the first is still running is told to retry (409 + Retry-After)
      for (const r of first) expect([201, 409]).toContain(r.status);
      const created = first.filter((r) => r.status === 201);
      expect(created.length).toBeGreaterThanOrEqual(1);
      for (const r of first.filter((x) => x.status === 409)) expect(r.headers.get('retry-after')).not.toBeNull();

      // The client retries the ones that were told to
      const retried = await Promise.all(first.filter((r) => r.status === 409).map(() => sell(sellerA, [one(v)], key)));
      const all = [...created, ...retried];
      expect(all.every((r) => r.status === 201)).toBe(true);
      expect(new Set(all.map((r) => r.body.nroOrden)).size).toBe(1);
      expect(new Set(all.map((r) => r.body.ordenId)).size).toBe(1);

      expect(await ordersFor(v)).toHaveLength(1);
      expect(await stockOf(v)).toBe(2); // decremented once
      expect(await scalar('SELECT count(*) AS n FROM pago WHERE notaventa_id = $1', [created[0].body.ordenId])).toBe(1);
    });

    it('registers one sale when two users present the same key at the same instant (advisory lock + unique index)', async () => {
      const v = await newVariant(5);
      const key = randomUUID();

      const [ra, rb] = await Promise.all([sell(sellerA, [one(v)], key), sell(sellerB, [one(v)], key)]);

      // Different users have different interceptor rows, so only the service-level barriers hold
      expect([ra.status, rb.status]).toEqual([201, 201]);
      expect(ra.body.nroOrden).toBe(rb.body.nroOrden);
      expect(await ordersFor(v)).toHaveLength(1);
      expect(await stockOf(v)).toBe(4);
    });
  });

  describe('(c) an offline queue replays while another seller sells online', () => {
    it('keeps stock = initial - accepted units; the rejected sale changes nothing and lists only the short item', async () => {
      const x = await newVariant(3);
      const y = await newVariant(10);
      const before = { orders: await orderCount() };

      const a1 = await sell(sellerA, [one(x)]);
      const b1 = await sell(sellerB, [one(x)]); // the online sale in between
      const a2 = await sell(sellerA, [one(x), one(y)]);
      const keyA3 = randomUUID();
      const a3 = await sell(sellerA, [one(x), one(y, 2)], keyA3); // x is gone: the whole sale must fail

      expect([a1.status, b1.status, a2.status, a3.status]).toEqual([201, 201, 201, 409]);
      expect(a3.body.codigo).toBe('STOCK_CONFLICT');
      expect(a3.body.items).toEqual([expect.objectContaining({ varianteId: x, solicitado: 1, disponible: 0 })]);
      expect(a3.body.items).toHaveLength(1); // y had stock: it is not listed

      expect(await stockOf(x)).toBe(0); // 3 - (a1 + b1 + a2)
      expect(await stockOf(y)).toBe(9); // 10 - a2 only; a3's 2 units were never taken
      expect(await orderCount()).toBe(before.orders + 3);

      // Rollback proof: nothing at all is stored under the rejected sale's key
      expect(await scalar('SELECT count(*) AS n FROM nota_venta WHERE clave_idempotencia = $1', [keyA3])).toBe(0);
      expect(await scalar('SELECT count(*) AS n FROM detalle_nota_venta WHERE variante_id = $1', [y])).toBe(1);
      expect(
        await scalar('SELECT count(*) AS n FROM idempotencia WHERE tenant_id = $1 AND clave = $2', [tenantId, keyA3]),
      ).toBe(0); // the key is released so the seller can retry after restocking

      // After restocking the same queued sale (same key) goes through
      await scratch.query('UPDATE producto_variante SET stock = 5 WHERE id = $1', [x]);
      const retry = await sell(sellerA, [one(x), one(y, 2)], keyA3);
      expect(retry.status).toBe(201);
      expect(await stockOf(x)).toBe(4);
      expect(await stockOf(y)).toBe(7);
    });
  });

  describe('(d) a sale with two lines where only the second is short', () => {
    it('writes nothing for the first line', async () => {
      const ok = await newVariant(5);
      const short = await newVariant(1);
      const ordersBefore = await orderCount();
      const key = randomUUID();

      const res = await sell(sellerA, [one(ok, 2), one(short, 3)], key);

      expect(res.status).toBe(409);
      expect(res.body.codigo).toBe('STOCK_CONFLICT');
      expect(res.body.items).toEqual([expect.objectContaining({ varianteId: short, solicitado: 3, disponible: 1 })]);
      expect(res.body.items).toHaveLength(1);
      expect(await stockOf(ok)).toBe(5);
      expect(await stockOf(short)).toBe(1);
      expect(await orderCount()).toBe(ordersBefore);
      expect(await ordersFor(ok)).toHaveLength(0);
      expect(await scalar('SELECT count(*) AS n FROM nota_venta WHERE clave_idempotencia = $1', [key])).toBe(0);
    });
  });

  describe('(e) the same Idempotency-Key with a different body', () => {
    it('gets 422 and changes nothing', async () => {
      const v = await newVariant(5);
      const key = randomUUID();
      const first = await sell(sellerA, [one(v, 1)], key);
      expect(first.status).toBe(201);

      const second = await sell(sellerA, [one(v, 2)], key);

      expect(second.status).toBe(422);
      expect(await stockOf(v)).toBe(4); // only the first sale
      expect(await ordersFor(v)).toHaveLength(1);
      expect(await scalar('SELECT count(*) AS n FROM nota_venta WHERE clave_idempotencia = $1', [key])).toBe(1);
    });
  });

  describe('(f) the idempotency row was purged but the order exists', () => {
    it('returns the original order through the unique index on nota_venta (second barrier)', async () => {
      const v = await newVariant(5);
      const key = randomUUID();
      const first = await sell(sellerA, [one(v)], key);
      expect(first.status).toBe(201);

      // Simulate the purge job (or a lost row) with the admin connection
      const purged = await scratch.query('DELETE FROM idempotencia WHERE tenant_id = $1 AND clave = $2', [tenantId, key]);
      expect(purged.rowCount).toBe(1);

      const again = await sell(sellerA, [one(v)], key);

      expect(again.status).toBe(201);
      expect(again.body.nroOrden).toBe(first.body.nroOrden);
      expect(again.body.ordenId).toBe(first.body.ordenId);
      expect(await stockOf(v)).toBe(4); // not sold twice
      expect(await ordersFor(v)).toHaveLength(1);
    });

    it('also resolves a stale EN_PROCESO row (crashed request) without selling again', async () => {
      const v = await newVariant(5);
      const key = randomUUID();
      const first = await sell(sellerA, [one(v)], key);
      expect(first.status).toBe(201);

      await scratch.query(
        `UPDATE idempotencia SET estado = 'EN_PROCESO', status_code = NULL, respuesta = NULL,
                creado_en = now() - interval '10 minutes' WHERE tenant_id = $1 AND clave = $2`,
        [tenantId, key],
      );
      const again = await sell(sellerA, [one(v)], key);

      expect(again.status).toBe(201);
      expect(again.body.nroOrden).toBe(first.body.nroOrden);
      expect(await stockOf(v)).toBe(4);
      expect(await ordersFor(v)).toHaveLength(1);
    });
  });
});
