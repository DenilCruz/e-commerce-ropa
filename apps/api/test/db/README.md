# Tenant isolation tests (real Postgres)

`tenant-isolation.spec.ts` proves the multi-tenant isolation (row-level security) against a real
Postgres. Mocks cannot prove RLS, so this is the only test that does.

## Run it

One command (needs Docker; starts a throwaway `postgres:16-alpine` on port 55433 and always removes it):

    pnpm --filter @ecommerce/api test:db

Against a Postgres you control (superuser URL; the suite creates and drops its own scratch database):

    TEST_DB_ADMIN_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter @ecommerce/api test:db:url

Without `TEST_DB_ADMIN_URL`, `pnpm test` skips the suite with a message, so machines without Postgres stay
green. `test:db` and `test:db:url` set `TEST_DB_REQUIRED=1`, which turns a missing URL into a failure.

## What it does

- Applies every `database/NN_*.sql` in numeric order (auto-discovered; new migrations need no edit here).
  Data seeds (`02_seed_*`, `03_seed_*`) and `dump_completo.sql` are excluded: they load demo rows or a full dump.
- Seeds two stores (Moda Luna, Moda Sol) with users, memberships, products, orders and subscriptions.

## What it proves

- Schema guard: every table with `tenant_id` has RLS enabled and a policy with `USING` and `WITH CHECK`; the
  list of tables is read from `pg_catalog`, so a future table without RLS fails the suite.
- Roles: `aura_app` is not superuser and has `NOBYPASSRLS`; `aura_reports` is non-login and `NOBYPASSRLS`;
  neither owns a table; the startup check in `tenant-isolation.bootstrap.ts` agrees.
- Reads as `aura_app`: only the active store rows on every RLS table; no active store returns 0 rows, not an error.
- `WITH CHECK`: inserting into or moving a row to another store is rejected (categoria, producto, nota_venta,
  suscripcion, sucursal, usuario_tienda).
- `UPDATE`/`DELETE` never reach another store's rows (row counts, and the other store's rows stay identical).
- `aura_reports` (AI-generated SQL, via `SET LOCAL ROLE` in a transaction like `dynamic-reports.service.ts`):
  reads only the current store, only granted tables, never `usuario.contrasena`; holds no write privilege;
  INSERT/UPDATE/DELETE/TRUNCATE and DDL are denied.

## Documented exceptions (tables without isolation)

Defined in `GLOBAL_TABLES` in the spec, with the reason next to each entry. The list is exact: a stale entry
fails and an unlisted tenant-less table fails.

`tienda`, `rol`, `estado_rol`, `talla`, `color`, `metodo_pago`, `metodo_envio`, `token`, `direccion`,
`evento_webhook`, plus the platform tables `alta_tienda`, `plataforma_auditoria`, `suscripcion_stripe`
(tolerated when migrations 15/16 are present). `usuario` has RLS by design (the API sees all users; reports
see only members of the active store).

Known gap: `evento_webhook` has a `tenant_id` column but no RLS, so `aura_app` can read every store's webhook
event metadata.
