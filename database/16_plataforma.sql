-- =====================================================================
-- Platform operator console (SUPERADMIN): cross-tenant aggregates and audit trail.
--
-- The API connects as aura_app (NOBYPASSRLS) and suscripcion / producto / nota_venta /
-- usuario_tienda are protected by the tenant_isolation policies, so a plain query can never
-- see another store. Instead of weakening a policy or granting BYPASSRLS, the reads below are
-- SECURITY DEFINER functions: they run as their owner (the role that owns the tables and that
-- applied the migrations, which is exempt from RLS because no table uses FORCE ROW LEVEL
-- SECURITY) and return ONLY the aggregates / columns the console shows. No password hash,
-- token or payment secret is selectable through them.
-- Defence in depth: every function refuses to run unless app.user_id (published by the API
-- connection hook from the signed session) belongs to a SUPERADMIN account.
-- If the migration is applied by a role that does not own the tables, the functions will not
-- bypass RLS and return empty sets; apply it with the table owner.
-- Idempotent. Docker init does not re-run this on an existing volume.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS plataforma_auditoria (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id  UUID REFERENCES usuario(id) ON DELETE SET NULL,
    accion      VARCHAR(50) NOT NULL,
    tienda_id   UUID REFERENCES tienda(id) ON DELETE SET NULL,
    detalle     JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plataforma_auditoria_tienda ON plataforma_auditoria (tienda_id, creado_en DESC);

-- Global table (no tenant_id): only the platform API appends and reads it. No update/delete.
REVOKE ALL ON plataforma_auditoria FROM PUBLIC;

-- Caller must be the platform operator.
CREATE OR REPLACE FUNCTION plataforma_exigir_operador() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM usuario u
        JOIN rol r ON r.id = u.rol_id
        WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
          AND r.nombre = 'SUPERADMIN'
          AND u.activo
    ) THEN
        RAISE EXCEPTION 'plataforma: operador no autorizado' USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION plataforma_resumen() RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    resultado jsonb;
BEGIN
    PERFORM plataforma_exigir_operador();

    SELECT jsonb_build_object(
        'tiendasTotal', (SELECT count(*) FROM tienda),
        'porEstado', COALESCE((SELECT jsonb_object_agg(estado, n)
                               FROM (SELECT estado, count(*) AS n FROM tienda GROUP BY estado) e), '{}'::jsonb),
        'porPlan', COALESCE((SELECT jsonb_object_agg(plan, n)
                             FROM (SELECT plan, count(*) AS n FROM tienda GROUP BY plan) p), '{}'::jsonb),
        'nuevas30d', (SELECT count(*) FROM tienda WHERE creado_en >= now() - INTERVAL '30 days'),
        -- one paid, unexpired subscription per active store (the highest plan wins)
        'suscripcionesVigentes', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('plan', plan, 'periodo', periodo, 'cantidad', n))
            FROM (
                SELECT plan, periodo, count(*) AS n
                FROM (
                    SELECT DISTINCT ON (s.tenant_id) s.tenant_id, s.plan, s.periodo
                    FROM suscripcion s
                    JOIN tienda t ON t.id = s.tenant_id AND t.estado = 'ACTIVA'
                    WHERE s.estado = 'ACTIVA' AND s.vence_en > now()
                    ORDER BY s.tenant_id, (s.plan = 'CORPORATIVO') DESC, s.inicio_en DESC NULLS LAST
                ) mejor
                GROUP BY plan, periodo
            ) g), '[]'::jsonb),
        'ingresosMesUsd', COALESCE((
            SELECT sum(monto) FROM suscripcion
            WHERE estado = 'ACTIVA' AND lower(moneda) = 'usd'
              AND inicio_en >= date_trunc('month', now())
              AND inicio_en < date_trunc('month', now()) + INTERVAL '1 month'), 0)
    ) INTO resultado;

    RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION plataforma_listar_tiendas(
    p_busqueda TEXT,
    p_plan TEXT,
    p_estado TEXT,
    p_limite INT,
    p_offset INT
) RETURNS TABLE (
    id UUID,
    nombre VARCHAR,
    slug VARCHAR,
    plan VARCHAR,
    estado VARCHAR,
    propietario_correo VARCHAR,
    usuarios BIGINT,
    productos BIGINT,
    pedidos BIGINT,
    vence_en TIMESTAMPTZ,
    creado_en TIMESTAMP,
    total BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM plataforma_exigir_operador();

    RETURN QUERY
    WITH filtradas AS (
        SELECT t.*, u.correo AS prop_correo
        FROM tienda t
        LEFT JOIN usuario u ON u.id = t.propietario_id
        WHERE (p_plan IS NULL OR p_plan = '' OR t.plan = p_plan)
          AND (p_estado IS NULL OR p_estado = '' OR t.estado = p_estado)
          AND (p_busqueda IS NULL OR p_busqueda = ''
               OR position(lower(p_busqueda) IN lower(t.nombre)) > 0
               OR position(lower(p_busqueda) IN lower(t.slug)) > 0
               OR position(lower(p_busqueda) IN lower(COALESCE(u.correo, ''))) > 0)
    )
    SELECT f.id, f.nombre, f.slug, f.plan, f.estado, f.prop_correo::VARCHAR,
           (SELECT count(*) FROM usuario_tienda m WHERE m.tienda_id = f.id AND m.activo),
           (SELECT count(*) FROM producto p WHERE p.tenant_id = f.id),
           (SELECT count(*) FROM nota_venta n WHERE n.tenant_id = f.id),
           CASE WHEN f.plan = 'FREE_TRIAL' THEN f.prueba_vence_en::timestamptz
                ELSE (SELECT max(s.vence_en) FROM suscripcion s WHERE s.tenant_id = f.id AND s.estado = 'ACTIVA')
           END,
           f.creado_en,
           (SELECT count(*) FROM filtradas)
    FROM filtradas f
    ORDER BY f.creado_en DESC, f.id
    LIMIT GREATEST(LEAST(COALESCE(p_limite, 20), 100), 1)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION plataforma_listar_suscripciones(
    p_estado TEXT,
    p_limite INT,
    p_offset INT
) RETURNS TABLE (
    id UUID,
    tienda_id UUID,
    tienda_nombre VARCHAR,
    plan VARCHAR,
    periodo VARCHAR,
    monto NUMERIC,
    moneda VARCHAR,
    estado VARCHAR,
    inicio_en TIMESTAMPTZ,
    vence_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ,
    total BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM plataforma_exigir_operador();

    RETURN QUERY
    SELECT s.id, s.tenant_id, t.nombre, s.plan, s.periodo, s.monto, s.moneda, s.estado,
           s.inicio_en, s.vence_en, s.creado_en,
           count(*) OVER ()
    FROM suscripcion s
    JOIN tienda t ON t.id = s.tenant_id
    WHERE (p_estado IS NULL OR p_estado = '' OR s.estado = p_estado)
    ORDER BY s.creado_en DESC, s.id
    LIMIT GREATEST(LEAST(COALESCE(p_limite, 20), 100), 1)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION plataforma_exigir_operador() FROM PUBLIC;
REVOKE ALL ON FUNCTION plataforma_resumen() FROM PUBLIC;
REVOKE ALL ON FUNCTION plataforma_listar_tiendas(TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION plataforma_listar_suscripciones(TEXT, INT, INT) FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_app') THEN
        -- default privileges (05_rls.sql) grant UPDATE/DELETE on new tables: the trail is append-only
        REVOKE ALL ON plataforma_auditoria FROM aura_app;
        GRANT SELECT, INSERT ON plataforma_auditoria TO aura_app;
        GRANT EXECUTE ON FUNCTION plataforma_resumen() TO aura_app;
        GRANT EXECUTE ON FUNCTION plataforma_listar_tiendas(TEXT, TEXT, TEXT, INT, INT) TO aura_app;
        GRANT EXECUTE ON FUNCTION plataforma_listar_suscripciones(TEXT, INT, INT) TO aura_app;
    END IF;
END $$;

COMMIT;
