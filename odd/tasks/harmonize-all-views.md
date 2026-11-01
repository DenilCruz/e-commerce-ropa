# harmonize-all-views
Objective: every store, auth, checkout and admin view matches the approved landing (dark charcoal, champagne accents, same buttons), sober and real-app, no stray white surfaces.
Branch: feat/aura-spatial-redesign. Delivery: ask-on-risk. Test runner: none for visuals; check live in the browser (desktop + 390px).

## Specs
- S1: "tenga el mismo estilo de botones, de colores, pero ya más sobrio, haciendo la web real" (landing is the reference; views are Operate/Read mode, not showpieces).
- S2: "donde muestran la ropa, donde se paga, etcétera, que quede bien" (catalog, product detail, cart, checkout, orders).
- S3: "hasta el último flujo, hasta la última vista" (every route in router/index.tsx).
- S4: "si algo está demasiado blanco, un fondo, y se arregla" (find and fix surfaces that clash with the landing).
- S5: Scope is presentation only: preserve routing, tenant isolation, auth, cart state, payments, existing APIs (PRODUCT.md).

## Tasks
- [ ] T1 (S1,S2,S4) Store public: home /t/aura, catalogo, producto/:id, probador, carrito, tracking. route: inline. commit: -
- [ ] T2 (S2,S4) Customer flow: checkout, checkout/return, pedidos, perfil, favoritos. route: inline. commit: -
- [ ] T3 (S1,S4) Auth: login, registro, recuperar-password, restablecer-password, verificar-email, planes/retorno. route: inline. commit: -
- [ ] T4 (S1,S4) Admin analytics: dashboard, dashboard-predictivo, reportes, reportes-dinamicos. route: inline. commit: -
- [ ] T5 (S1,S4) Admin catalog: productos, categorias, inventario, cupones, archivos. route: inline. commit: -
- [ ] T6 (S1,S4) Admin operations: ventas (POS), pedidos, envios, usuarios, pagos-config, resenas. route: inline. commit: -
- [ ] T7 (S3) Final pass: mobile 390px across all routes, console errors, reduced motion. route: inline. commit: -

## Log
- L1 (2026-11-01, user, verbatim): "Ahora sí podés comitearlo para mí la landing page ya quedó lista. [...] Y ahora vamos tenemos que dejar si bien ya hay comenzado, pero hay que ver hasta el último flujo, hasta la última vista, que tenga el mismo estilo de botones, de colores, pero ya más sobrio, haciendo la web real, ¿no ve? Donde muestran la ropa, donde se paga, etcétera, que quede bien. Vamos a revisar todo eso. podéis ir revisándolo vos, viendo levantándolo como ahorita está, viendo que no concuerda que no se empareja como está la landing, los colores, etcétera, si algo está demasiado blanco, un fondo, y se arregla."
- 2026-11-01: landing committed as 786ee8f. API :3001 (DB_NAME=ecommerce_db_demo) and web :5173 running. Demo admin admin@aura-atelier.com (login fields correo/contrasena). Route is large: tracked per ODD. Method: programmatic light-surface scan per route, then look only at flagged views.
- L2 (2026-11-01, user, verbatim): "dejalo crema y alinear los botones, acentos, tipografía, como la landing." Decision: the store (/t/:slug/*) stays cream/ivory; only buttons, accents and typography are aligned with the landing (S1 refined). Auth and admin keep their dark theme.
