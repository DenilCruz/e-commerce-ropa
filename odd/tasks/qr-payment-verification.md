# qr-payment-verification
Objective: QR payments are verified by the store before an order counts as paid, and the order state machine can no longer be abused (free goods, stock inflation).
Branch: feat/aura-spatial-redesign. Delivery: ask-on-risk. Test runner: jest (apps/api) for pure logic, plus live API probes and browser walkthrough.
Risk: items 1 (stored order/payment data semantics), 2 (payment security) and 4 (concurrency) of the Task Size high-risk list.

## Specs
- S1: "sigue con el pago qr" and "nada hardcodeado, nada hecho a la fuerza, todo tiene que ser funcional, fluido, reaccionando todo bien como debe ser".
- S2: "revisarlo y tratar de romperlo a ver si algo puede fallar y que se pueda arreglar".
- S3 (finding, reproduced live): POST /payments/qr with no comprobante returned 201 with estadoOrden PAGADO (order NV-2026-00909). A QR order must start PENDIENTE with payment PENDIENTE, and only the store can confirm it.
- S4 (finding): the API falls back to a hard-coded shipping method id when the client omits it (envio_metodo_envio_id_fkey violation). The method must be resolved server side from the database.
- S5 (finding): OrdersService.actualizarEstadoAdmin has no transition rules and does not sync the payment; cancel/revive cycles inflate stock; cancelarPedidoCliente allows REEMBOLSADO, ignores payment PENDIENTE and has no row lock.
- S6: Customers see "pago en verificación"; admins get explicit confirm/reject actions with the comprobante visible.

## Tasks
- [x] T1 (S4) Server-side shipping method resolution, shared by card/COD/QR; remove hard-coded id. route: inline. commit: see L2
- [x] T2 (S3) QR: validated DTO, required unique comprobante, PENDIENTE order and payment, history entry. route: inline. commit: see L2
- [x] T3 (S5) Order state machine: transition table (pure, unit tested), payment sync, row lock, stock restored once; client cancel hardened. route: inline. commit: see L2
- [x] T4 (S6) Web: QR checkout (required comprobante, bank data, clear result), customer "en verificación", admin confirm/reject. route: inline. commit: see L2
- [x] T5 (S2) Break it again: replay the probes (no proof, duplicate proof, bad ids, double cancel race, revive cycle) and a live browser run. route: inline. commit: see L2

## Log
- L1 (2026-11-02 session, user, verbatim): "sigue con el pago qr, Acordate nada hardcodeado, nada hecho a la fuerza, todo tiene que ser funcional, fluido, reaccionando todo bien como debe ser. Me imagino o me acuerdo que el backend de el QR y los pagos, me imagino que ya estaba capado todo, pero revisarlo y tratar de romperlo a ver si algo puede fallar y que se pueda arreglar."
- Probe evidence: without Idempotency-Key UUID -> 400 (protection exists). With a UUID and no metodoEnvioId -> 400 only because of the hard-coded shipping FK (accident, not a control). With a valid metodoEnvioId and no comprobante -> 201 PAGADO.
- L2 (2026-11-01, user, verbatim): "Acuérdate que el qr lo estamos haciendo simulado, o sea, esto para defenderlo con el docente más no lo vamos a llevar a producción en verdad, no lo vamos a atar a un QR de verdad, no vamos a traspasar dinero de verdad. Es simulado, para que el docente vea cómo sería si en verdad fuera de verdad. [...] en lo que respecta a pagos, tiene que ser de verdad." Reading: the bank, the QR and the money are demonstration data; the payment logic must be real. Done and verified: (a) 29-step attack script against the live API now passes 29/29 (invalid inputs, duplicate receipt, same receipt in parallel, same cart sent twice at once, shipping before payment, reviving a cancelled order, double cancel, malformed ids); (b) unit suite 32 suites / 387 tests; (c) browser run: customer pays by QR -> "Pago en verificación" -> store sees "Por verificar" with receipt and amount -> confirms -> customer sees "Pago aprobado". Also fixed: bank data of the platform was hard-coded in the API (now PLATFORM_PAYMENT_* env, QR hidden when unset), a payment answer named the method from the receipt prefix (QR order said "Tarjeta"), refunds without a lock, cancelling a paid card order marked it refunded without moving money, and a shared cart lock. Demo store configured through the admin API with the sample QR image and "Banco Nacional (demo)". Test orders cancelled to give the stock back. Open: the mobile app still sends fixed shipping method ids and shows fixed prices; automatic expiry of unpaid QR reservations is not implemented (the store rejects or confirms by hand).

