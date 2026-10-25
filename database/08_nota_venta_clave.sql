-- =====================================================================
-- Garantia en base de datos de que una venta de mostrador no se duplica:
-- cada venta lleva la Idempotency-Key con la que se registro, y la clave
-- es unica por tienda. Aunque falle el guardado de la respuesta en la
-- tabla idempotencia, repetir la peticion no puede crear otro pedido.
-- Script idempotente; solo agrega una columna opcional y un indice.
-- =====================================================================

BEGIN;

ALTER TABLE nota_venta ADD COLUMN IF NOT EXISTS clave_idempotencia UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nota_venta_clave
    ON nota_venta (tenant_id, clave_idempotencia)
    WHERE clave_idempotencia IS NOT NULL;

COMMIT;
