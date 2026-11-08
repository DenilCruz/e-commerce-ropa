-- =====================================================================
-- Push por Expo (app movil): push_suscripcion admite un segundo canal.
-- Las filas WEBPUSH siguen exigiendo endpoint + p256dh + auth; las filas
-- EXPO guardan solo el expo_token. Mismo RLS por tienda (no se toca).
-- Script idempotente.
-- =====================================================================

BEGIN;

ALTER TABLE push_suscripcion ADD COLUMN IF NOT EXISTS canal VARCHAR(10) NOT NULL DEFAULT 'WEBPUSH';
ALTER TABLE push_suscripcion ADD COLUMN IF NOT EXISTS expo_token TEXT;

ALTER TABLE push_suscripcion ALTER COLUMN endpoint DROP NOT NULL;
ALTER TABLE push_suscripcion ALTER COLUMN p256dh DROP NOT NULL;
ALTER TABLE push_suscripcion ALTER COLUMN auth DROP NOT NULL;

ALTER TABLE push_suscripcion DROP CONSTRAINT IF EXISTS push_suscripcion_canal_check;
ALTER TABLE push_suscripcion ADD CONSTRAINT push_suscripcion_canal_check
    CHECK (canal IN ('WEBPUSH', 'EXPO'));

ALTER TABLE push_suscripcion DROP CONSTRAINT IF EXISTS push_suscripcion_datos_canal_check;
ALTER TABLE push_suscripcion ADD CONSTRAINT push_suscripcion_datos_canal_check CHECK (
    (canal = 'WEBPUSH' AND endpoint IS NOT NULL AND p256dh IS NOT NULL AND auth IS NOT NULL)
    OR (canal = 'EXPO' AND expo_token IS NOT NULL)
);

-- UNIQUE (tenant_id, endpoint) from script 09 stays for web rows (NULL endpoints never collide)
CREATE UNIQUE INDEX IF NOT EXISTS push_suscripcion_tenant_expo_token_uq
    ON push_suscripcion (tenant_id, expo_token) WHERE expo_token IS NOT NULL;

COMMIT;
