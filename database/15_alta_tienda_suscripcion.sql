-- =====================================================================
-- Alta de tienda al pagar + ciclo de vida de la suscripcion de Stripe.
--  * alta_tienda: una compra de plan hecha por alguien que TODAVIA no
--    tiene tienda. La tienda se crea solo cuando el webhook firmado
--    confirma el pago. Es global (sin RLS) porque el tenant aun no existe:
--    la API siempre filtra por usuario_id.
--  * suscripcion_stripe: indice global (sin RLS) para que los eventos de
--    Stripe sin sesion (renovacion, cancelacion) encuentren la tienda de
--    una suscripcion. Solo guarda ids; no hay datos de pago.
--  * suscripcion: el cobro pasa de pago unico a suscripcion recurrente.
-- Las dos tablas nuevas usan tienda_id (no tenant_id) a proposito: no son
-- datos de una tienda, asi que no entran en la regla de aislamiento.
-- Script idempotente.
-- =====================================================================

BEGIN;

ALTER TABLE suscripcion ADD COLUMN IF NOT EXISTS stripe_subscription_id  VARCHAR(255);
ALTER TABLE suscripcion ADD COLUMN IF NOT EXISTS stripe_customer_id      VARCHAR(255);
ALTER TABLE suscripcion ADD COLUMN IF NOT EXISTS cancelar_al_vencer      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE suscripcion ADD COLUMN IF NOT EXISTS ultimo_cobro_fallido_en TIMESTAMPTZ;

-- El estado admite CANCELADA (la suscripcion termino y no se renueva)
ALTER TABLE suscripcion DROP CONSTRAINT IF EXISTS suscripcion_estado_check;
ALTER TABLE suscripcion ADD CONSTRAINT suscripcion_estado_check
    CHECK (estado IN ('PENDIENTE_PAGO', 'ACTIVA', 'FALLIDA', 'EXPIRADA', 'CANCELADA'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_suscripcion_stripe_subscription
    ON suscripcion (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS alta_tienda (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id        UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    nombre            VARCHAR(100) NOT NULL,
    plan              VARCHAR(20) NOT NULL CHECK (plan IN ('ESTANDAR', 'CORPORATIVO')),
    periodo           VARCHAR(10) NOT NULL CHECK (periodo IN ('MENSUAL', 'ANUAL')),
    monto             NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
    moneda            VARCHAR(3) NOT NULL DEFAULT 'usd',
    estado            VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE_PAGO'
                      CHECK (estado IN ('PENDIENTE_PAGO', 'ACTIVADA', 'EXPIRADA', 'FALLIDA')),
    stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
    tienda_id         UUID REFERENCES tienda(id) ON DELETE SET NULL,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alta_tienda_usuario ON alta_tienda (usuario_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS suscripcion_stripe (
    stripe_subscription_id VARCHAR(255) PRIMARY KEY,
    tienda_id              UUID NOT NULL REFERENCES tienda(id) ON DELETE CASCADE,
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_app') THEN
        GRANT SELECT, INSERT, UPDATE ON alta_tienda TO aura_app;
        GRANT SELECT, INSERT ON suscripcion_stripe TO aura_app;
    END IF;
END $$;

COMMIT;
