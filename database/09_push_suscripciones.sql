-- =====================================================================
-- Suscripciones de Web Push (notificaciones del navegador / PWA).
-- Cada administrador suscribe su navegador a su tienda; el endpoint es
-- unico por tienda. Aisladas por tienda con la misma politica RLS.
-- Script idempotente.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS push_suscripcion (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tienda(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, endpoint)
);

ALTER TABLE push_suscripcion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON push_suscripcion;
CREATE POLICY tenant_isolation ON push_suscripcion
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON push_suscripcion TO aura_app;
    END IF;
END $$;

COMMIT;
