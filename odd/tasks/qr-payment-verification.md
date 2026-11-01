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
- [ ] T1 (S4) Server-side shipping method resolution, shared by card/COD/QR; remove hard-coded id. route: inline. commit: -
- [ ] T2 (S3) QR: validated DTO, required unique comprobante, PENDIENTE order and payment, history entry. route: inline. commit: -
- [ ] T3 (S5) Order state machine: transition table (pure, unit tested), payment sync, row lock, stock restored once; client cancel hardened. route: inline. commit: -
- [ ] T4 (S6) Web: QR checkout (required comprobante, bank data, clear result), customer "en verificación", admin confirm/reject. route: inline. commit: -
- [ ] T5 (S2) Break it again: replay the probes (no proof, duplicate proof, bad ids, double cancel race, revive cycle) and a live browser run. route: inline. commit: -

## Log
- L1 (2026-11-02 session, user, verbatim): "sigue con el pago qr, Acordate nada hardcodeado, nada hecho a la fuerza, todo tiene que ser funcional, fluido, reaccionando todo bien como debe ser. Me imagino o me acuerdo que el backend de el QR y los pagos, me imagino que ya estaba capado todo, pero revisarlo y tratar de romperlo a ver si algo puede fallar y que se pueda arreglar."
- Probe evidence: without Idempotency-Key UUID -> 400 (protection exists). With a UUID and no metodoEnvioId -> 400 only because of the hard-coded shipping FK (accident, not a control). With a valid metodoEnvioId and no comprobante -> 201 PAGADO.
