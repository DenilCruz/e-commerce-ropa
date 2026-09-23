-- =====================================================================
-- BASE DE DATOS: E-COMMERCE DE ROPA
-- Motor: PostgreSQL 15+
-- =====================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. TABLAS BASE (sin dependencias)
-- =====================================================================

CREATE TABLE rol (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(50) NOT NULL UNIQUE,
    descripcion     VARCHAR(255),
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE estado_rol (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rol_id          UUID NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
    fecha_inicial   TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_final     TIMESTAMP,
    estado          VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tienda (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) NOT NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    estado          VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE categoria (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    padre_id        UUID REFERENCES categoria(id) ON DELETE SET NULL,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    orden           INT NOT NULL DEFAULT 0,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE marca (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE talla (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(20) NOT NULL UNIQUE,
    orden           INT NOT NULL DEFAULT 0
);

CREATE TABLE color (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE metodo_pago (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(50) NOT NULL UNIQUE,
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE metodo_envio (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(50) NOT NULL,
    descripcion     VARCHAR(255),
    costo           DECIMAL(10,2) NOT NULL DEFAULT 0,
    tiempo_estimado VARCHAR(50),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE proveedor (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ci              VARCHAR(20),
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    telefono        VARCHAR(20),
    correo          VARCHAR(150),
    direccion       VARCHAR(255),
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 2. USUARIOS
-- =====================================================================

CREATE TABLE usuario (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rol_id          UUID NOT NULL REFERENCES rol(id) ON DELETE RESTRICT,
    ci              VARCHAR(20) UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    celular         VARCHAR(20),
    correo          VARCHAR(150) NOT NULL UNIQUE,
    contrasena      VARCHAR(255) NOT NULL,
    foto            VARCHAR(500),
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login    TIMESTAMP,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuario_correo ON usuario(correo);
CREATE INDEX idx_usuario_rol ON usuario(rol_id);

CREATE TABLE cliente (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE empleado (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    salario         DECIMAL(10,2),
    estado          VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    direccion       VARCHAR(255),
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE direccion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    alias           VARCHAR(50),
    calle           VARCHAR(200) NOT NULL,
    nrocasa         VARCHAR(20) NOT NULL,
    referencia      VARCHAR(255),
    predeterminada  BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_direccion_usuario ON direccion(usuario_id);

CREATE TABLE token (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    tipo            VARCHAR(30) NOT NULL,
    valor           VARCHAR(500) NOT NULL UNIQUE,
    expira_en       TIMESTAMP NOT NULL,
    usado           BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_usuario ON token(usuario_id);
CREATE INDEX idx_token_valor ON token(valor);

-- =====================================================================
-- 3. CAJA Y COTIZACIONES
-- =====================================================================

CREATE TABLE caja (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tienda_id       UUID REFERENCES tienda(id) ON DELETE SET NULL,
    monto_apertura  DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_hora     DECIMAL(10,2),
    descripcion     VARCHAR(255),
    estado          VARCHAR(30) NOT NULL DEFAULT 'ABIERTA',
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cotizacion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    tienda_id       UUID REFERENCES tienda(id) ON DELETE SET NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    total           DECIMAL(10,2) NOT NULL DEFAULT 0,
    observaciones   TEXT,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_cotizacion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cotizacion_id   UUID NOT NULL REFERENCES cotizacion(id) ON DELETE CASCADE,
    producto_id     UUID NOT NULL,
    cantidad        INT NOT NULL DEFAULT 1,
    precio          DECIMAL(10,2) NOT NULL
);

-- =====================================================================
-- 4. PRODUCTOS
-- =====================================================================

CREATE TABLE producto (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id    UUID NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
    marca_id        UUID REFERENCES marca(id) ON DELETE SET NULL,
    proveedor_id    UUID REFERENCES proveedor(id) ON DELETE SET NULL,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    precio          DECIMAL(10,2) NOT NULL DEFAULT 0,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    destacado       BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_producto_categoria ON producto(categoria_id);
CREATE INDEX idx_producto_marca ON producto(marca_id);
CREATE INDEX idx_producto_nombre ON producto(nombre);

CREATE TABLE producto_variante (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id     UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    talla_id        UUID REFERENCES talla(id) ON DELETE SET NULL,
    color_id        UUID REFERENCES color(id) ON DELETE SET NULL,
    sku             VARCHAR(50) NOT NULL UNIQUE,
    stock           INT NOT NULL DEFAULT 0,
    stock_minimo    INT NOT NULL DEFAULT 5,
    precio_extra    DECIMAL(10,2) NOT NULL DEFAULT 0,
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(producto_id, talla_id, color_id),
    CONSTRAINT chk_stock_no_negativo CHECK (stock >= 0)
);

CREATE INDEX idx_variante_producto ON producto_variante(producto_id);

CREATE TABLE imagen_producto (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id     UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    formato         VARCHAR(20),
    perspectiva     VARCHAR(50),
    url             VARCHAR(500) NOT NULL,
    orden           INT NOT NULL DEFAULT 0,
    principal       BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_imagen_producto ON imagen_producto(producto_id);

-- =====================================================================
-- 5. CARRITO
-- =====================================================================

CREATE TABLE carrito (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    total           DECIMAL(10,2) NOT NULL DEFAULT 0,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_carrito (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrito_id      UUID NOT NULL REFERENCES carrito(id) ON DELETE CASCADE,
    variante_id     UUID NOT NULL REFERENCES producto_variante(id) ON DELETE CASCADE,
    cantidad        INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(carrito_id, variante_id)
);

CREATE INDEX idx_detalle_carrito ON detalle_carrito(carrito_id);

-- =====================================================================
-- 6. VENTAS Y PAGOS
-- =====================================================================

CREATE TABLE cupon (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo            VARCHAR(50) NOT NULL UNIQUE,
    descripcion       VARCHAR(255),
    tipo              VARCHAR(20) NOT NULL, -- PORCENTAJE, MONTO_FIJO
    valor             DECIMAL(10,2) NOT NULL,
    monto_minimo      DECIMAL(10,2) NOT NULL DEFAULT 0,
    usos_maximos      INT,
    usos_actuales     INT NOT NULL DEFAULT 0,
    usos_por_usuario  INT NOT NULL DEFAULT 1,
    fecha_inicio      TIMESTAMP NOT NULL,
    fecha_fin         TIMESTAMP NOT NULL,
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE nota_venta (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nro             VARCHAR(20) NOT NULL UNIQUE,
    usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    cliente_id      UUID REFERENCES cliente(id) ON DELETE SET NULL,
    caja_id         UUID REFERENCES caja(id) ON DELETE SET NULL,
    tienda_id       UUID REFERENCES tienda(id) ON DELETE SET NULL,
    direccion_id    UUID REFERENCES direccion(id) ON DELETE SET NULL,
    cupon_id        UUID REFERENCES cupon(id) ON DELETE SET NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento       DECIMAL(10,2) NOT NULL DEFAULT 0,
    costo_envio     DECIMAL(10,2) NOT NULL DEFAULT 0,
    total           DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado          VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notaventa_usuario ON nota_venta(usuario_id);
CREATE INDEX idx_notaventa_estado ON nota_venta(estado);

CREATE TABLE detalle_nota_venta (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notaventa_id    UUID NOT NULL REFERENCES nota_venta(id) ON DELETE CASCADE,
    producto_id     UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    variante_id     UUID REFERENCES producto_variante(id) ON DELETE SET NULL,
    cantidad        INT NOT NULL DEFAULT 1,
    precio          DECIMAL(10,2) NOT NULL,
    descuento       DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
    nombre_producto VARCHAR(150),
    talla           VARCHAR(20),
    color           VARCHAR(50)
);

CREATE INDEX idx_detalle_notaventa ON detalle_nota_venta(notaventa_id);

CREATE TABLE pago (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notaventa_id      UUID NOT NULL UNIQUE REFERENCES nota_venta(id) ON DELETE CASCADE,
    metodo_pago_id    UUID NOT NULL REFERENCES metodo_pago(id) ON DELETE RESTRICT,
    monto             DECIMAL(10,2) NOT NULL,
    estado            VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    respuesta_pasarela JSONB,
    id_transaccion    VARCHAR(255),
    fecha_pago        TIMESTAMP,
    creado_en         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE historial_venta (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notaventa_id    UUID NOT NULL REFERENCES nota_venta(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(30),
    estado_nuevo    VARCHAR(30) NOT NULL,
    comentario      VARCHAR(255),
    usuario_id      UUID REFERENCES usuario(id) ON DELETE SET NULL,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historial_notaventa ON historial_venta(notaventa_id);

CREATE TABLE envio (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notaventa_id            UUID NOT NULL UNIQUE REFERENCES nota_venta(id) ON DELETE CASCADE,
    metodo_envio_id         UUID NOT NULL REFERENCES metodo_envio(id) ON DELETE RESTRICT,
    direccion_id            UUID NOT NULL REFERENCES direccion(id) ON DELETE RESTRICT,
    empresa_transportadora  VARCHAR(100),
    numero_tracking         VARCHAR(100),
    estado                  VARCHAR(30) NOT NULL DEFAULT 'PREPARANDO',
    fecha_envio             TIMESTAMP,
    fecha_entrega_estimada  TIMESTAMP,
    fecha_entrega_real      TIMESTAMP,
    creado_en               TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cupon_uso (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cupon_id        UUID NOT NULL REFERENCES cupon(id) ON DELETE CASCADE,
    usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    notaventa_id    UUID NOT NULL REFERENCES nota_venta(id) ON DELETE CASCADE,
    usado_en        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 7. COMPRAS
-- =====================================================================

CREATE TABLE nota_compra (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nro             VARCHAR(20) NOT NULL UNIQUE,
    proveedor_id    UUID NOT NULL REFERENCES proveedor(id) ON DELETE RESTRICT,
    tienda_id       UUID REFERENCES tienda(id) ON DELETE SET NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    total           DECIMAL(10,2) NOT NULL DEFAULT 0,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_nota_compra (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notacompra_id   UUID NOT NULL REFERENCES nota_compra(id) ON DELETE CASCADE,
    producto_id     UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    cantidad        INT NOT NULL DEFAULT 1,
    precio          DECIMAL(10,2) NOT NULL
);

-- =====================================================================
-- 8. PROMOCIONES Y DEVOLUCIONES
-- =====================================================================

CREATE TABLE promocion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    tipo            VARCHAR(30),
    descuento       DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_combo    DECIMAL(10,2),
    fecha_inicial   TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_final     TIMESTAMP,
    estado          VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_promocion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promocion_id    UUID NOT NULL REFERENCES promocion(id) ON DELETE CASCADE,
    producto_id     UUID REFERENCES producto(id) ON DELETE CASCADE
);

CREATE TABLE devolucion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notaventa_id    UUID REFERENCES nota_venta(id) ON DELETE SET NULL,
    tipo            VARCHAR(30) NOT NULL,
    motivo          VARCHAR(255),
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    estado          VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_devolucion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devolucion_id   UUID NOT NULL REFERENCES devolucion(id) ON DELETE CASCADE,
    producto_id     UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    cantidad        INT NOT NULL DEFAULT 1,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 9. RESEÑAS Y FAVORITOS
-- =====================================================================

CREATE TABLE resena (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    producto_id     UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    notaventa_id    UUID REFERENCES nota_venta(id) ON DELETE SET NULL,
    calificacion    INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario      TEXT,
    aprobada        BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(usuario_id, producto_id, notaventa_id)
);

CREATE INDEX idx_resena_producto ON resena(producto_id);

CREATE TABLE favorito (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    producto_id     UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(usuario_id, producto_id)
);

-- =====================================================================
-- 10. AUDITORÍA
-- =====================================================================

CREATE TABLE bitacora (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID REFERENCES usuario(id) ON DELETE SET NULL,
    accion          VARCHAR(50) NOT NULL,
    tabla           VARCHAR(50) NOT NULL,
    registro_id     UUID,
    descripcion     VARCHAR(255),
    ip              VARCHAR(45),
    fecha           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bitacora_usuario ON bitacora(usuario_id);
CREATE INDEX idx_bitacora_fecha ON bitacora(fecha);

