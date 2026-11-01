-- Trial deadline, real branches, and the platform / seller roles.
-- Idempotent. Docker init does not re-run this on an existing volume.

BEGIN;

ALTER TABLE tienda ADD COLUMN IF NOT EXISTS prueba_vence_en TIMESTAMP;

UPDATE tienda
SET prueba_vence_en = creado_en + INTERVAL '14 days'
WHERE plan = 'FREE_TRIAL' AND prueba_vence_en IS NULL;

CREATE TABLE IF NOT EXISTS sucursal (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tienda(id) ON DELETE CASCADE,
    nombre      VARCHAR(120) NOT NULL,
    direccion   VARCHAR(200),
    activa      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO sucursal (tenant_id, nombre, activa)
SELECT t.id, 'Casa matriz', TRUE
FROM tienda t
WHERE NOT EXISTS (SELECT 1 FROM sucursal s WHERE s.tenant_id = t.id);

ALTER TABLE sucursal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sucursal;
CREATE POLICY tenant_isolation ON sucursal
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON sucursal TO aura_app;
GRANT SELECT ON sucursal TO aura_reports;

INSERT INTO rol (nombre, descripcion)
SELECT 'SUPERADMIN', 'Operador de la plataforma'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre = 'SUPERADMIN');

INSERT INTO rol (nombre, descripcion)
SELECT 'VENDEDOR', 'Ventas de mostrador, inventario y pedidos'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre = 'VENDEDOR');

-- The platform operator is identified by a fixed e-mail, never by a store slug:
-- a slug comes from a name any tenant can register.
UPDATE usuario
SET rol_id = (SELECT id FROM rol WHERE nombre = 'SUPERADMIN')
WHERE correo = 'admin@aura-atelier.com'
  AND EXISTS (SELECT 1 FROM rol WHERE nombre = 'SUPERADMIN');

COMMIT;
