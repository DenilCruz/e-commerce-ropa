# Multi-tenant SaaS (Pilar 1)

Objective: convert AURA from a single store to a multi-tenant SaaS (shared DB with `tenant_id`). Branch: `feat/multi-tenant`. Delivery: ask-on-risk. Test runner: Jest (`apps/api/test/unit`), plus SQL checks against a scratch Postgres.

## Specs

- S1: "Esto era para una tienda de ropa, ¿no? Ahora lo vamos a hacer para muchas tiendas. Es decir, multi-tiendas. Bajo un esquema SaaS."
- S2: "El cliente solo se debe suscribir. Y automáticamente, la aplicación debe crear [...] su espacio de trabajo." (automatic workspace provisioning)
- S3: "el mismo cliente puede tener más de una tienda. Y va a usar el mismo email." One email, several stores; a store selector / active store is required.
- S4 (decision): existing data (21 productos, 7 pedidos, 15 categorías, usuarios) is KEPT and assigned to a first tenant "AURA". Exam 1 must keep working 100%.
- S5 (decision): `talla`, `color`, `metodo_envio`, `rol`, `metodo_pago` are shared (global). These get `tenant_id`: producto, producto_variante, imagen_producto, categoria, marca, proveedor, cupon, cupon_uso, promocion, detalle_promocion, carrito, detalle_carrito, nota_venta, detalle_nota_venta, pago, envio, historial_venta, nota_compra, detalle_nota_compra, cotizacion, detalle_cotizacion, caja, empleado, resena, devolucion, detalle_devolucion, favorito, bitacora (to be confirmed table by table in T1).
- S6 (decision): membership table `usuario_tienda(usuario_id, tienda_id, rol_id)`: one user, many stores, one role per store.
- S7 (decision): isolation = API filter (active tenant in the JWT) + Postgres Row-Level Security from the start.
- S8: Global UNIQUE constraints that must become composite with `tenant_id`: cupon.codigo, marca.nombre, producto_variante.sku, nota_venta.nro, nota_compra.nro, carrito.usuario_id.
- S9: Rule from the plan: the virtual try-on module is not modified.

## Tasks

- T1 (S4, S5, S6, S8): SQL migration `database/03_multi_tenant.sql` (01_init_schema.sql stays untouched; 03 runs after it on fresh DBs) + AURA backfill, validated on scratch DBs. Reviewed and approved; advisory: add an automated migration test in T6. Route: inline. Commit: see git log (feat(db): add multi-tenant migration).
- T2 (S5, S6): Update TypeORM entities with `tenantId` and add `usuario_tienda` entity. Route: inline. Commit: feat(api) tenant entities. Note: entities alone do not run against the migrated DB; T3 must fill tenant_id on insert before the migration is applied to the dev DB.
- T3 (S7): Tenant context in the API (JWT claim, guard, automatic filter in repositories/queries). Route: inline. Commit: pending.
- T4 (S2, S3): Store registration with provisioning, list my stores, switch active store (new JWT). Route: inline. Commit: pending.
- T5 (S7): RLS policies + per-request `SET LOCAL app.tenant_id`. Route: inline. Commit: pending.
- T6 (S3, S7): Isolation tests (two tenants, same email, cross-tenant read denied). Route: inline. Commit: pending.

## Log

- L1 (2026-10-24, user): "Okay comencemos con la migración multi-tenant"
- L2 (2026-10-24, user): chose to keep the current data and assign it to AURA; shared catalogs (talla, color, envío); `usuario_tienda` with role per store; API filter + RLS from the start.
- L4 (2026-10-24, user): buyers (rol CLIENTE) belong to the store where they buy (`usuario_tienda` with rol CLIENTE); their cart, orders and favorites are per store. Same email can join another store.
- L3 (2026-10-24): audit found `tienda` empty, only caja/cotizacion/nota_venta/nota_compra reference it, `synchronize: false`, migrations folder empty.
