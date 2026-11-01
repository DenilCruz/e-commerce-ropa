# Plan limits, role panels, and a real PDF

Branch: feat/aura-spatial-redesign (no commit: the branch already holds unrelated redesign work). Delivery: local, uncommitted. Tests: jest in apps/api, vitest in apps/web.

## Specs

S1. Enforce the plan limits that are advertised and not enforced: user quota on a real membership create, a real branch count with a branch table, the 14-day Free Trial, and the flags posOffline, reportesVozNlp, and modelosPredictivosMl. Paid Standard keeps POS and voice reports and not ML. Corporate keeps all three. An expired trial keeps the name FREE_TRIAL, loses every capability, and creation of products, users, and branches returns 403 with an upgrade message. An expired paid subscription that already falls back to FREE_TRIAL must keep doing that, and that fallback is not the 14-day clock.

S2. "Con respecto a los roles tiene que haber un super admin, el cual es el que tiene más poder. Después yo creo que el dueño, o sea, el que compra una suscripción, vendría a ser el admin. Ya después los roles de vendedor y cliente deben tener sus propios permisos... el cajero sería vendedor." SUPERADMIN is the software maker and can configure, remove, and delete across the platform. ADMIN is the store owner. VENDEDOR sells and is the cashier. CLIENTE sees their own activity. There is no CAJERO role. EMPLEADO keeps working as a seller. Each staff role and the client get a screen that matches that job. Keep the current visual style.

S3. The dynamic report must download a real PDF file. The Excel download stays.

S4. "manteniendo el estilo del frontend y, si algo se rompe, que lo arregles." Do not redesign. Do not modify the virtual fitting room. Do not write ICONIX docs. Do not merge to main.

S5. "puedes levantar en local la web... para entrar, ver las vistas, si carga, que no carga, queda error." Boot the local web and check the changed screens in a browser.

## Tasks

- T1 S1 inline — trial clock, user quota on join, branch count, capability gate. RED then GREEN in plan-limits and auth specs.
- T2 S2 inline — SUPERADMIN, VENDEDOR alias, seller and client screens, nav. Risk item 2.
- T3 S3 inline — PDF bytes and the download button. vitest.
- T4 S5 inline — apply SQL on the local database, boot API and web, browser check.
- T5 S2 — review-risk on the auth diff after the tests pass.

## Log

L1. User: fix the three gaps, keep the frontend style, hierarchy super admin / admin (owner) / vendedor (cajero) / cliente, boot the local web and look at it. Then: use Gentle AI (ODD, reviewers, subagents) in the Grok configuration. ICONIX docs and merge to main are out of scope. Do not touch the fitting room.

L2. 2026-11-01. Applied database/13_plan_roles.sql on ecommerce_postgres. AURA had no propietario_id and four ADMIN memberships, so only diegoastetepaz@gmail.com was promoted to global SUPERADMIN and set as propietario. Moda Luna trial ends 2026-11-07. Jest plan/roles/auth/stores/pos and vitest PDF/roles/excel passed. Browser: store, client activity, seller puesto, owner URLs bounce the seller. review-risk subagent returned no inspection because this runtime has no Gentle AI review binding.
