# Stripe: webhooks transaccionales y pago atómico de planes

Objetivo: que los planes se obtengan solo pagando y que el pago (de planes y de pedidos) se confirme de forma atómica e idempotente por webhook.
Branch: feat/planes-stripe-webhooks · Estrategia de entrega: ask-on-risk (push/merge los decide el usuario) · Runner: jest (apps/api), vitest (apps/web)

## Specs

- S1 "Integración de webhooks transaccionales y confirmación atómica de pago de planes." Endpoint público `POST /api/v1/webhooks/stripe`, firma verificada con `STRIPE_WEBHOOK_SECRET` sobre el cuerpo crudo; firma inválida o ausente = 400.
- S2 Idempotencia: cada evento de Stripe se procesa una sola vez (`evento_webhook.stripe_event_id` único); un evento repetido responde 200 sin efectos.
- S3 Confirmación atómica del plan: en una transacción se marca la suscripción ACTIVA y se actualiza `tienda.plan`; se valida monto, moneda y tienda contra lo guardado al crear el checkout, nunca solo contra la metadata.
- S4 "el cambio de plan es gratis": `PATCH /auth/tiendas/cambiar-plan` ya no sube de plan sin pago (402); bajar de plan sigue permitido. Crear una tienda con plan pagado ya no lo concede: nace en FREE_TRIAL.
- S5 Pago del plan: `POST /planes/checkout` crea una Checkout Session de Stripe (modo pago, un período) y una suscripción PENDIENTE_PAGO; el plan solo cambia por webhook. El front redirige a Stripe y consulta el estado al volver.
- S6 Pedidos: el webhook también completa pedidos (respaldo si el cliente cierra la pestaña) con una única función idempotente compartida con `session-status`/`confirm-card`, un lock por sesión y un índice único en `pago(tenant_id, id_transaccion)`.
- S7 Las claves reales no se escriben en el repo ni en documentos; `.env.production.example` documenta las variables.

## Tasks

- T1 (S4) Cerrar el plan gratis — inline — hecho (commit fb524b2, 249 tests API)
- T2 (S1,S2,S3,S5) Migración + servicio de facturación + webhook + rawBody + tests — inline — hecho (commit 7f0c91c, 281 tests API; probado contra Stripe de prueba)
- T3 (S5) Front: checkout de plan, retorno y alta de tienda — inline — hecho (commit 58a0710, 75 tests web; pago real de prueba en Stripe + retorno verificados en navegador)
- T4 (S6) Pedidos idempotentes por webhook + índice único + tests — inline — hecho (commit 76e7aa2, 298 tests API; 5 entregas simultáneas = 1 pedido, verificado contra la API real)
- T5 (S1-S6) Verificación con Stripe de prueba (sesión real + evento firmado) y documentación — inline — hecho (pago real de prueba + retorno en navegador; DEPLOY_MULTITENANT.md y .env.production.example)

## Log

- L1 (2026-10-30) Usuario: "Integración de webhooks transaccionales y confirmación atómica de pago de planes. esto ya esta implemnetado? y si no esta como lo implementariamos?" y luego "aregla esos porblemas, ah estos son los claves del stripe:" (claves de prueba entregadas; ya coinciden con las del `.env` local y no se registran aquí).
- L2 Hallazgos previos: sin webhook; `STRIPE_WEBHOOK_SECRET` declarado pero sin uso; cambiar-plan y crear-tienda otorgan plan sin cobrar; pedidos se confirman solo desde el navegador; `pago.id_transaccion` sin índice único.
- L3 Revisión nativa (riesgo alto, lentes risk/resilience/reliability, candidato fb524b2..76e7aa2): 1 hallazgo CRITICAL introducido, "R3-legacy-plan-lost-on-pending-checkout" (una tienda anterior al cobro perdía su plan al abrir un checkout). Corregido en e669243 con tests; validación dirigida aprobada y autoridad consumida (`acknowledged`). 303 tests API / 75 web.
- L4 Pendientes decididos fuera de alcance: reembolso automático de un pago cobrado sin pedido (hoy se registra en el log para revisión manual); impedir comprar un plan más barato que el vigente; pedidos por PaymentIntent (`confirm-card`) siguen confirmándose desde el navegador, aunque protegidos por el índice único.

