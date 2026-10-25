-- =====================================================================
-- Idempotencia de cobros: una clave (cabecera Idempotency-Key) por
-- usuario y tienda guarda la respuesta de la primera ejecucion; los
-- reintentos con la misma clave devuelven esa respuesta sin cobrar de
-- nuevo. Aislada por tienda con la misma politica RLS que el resto.
-- Script idempotente.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS idempotencia (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tienda(id) ON DELETE CASCADE,
    usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    clave       VARCHAR(64) NOT NULL,
    huella      CHAR(64) NOT NULL,
    estado      VARCHAR(15) NOT NULL DEFAULT 'EN_PROCESO' CHECK (estado IN ('EN_PROCESO', 'COMPLETADA')),
    status_code INTEGER,
    respuesta   JSONB,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, usuario_id, clave)
);

CREATE INDEX IF NOT EXISTS idx_idempotencia_creado_en ON idempotencia (creado_en);

ALTER TABLE idempotencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON idempotencia;
CREATE POLICY tenant_isolation ON idempotencia
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON idempotencia TO aura_app;
    END IF;
END $$;

COMMIT;
