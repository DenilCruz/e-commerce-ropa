-- =====================================================================
-- Plan de suscripción y propietario de cada tienda.
-- El catálogo de planes y sus límites los construye otra persona del equipo
-- sobre este campo; aquí solo queda el punto de unión. Idempotente.
-- =====================================================================

BEGIN;

ALTER TABLE tienda ADD COLUMN IF NOT EXISTS plan VARCHAR(30) NOT NULL DEFAULT 'FREE_TRIAL';
ALTER TABLE tienda ADD COLUMN IF NOT EXISTS propietario_id UUID REFERENCES usuario(id) ON DELETE SET NULL;

-- La tienda original (AURA) ya existía antes de los planes
UPDATE tienda SET plan = 'CORPORATIVO'
WHERE id = 'a0a0a0a0-0000-4000-8000-000000000001' AND plan = 'FREE_TRIAL';

COMMIT;
