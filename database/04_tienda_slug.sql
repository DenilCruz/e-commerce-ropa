-- =====================================================================
-- Identificador corto de tienda (slug) para resolver el tenant de las
-- peticiones sin sesión. Script idempotente.
-- =====================================================================

BEGIN;

ALTER TABLE tienda ADD COLUMN IF NOT EXISTS slug VARCHAR(60);

UPDATE tienda SET slug = 'aura'
WHERE id = 'a0a0a0a0-0000-4000-8000-000000000001' AND slug IS NULL;

-- Cualquier otra tienda existente sin slug recibe uno derivado de su id
UPDATE tienda SET slug = lower(regexp_replace(nombre, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE tienda ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tienda_slug ON tienda(slug);

COMMIT;
