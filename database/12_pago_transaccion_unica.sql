-- =====================================================================
-- Un cobro de pasarela solo puede quedar registrado una vez por tienda.
-- El navegador del cliente y el webhook de Stripe confirman el mismo pago;
-- este indice es la ultima barrera contra pedidos duplicados.
-- Si ya hay duplicados el script se detiene y los lista para resolverlos
-- a mano antes de crear el indice. Script idempotente.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    repetidos INTEGER;
BEGIN
    SELECT count(*) INTO repetidos FROM (
        SELECT tenant_id, id_transaccion FROM pago
        WHERE id_transaccion IS NOT NULL
        GROUP BY tenant_id, id_transaccion
        HAVING count(*) > 1
    ) d;
    IF repetidos > 0 THEN
        RAISE EXCEPTION 'Hay % transacciones repetidas en pago (tenant_id, id_transaccion). Resuelvelas antes de crear el indice unico.', repetidos;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_tenant_transaccion
    ON pago (tenant_id, id_transaccion)
    WHERE id_transaccion IS NOT NULL;

COMMIT;
