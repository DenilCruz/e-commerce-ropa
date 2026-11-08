-- =====================================================================
-- Columnas de imagen que las entidades ya usan y que ningun script
-- numerado creaba (solo existian en dump_completo.sql, anterior al
-- multi-tienda). Sin ellas, GET /productos falla con
-- "column categoria.imagen does not exist" en una base armada solo con
-- los scripts numerados. Columnas nuevas y opcionales; idempotente.
-- =====================================================================

BEGIN;

ALTER TABLE categoria       ADD COLUMN IF NOT EXISTS imagen    VARCHAR(500);
ALTER TABLE imagen_producto ADD COLUMN IF NOT EXISTS public_id VARCHAR(255);

COMMIT;
