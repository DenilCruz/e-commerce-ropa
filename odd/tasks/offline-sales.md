# Offline sales (Pilar 2 / CU-02)

Objective: a seller registers a sale in the browser with no internet, it is queued locally and synced later without duplicates or oversold stock. Branch: main (work-unit commits). Delivery: ask-on-risk, no push without the user. Test runner: Jest (`apps/api/test/unit`); web: Vitest + fake-indexeddb (to be added as devDependencies).

## Specs

- S1: "Otra característica es que debe ser, debe operar sin mayores inconvenientes. En condiciones de ausencia de internet." (teacher, P1)
- S2: "Ya estoy en un navegador, abrí el sistema, estoy registrando una venta, lo que sea, y se va a internet. El sistema tiene que ser trabajado." (teacher, P1: a seller registers a sale in the browser with no internet)
- S3: "En el dispositivo offline, la venta se registra en la base de datos local (SQLite/IndexedDB) en estado 'Pendiente de Sincronización'." (plan, Pregunta 2)
- S4: "la primera transacción ... se procesa dentro de una transacción atómica y descuenta el stock de 1 a 0 ... el backend valida el stock actual dentro de la transacción, detecta el quiebre de stock, ejecuta un ROLLBACK estricto y responde con un error de conflicto de concurrencia (HTTP 409)." (plan)
- S5: "El dispositivo del segundo vendedor recibe la respuesta y cambia el estado de la venta local a 'Venta en Conflicto / Quiebre de Stock', permitiendo al vendedor gestionar una reposición, cambio de prenda o cancelación" (plan)
- S6: "Idempotency-Key ... El cliente (móvil o web) genera un identificador único (UUID v4) al momento de iniciar la acción de cobro." (plan; backend middleware already done, commit 8206287)
- S7: "Indicador visual en UI del estado de conexión (Online/Offline). Interfaz de cola de sincronización pendiente." (plan, Pilar 2)
- S8: "Categóricamente no. Los pagos electrónicos ... requieren comunicación sincrónica" (plan, Pregunta 5): card and QR charges never run offline; the offline sale is cash only.
- S9 (decision, user 2026-10-25): "mejor la opcion recomendad aunque haya que crear cosas, si eso resuelve lo que pide el docente y no dejamos huecos entonces hazlo" -> new point-of-sale screen plus a new endpoint that takes the items in the body (the server cart cannot be built offline).
- S10 (assumption): the seller is an ADMIN user (the admin panel only admits ADMIN today); EMPLEADO access to the panel is out of scope.
- S11 (assumption): the app shell and the catalog must also be available offline, otherwise a reload without internet shows nothing: catalog snapshot in IndexedDB and a service worker for the shell (PWA).

## Tasks

- [x] T1 (S4, S6, S8, S9): POST `/sales/pos` backend: items in body, cash sale, atomic with row locks, 409 per item on stock, Idempotency-Key. Route: inline. 149 tests OK; over HTTP on a scratch DB: replay of the same key = 1 order, 6 parallel sales for the last unit = one 201 and five 409 (stock 0), 8 parallel sales = 8 distinct numbers, device date stored as the same instant NOW() would. Commit: see git log (feat(api): add POST /sales/pos).
- [x] T2 (S3, S11): IndexedDB layer in web: sales outbox + catalog snapshot, tests with fake-indexeddb. Route: inline. 18 Vitest tests OK (devDependencies vitest + fake-indexeddb added). Decisions: the sale id is its Idempotency-Key; stock is reserved on the device atomically (two offline sales cannot take the last unit); a sale whose items change gets a new id; the queue keeps creation order with a sequence number.
- [x] T3 (S3-S6): sync engine: flush on reconnect/interval, states PENDIENTE / SINCRONIZANDO / SINCRONIZADA / CONFLICTO / ERROR, one UUID per sale. Route: inline. 13 tests (31 total in Vitest). Decisions: sequential and in order; network/5xx/401 stop the run and keep the sale PENDIENTE; 409 STOCK_CONFLICT -> CONFLICTO and the run goes on; other 409/408/429 retried; other 4xx -> ERROR; only the active store and user are sent; one sync at a time (Web Locks across tabs); backoff 5s doubling to 60s (the timer itself belongs to T4).
- [ ] T4 (S2, S5, S7): POS page `/admin/ventas`, connection indicator, pending-queue panel with conflict handling. Route: inline.
- [ ] T5 (S1, S11): PWA shell (service worker) so the app opens offline; manual offline check in the browser. Route: inline.

## Log

- L1 (2026-10-25, user): "mejor la opcion recomendad aunque haya que crear cosas, si eso resuelve lo que pide el docente y no dejamos huecos entonces hazlo" (answering: new POS screen + `POST /ventas/offline`-style endpoint with items in the body, then IndexedDB queue in web, then mobile SQLite).
- Context: idempotency interceptor + stock 409 on card/cash/QR charges done and verified over HTTP (8206287). Mobile SQLite client, CU-02 ICONIX document and the user manual remain for later tasks of Pilar 2.
