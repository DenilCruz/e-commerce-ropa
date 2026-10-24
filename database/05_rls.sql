-- =====================================================================
-- ROW-LEVEL SECURITY: segunda barrera del aislamiento multi-tenant
-- - aura_app:     rol sin privilegios con el que se conecta el API
-- - aura_reports: rol de solo lectura para el SQL generado por IA
-- La tienda activa llega en las variables de sesión app.tenant_id y
-- app.user_id (las fija el API en cada conexión). Sin valor no se ve nada.
-- Cambiar la contraseña de aura_app en producción:
--   ALTER ROLE aura_app PASSWORD '...';
-- Script idempotente.
-- =====================================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_app') THEN
        CREATE ROLE aura_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD 'aura_app_dev';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_reports') THEN
        CREATE ROLE aura_reports NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO aura_app', current_database());
END $$;

GRANT aura_reports TO aura_app;

GRANT USAGE ON SCHEMA public TO aura_app, aura_reports;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aura_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aura_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aura_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO aura_app;

-- Políticas por tenant en todas las tablas de negocio
DO $$
DECLARE
    t TEXT;
    tablas TEXT[] := ARRAY[
        'categoria', 'marca', 'proveedor', 'caja', 'cotizacion', 'detalle_cotizacion',
        'cliente', 'empleado', 'producto', 'producto_variante', 'imagen_producto',
        'carrito', 'detalle_carrito', 'cupon', 'cupon_uso',
        'nota_venta', 'detalle_nota_venta', 'pago', 'historial_venta', 'envio',
        'nota_compra', 'detalle_nota_compra', 'promocion', 'detalle_promocion',
        'devolucion', 'detalle_devolucion', 'resena', 'favorito', 'bitacora', 'archivo'
    ];
    activo CONSTANT TEXT := 'NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid';
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        IF to_regclass('public.' || quote_ident(t)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (tenant_id = %s) WITH CHECK (tenant_id = %s)',
            t, activo, activo);
        EXECUTE format('GRANT SELECT ON %I TO aura_reports', t);
    END LOOP;
END $$;

-- Membresías: se ven las de la tienda activa y las propias (para listar "mis tiendas")
ALTER TABLE usuario_tienda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON usuario_tienda;
CREATE POLICY tenant_isolation ON usuario_tienda
    USING (
        tienda_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR usuario_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
    WITH CHECK (tienda_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT ON usuario_tienda TO aura_reports;

-- Usuarios (tabla global): el API los ve todos; el SQL de IA solo los de la tienda activa
-- y sin la columna de contraseña.
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usuario_app ON usuario;
DROP POLICY IF EXISTS usuario_reports ON usuario;
CREATE POLICY usuario_app ON usuario TO aura_app USING (true) WITH CHECK (true);
CREATE POLICY usuario_reports ON usuario FOR SELECT TO aura_reports
    USING (EXISTS (SELECT 1 FROM usuario_tienda m WHERE m.usuario_id = usuario.id));
GRANT SELECT (id, rol_id, ci, nombre, apellido, celular, correo, foto, email_verificado, activo,
              ultimo_login, creado_en, actualizado_en) ON usuario TO aura_reports;

-- Catálogos globales que el SQL de IA puede leer
GRANT SELECT ON rol, talla, color, metodo_pago, metodo_envio TO aura_reports;

COMMIT;
