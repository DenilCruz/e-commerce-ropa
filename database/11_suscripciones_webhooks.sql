-- =====================================================================
-- Pago de planes por Stripe.
--  * suscripcion: un intento de compra de plan (se crea PENDIENTE_PAGO al
--    abrir el checkout y pasa a ACTIVA solo por el webhook firmado).
--  * evento_webhook: cada evento de Stripe se procesa una sola vez (la
--    clave primaria es el id del evento); no es por tienda.
-- Una tienda sin filas en suscripcion conserva su plan (tiendas creadas
-- antes del cobro). Script idempotente.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS suscripcion (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                UUID NOT NULL REFERENCES tienda(id) ON DELETE CASCADE,
    usuario_id               UUID REFERENCES usuario(id) ON DELETE SET NULL,
    plan                     VARCHAR(20) NOT NULL CHECK (plan IN ('ESTANDAR', 'CORPORATIVO')),
    periodo                  VARCHAR(10) NOT NULL CHECK (periodo IN ('MENSUAL', 'ANUAL')),
    monto                    NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
    moneda                   VARCHAR(3) NOT NULL DEFAULT 'bob',
    estado                   VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE_PAGO'
                             CHECK (estado IN ('PENDIENTE_PAGO', 'ACTIVA', 'FALLIDA', 'EXPIRADA')),
    stripe_session_id        VARCHAR(255) NOT NULL UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    inicio_en                TIMESTAMPTZ,
    vence_en                 TIMESTAMPTZ,
    creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suscripcion_tenant ON suscripcion (tenant_id, creado_en DESC);

ALTER TABLE suscripcion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON suscripcion;
CREATE POLICY tenant_isolation ON suscripcion
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS evento_webhook (
    stripe_event_id VARCHAR(255) PRIMARY KEY,
    tipo            VARCHAR(100) NOT NULL,
    tenant_id       UUID,
    resultado       VARCHAR(20) NOT NULL DEFAULT 'PROCESADO',
    recibido_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON suscripcion TO aura_app;
        GRANT SELECT, INSERT ON evento_webhook TO aura_app;
    END IF;
END $$;

COMMIT;
