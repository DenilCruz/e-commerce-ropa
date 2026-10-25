-- =====================================================================
-- MULTI-TENANT: base compartida con discriminador tenant_id
-- Tenant = fila de la tabla "tienda". El primer tenant (AURA) recibe
-- todos los datos existentes. Script idempotente.
-- Globales (sin tenant_id): rol, estado_rol, usuario, direccion, token,
-- talla, color, metodo_pago, metodo_envio.
-- =====================================================================

BEGIN;

-- 1. Primer tenant: AURA (id fijo para poder reproducirlo en otros entornos)
INSERT INTO tienda (id, nombre, estado)
VALUES ('a0a0a0a0-0000-4000-8000-000000000001', 'AURA', 'ACTIVA')
ON CONFLICT (id) DO NOTHING;

-- 2. Membresía usuario <-> tienda con rol por tienda
CREATE TABLE IF NOT EXISTS usuario_tienda (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    tienda_id   UUID NOT NULL REFERENCES tienda(id) ON DELETE CASCADE,
    rol_id      UUID NOT NULL REFERENCES rol(id) ON DELETE RESTRICT,
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, tienda_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_tienda_usuario ON usuario_tienda(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_tienda_tienda ON usuario_tienda(tienda_id);

-- 3. tenant_id en todas las tablas de negocio
DO $$
DECLARE
    aura CONSTANT UUID := 'a0a0a0a0-0000-4000-8000-000000000001';
    t TEXT;
    tablas TEXT[] := ARRAY[
        'categoria', 'marca', 'proveedor', 'caja', 'cotizacion', 'detalle_cotizacion',
        'cliente', 'empleado', 'producto', 'producto_variante', 'imagen_producto',
        'carrito', 'detalle_carrito', 'cupon', 'cupon_uso',
        'nota_venta', 'detalle_nota_venta', 'pago', 'historial_venta', 'envio',
        'nota_compra', 'detalle_nota_compra', 'promocion', 'detalle_promocion',
        'devolucion', 'detalle_devolucion', 'resena', 'favorito', 'bitacora', 'archivo'
    ];
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        -- 'archivo' no existe en 01_init_schema.sql; solo se migra si la tabla existe
        IF to_regclass('public.' || quote_ident(t)) IS NULL THEN
            CONTINUE;
        END IF;

        -- Tablas que ya tenían tienda_id: se renombra para unificar el nombre
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = t AND column_name = 'tienda_id') THEN
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_tienda_id_fkey');
            EXECUTE format('ALTER TABLE %I RENAME COLUMN tienda_id TO tenant_id', t);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id UUID', t);
        END IF;

        -- Todo dato existente pertenece a AURA
        EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', t, aura);

        -- La bitácora admite eventos de plataforma sin tienda
        IF t <> 'bitacora' THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t);
        END IF;

        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, 'fk_' || t || '_tenant');
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tienda(id) ON DELETE RESTRICT',
            t, 'fk_' || t || '_tenant');
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(tenant_id)', 'idx_' || t || '_tenant', t);
    END LOOP;
END $$;

-- 4. UNIQUE globales -> UNIQUE por tenant
ALTER TABLE cupon DROP CONSTRAINT IF EXISTS cupon_codigo_key;
ALTER TABLE cupon DROP CONSTRAINT IF EXISTS uq_cupon_tenant_codigo;
ALTER TABLE cupon ADD CONSTRAINT uq_cupon_tenant_codigo UNIQUE (tenant_id, codigo);

ALTER TABLE marca DROP CONSTRAINT IF EXISTS marca_nombre_key;
ALTER TABLE marca DROP CONSTRAINT IF EXISTS uq_marca_tenant_nombre;
ALTER TABLE marca ADD CONSTRAINT uq_marca_tenant_nombre UNIQUE (tenant_id, nombre);

ALTER TABLE producto_variante DROP CONSTRAINT IF EXISTS producto_variante_sku_key;
ALTER TABLE producto_variante DROP CONSTRAINT IF EXISTS uq_variante_tenant_sku;
ALTER TABLE producto_variante ADD CONSTRAINT uq_variante_tenant_sku UNIQUE (tenant_id, sku);

ALTER TABLE nota_venta DROP CONSTRAINT IF EXISTS nota_venta_nro_key;
ALTER TABLE nota_venta DROP CONSTRAINT IF EXISTS uq_notaventa_tenant_nro;
ALTER TABLE nota_venta ADD CONSTRAINT uq_notaventa_tenant_nro UNIQUE (tenant_id, nro);

ALTER TABLE nota_compra DROP CONSTRAINT IF EXISTS nota_compra_nro_key;
ALTER TABLE nota_compra DROP CONSTRAINT IF EXISTS uq_notacompra_tenant_nro;
ALTER TABLE nota_compra ADD CONSTRAINT uq_notacompra_tenant_nro UNIQUE (tenant_id, nro);

-- Un carrito por usuario y por tienda
ALTER TABLE carrito DROP CONSTRAINT IF EXISTS carrito_usuario_id_key;
ALTER TABLE carrito DROP CONSTRAINT IF EXISTS uq_carrito_tenant_usuario;
ALTER TABLE carrito ADD CONSTRAINT uq_carrito_tenant_usuario UNIQUE (tenant_id, usuario_id);

-- Un perfil cliente / empleado por usuario y por tienda
ALTER TABLE cliente DROP CONSTRAINT IF EXISTS cliente_usuario_id_key;
ALTER TABLE cliente DROP CONSTRAINT IF EXISTS uq_cliente_tenant_usuario;
ALTER TABLE cliente ADD CONSTRAINT uq_cliente_tenant_usuario UNIQUE (tenant_id, usuario_id);

ALTER TABLE empleado DROP CONSTRAINT IF EXISTS empleado_usuario_id_key;
ALTER TABLE empleado DROP CONSTRAINT IF EXISTS uq_empleado_tenant_usuario;
ALTER TABLE empleado ADD CONSTRAINT uq_empleado_tenant_usuario UNIQUE (tenant_id, usuario_id);

-- 5. Todos los usuarios existentes son miembros de AURA con su rol actual
INSERT INTO usuario_tienda (usuario_id, tienda_id, rol_id)
SELECT u.id, 'a0a0a0a0-0000-4000-8000-000000000001', u.rol_id
FROM usuario u
ON CONFLICT (usuario_id, tienda_id) DO NOTHING;

COMMIT;
