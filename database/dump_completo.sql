--
-- PostgreSQL database dump
--

\restrict ySPREPqeJsxuobY5kzJ9cjejekExSHhLIVp1TflQwRqgysiANnAVVHW4t5j720S

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: archivo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.archivo (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre_original character varying(255) NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    url character varying(500) NOT NULL,
    public_id character varying(255),
    formato character varying(20) DEFAULT 'webp'::character varying,
    mimetype character varying(50) DEFAULT 'image/webp'::character varying,
    peso_bytes integer NOT NULL,
    peso_original_bytes integer,
    porcentaje_ahorro integer DEFAULT 0,
    almacenamiento character varying(20) DEFAULT 'local'::character varying,
    categoria character varying(50) DEFAULT 'general'::character varying,
    usuario_id uuid,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE public.archivo OWNER TO postgres;

--
-- Name: bitacora; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bitacora (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid,
    accion character varying(50) NOT NULL,
    tabla character varying(50) NOT NULL,
    registro_id uuid,
    descripcion character varying(255),
    ip character varying(45),
    fecha timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bitacora OWNER TO postgres;

--
-- Name: caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.caja (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tienda_id uuid,
    monto_apertura numeric(10,2) DEFAULT 0 NOT NULL,
    precio_hora numeric(10,2),
    descripcion character varying(255),
    estado character varying(30) DEFAULT 'ABIERTA'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.caja OWNER TO postgres;

--
-- Name: carrito; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carrito (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.carrito OWNER TO postgres;

--
-- Name: categoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categoria (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    padre_id uuid,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    activa boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    imagen character varying(500)
);


ALTER TABLE public.categoria OWNER TO postgres;

--
-- Name: cliente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cliente (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cliente OWNER TO postgres;

--
-- Name: color; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.color (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(50) NOT NULL
);


ALTER TABLE public.color OWNER TO postgres;

--
-- Name: cotizacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cotizacion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    tienda_id uuid,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    observaciones text,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cotizacion OWNER TO postgres;

--
-- Name: cupon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cupon (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo character varying(50) NOT NULL,
    descripcion character varying(255),
    tipo character varying(20) NOT NULL,
    valor numeric(10,2) NOT NULL,
    monto_minimo numeric(10,2) DEFAULT 0 NOT NULL,
    usos_maximos integer,
    usos_actuales integer DEFAULT 0 NOT NULL,
    usos_por_usuario integer DEFAULT 1 NOT NULL,
    fecha_inicio timestamp without time zone NOT NULL,
    fecha_fin timestamp without time zone NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cupon OWNER TO postgres;

--
-- Name: cupon_uso; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cupon_uso (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cupon_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    notaventa_id uuid NOT NULL,
    usado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cupon_uso OWNER TO postgres;

--
-- Name: detalle_carrito; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_carrito (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    carrito_id uuid NOT NULL,
    variante_id uuid NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.detalle_carrito OWNER TO postgres;

--
-- Name: detalle_cotizacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_cotizacion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cotizacion_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    precio numeric(10,2) NOT NULL
);


ALTER TABLE public.detalle_cotizacion OWNER TO postgres;

--
-- Name: detalle_devolucion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_devolucion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    devolucion_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.detalle_devolucion OWNER TO postgres;

--
-- Name: detalle_nota_compra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_nota_compra (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    notacompra_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    precio numeric(10,2) NOT NULL
);


ALTER TABLE public.detalle_nota_compra OWNER TO postgres;

--
-- Name: detalle_nota_venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_nota_venta (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    notaventa_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    variante_id uuid,
    cantidad integer DEFAULT 1 NOT NULL,
    precio numeric(10,2) NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    nombre_producto character varying(150),
    talla character varying(20),
    color character varying(50)
);


ALTER TABLE public.detalle_nota_venta OWNER TO postgres;

--
-- Name: detalle_promocion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_promocion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    promocion_id uuid NOT NULL,
    producto_id uuid
);


ALTER TABLE public.detalle_promocion OWNER TO postgres;

--
-- Name: devolucion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devolucion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    notaventa_id uuid,
    tipo character varying(30) NOT NULL,
    motivo character varying(255),
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    estado character varying(30) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.devolucion OWNER TO postgres;

--
-- Name: direccion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.direccion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    alias character varying(50),
    calle character varying(200) NOT NULL,
    nrocasa character varying(20) NOT NULL,
    referencia character varying(255),
    predeterminada boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.direccion OWNER TO postgres;

--
-- Name: empleado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empleado (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    salario numeric(10,2),
    estado character varying(30) DEFAULT 'ACTIVO'::character varying NOT NULL,
    direccion character varying(255),
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.empleado OWNER TO postgres;

--
-- Name: envio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.envio (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    notaventa_id uuid NOT NULL,
    metodo_envio_id uuid NOT NULL,
    direccion_id uuid NOT NULL,
    empresa_transportadora character varying(100),
    numero_tracking character varying(100),
    estado character varying(30) DEFAULT 'PREPARANDO'::character varying NOT NULL,
    fecha_envio timestamp without time zone,
    fecha_entrega_estimada timestamp without time zone,
    fecha_entrega_real timestamp without time zone,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.envio OWNER TO postgres;

--
-- Name: estado_rol; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estado_rol (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rol_id uuid NOT NULL,
    fecha_inicial timestamp without time zone DEFAULT now() NOT NULL,
    fecha_final timestamp without time zone,
    estado character varying(30) DEFAULT 'ACTIVO'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.estado_rol OWNER TO postgres;

--
-- Name: favorito; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favorito (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.favorito OWNER TO postgres;

--
-- Name: historial_venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_venta (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    notaventa_id uuid NOT NULL,
    estado_anterior character varying(30),
    estado_nuevo character varying(30) NOT NULL,
    comentario character varying(255),
    usuario_id uuid,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.historial_venta OWNER TO postgres;

--
-- Name: imagen_producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imagen_producto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    producto_id uuid NOT NULL,
    formato character varying(20),
    perspectiva character varying(50),
    url character varying(500) NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    principal boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    public_id character varying(255)
);


ALTER TABLE public.imagen_producto OWNER TO postgres;

--
-- Name: marca; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marca (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(100) NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.marca OWNER TO postgres;

--
-- Name: metodo_envio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metodo_envio (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    costo numeric(10,2) DEFAULT 0 NOT NULL,
    tiempo_estimado character varying(50),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.metodo_envio OWNER TO postgres;

--
-- Name: metodo_pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metodo_pago (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(50) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.metodo_pago OWNER TO postgres;

--
-- Name: nota_compra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nota_compra (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nro character varying(20) NOT NULL,
    proveedor_id uuid NOT NULL,
    tienda_id uuid,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.nota_compra OWNER TO postgres;

--
-- Name: nota_venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nota_venta (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nro character varying(20) NOT NULL,
    usuario_id uuid NOT NULL,
    cliente_id uuid,
    caja_id uuid,
    tienda_id uuid,
    direccion_id uuid,
    cupon_id uuid,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    costo_envio numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    estado character varying(30) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.nota_venta OWNER TO postgres;

--
-- Name: pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pago (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    notaventa_id uuid NOT NULL,
    metodo_pago_id uuid NOT NULL,
    monto numeric(10,2) NOT NULL,
    estado character varying(30) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    respuesta_pasarela jsonb,
    id_transaccion character varying(255),
    fecha_pago timestamp without time zone,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pago OWNER TO postgres;

--
-- Name: producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.producto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    categoria_id uuid NOT NULL,
    marca_id uuid,
    proveedor_id uuid,
    nombre character varying(150) NOT NULL,
    descripcion text,
    precio numeric(10,2) DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    destacado boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.producto OWNER TO postgres;

--
-- Name: producto_variante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.producto_variante (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    producto_id uuid NOT NULL,
    talla_id uuid,
    color_id uuid,
    sku character varying(50) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 5 NOT NULL,
    precio_extra numeric(10,2) DEFAULT 0 NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_stock_no_negativo CHECK ((stock >= 0))
);


ALTER TABLE public.producto_variante OWNER TO postgres;

--
-- Name: promocion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promocion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    tipo character varying(30),
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    precio_combo numeric(10,2),
    fecha_inicial timestamp without time zone DEFAULT now() NOT NULL,
    fecha_final timestamp without time zone,
    estado character varying(30) DEFAULT 'ACTIVA'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.promocion OWNER TO postgres;

--
-- Name: proveedor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proveedor (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ci character varying(20),
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    telefono character varying(20),
    correo character varying(150),
    direccion character varying(255),
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.proveedor OWNER TO postgres;

--
-- Name: resena; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resena (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    notaventa_id uuid,
    calificacion integer NOT NULL,
    comentario text,
    aprobada boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT resena_calificacion_check CHECK (((calificacion >= 1) AND (calificacion <= 5)))
);


ALTER TABLE public.resena OWNER TO postgres;

--
-- Name: rol; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rol (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rol OWNER TO postgres;

--
-- Name: talla; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.talla (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(20) NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.talla OWNER TO postgres;

--
-- Name: tienda; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tienda (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(100) NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    estado character varying(30) DEFAULT 'ACTIVA'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tienda OWNER TO postgres;

--
-- Name: token; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    tipo character varying(30) NOT NULL,
    valor character varying(500) NOT NULL,
    expira_en timestamp without time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.token OWNER TO postgres;

--
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rol_id uuid NOT NULL,
    ci character varying(20),
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    celular character varying(20),
    correo character varying(150) NOT NULL,
    contrasena character varying(255) NOT NULL,
    foto character varying(500),
    email_verificado boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    ultimo_login timestamp without time zone,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- Data for Name: archivo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.archivo (id, nombre_original, nombre_archivo, url, public_id, formato, mimetype, peso_bytes, peso_original_bytes, porcentaje_ahorro, almacenamiento, categoria, usuario_id, creado_en) FROM stdin;
\.


--
-- Data for Name: bitacora; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bitacora (id, usuario_id, accion, tabla, registro_id, descripcion, ip, fecha) FROM stdin;
\.


--
-- Data for Name: caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.caja (id, tienda_id, monto_apertura, precio_hora, descripcion, estado, creado_en) FROM stdin;
\.


--
-- Data for Name: carrito; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carrito (id, usuario_id, total, fecha_creacion, actualizado_en) FROM stdin;
048a74cb-7472-43a3-97b6-a7811649f9b7	7ea8eba8-9411-4e69-a815-dd582e4096ae	120.00	2026-09-21 16:51:21.473602	2026-09-21 19:46:45.508
\.


--
-- Data for Name: categoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categoria (id, padre_id, nombre, descripcion, activa, orden, creado_en, imagen) FROM stdin;
264efe79-ded7-4cfa-a0b0-110b822944c5	\N	Vestidos	Vestidos de corte editorial en sedas y linos puros	t	0	2026-09-22 04:15:31.295734	\N
5977fad7-63be-49cd-bee5-1d572e849cdd	\N	Poleras	Tops y poleras de algodón Pima y canalé fino	t	0	2026-09-22 04:15:31.295734	\N
67c0ec1b-94fa-4bd4-b37a-9f74f815031f	\N	Faldas	Faldas midi estructuradas, satinadas y plisadas	t	0	2026-09-22 04:15:31.295734	\N
3a3ed9f0-94be-45a7-8699-c007a4ef9795	\N	Camisas	Camisas en popelina y seda con sastrería precisa	t	0	2026-09-22 04:15:31.295734	\N
fe5e4893-0236-4533-817c-da2e1db599f6	\N	Shorts	Bermudas sartoriales y shorts veraniegos de lino	t	0	2026-09-22 04:15:31.295734	\N
afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b	\N	Abrigos	Blazers de lana, trench coats y tapados de invierno	t	0	2026-09-22 04:15:31.295734	\N
583d0937-40b2-4070-96b3-4685fdb92bc2	\N	Pantalones	Pantalones de corte sastre y siluetas fluidas	t	0	2026-09-22 04:15:31.295734	\N
11111111-1111-4111-a111-111111111101	264efe79-ded7-4cfa-a0b0-110b822944c5	Vestidos de Noche	Vestidos de gala y seda para veladas exclusivas	t	0	2026-09-22 04:15:31.295734	\N
11111111-1111-4111-a111-111111111102	264efe79-ded7-4cfa-a0b0-110b822944c5	Vestidos Casuales	Siluetas ligeras de lino para el día a día	t	0	2026-09-22 04:15:31.295734	\N
22222222-2222-4222-a222-222222222201	5977fad7-63be-49cd-bee5-1d572e849cdd	Poleras Básicas	Esenciales en algodón peruano de máxima pureza	t	0	2026-09-22 04:15:31.295734	\N
22222222-2222-4222-a222-222222222202	5977fad7-63be-49cd-bee5-1d572e849cdd	Tops y Canalé	Prendas de punto fino para combinar en capas	t	0	2026-09-22 04:15:31.295734	\N
33333333-3333-4333-a333-333333333301	3a3ed9f0-94be-45a7-8699-c007a4ef9795	Camisas Formales	Camisas estructuradas en popelina de algodón	t	0	2026-09-22 04:15:31.295734	\N
33333333-3333-4333-a333-333333333302	3a3ed9f0-94be-45a7-8699-c007a4ef9795	Camisas de Seda / Lino	Prendas transpirables con caída relajada	t	0	2026-09-22 04:15:31.295734	\N
44444444-4444-4444-a444-444444444401	afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b	Chaquetas y Blazers	Sacos estructurados de hombros limpios	t	0	2026-09-22 04:15:31.295734	\N
44444444-4444-4444-a444-444444444402	afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b	Tapados de Invierno	Abrigos envolventes en lana y alpaca	t	0	2026-09-22 04:15:31.295734	\N
\.


--
-- Data for Name: cliente; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cliente (id, usuario_id, creado_en) FROM stdin;
79ddde73-5be2-45ee-b56d-7472028ed9f9	7ea8eba8-9411-4e69-a815-dd582e4096ae	2026-09-20 22:16:05.376374
\.


--
-- Data for Name: color; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.color (id, nombre) FROM stdin;
5fab2609-5a5d-4c3f-b09f-4c46e4c047a1	Marfil / Ivory
5fab2609-5a5d-4c3f-b09f-4c46e4c047a2	Arena / Camel
5fab2609-5a5d-4c3f-b09f-4c46e4c047a3	Café Moca
5fab2609-5a5d-4c3f-b09f-4c46e4c047a4	Verde Oliva
d8e784f8-74ac-4050-abd5-6306501adc5d	Negro Azabache
5fab2609-5a5d-4c3f-b09f-4c46e4c047a5	Champán Satinado
e21b66c7-5345-4e19-afd8-c9de594b77d3	Azul Denim
5fab2609-5a5d-4c3f-b09f-4c46e4c047a6	Rojo Escarlata
5fab2609-5a5d-4c3f-b09f-4c46e4c047a7	Azul Zafiro
5fab2609-5a5d-4c3f-b09f-4c46e4c047a8	Verde Esmeralda
5fab2609-5a5d-4c3f-b09f-4c46e4c047a9	Azul Índigo
5fab2609-5a5d-4c3f-b09f-4c46e4c047aa	Gris Marengo
5fab2609-5a5d-4c3f-b09f-4c46e4c047ab	Azul Marino
\.


--
-- Data for Name: cotizacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cotizacion (id, usuario_id, tienda_id, fecha, total, observaciones, creado_en) FROM stdin;
\.


--
-- Data for Name: cupon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cupon (id, codigo, descripcion, tipo, valor, monto_minimo, usos_maximos, usos_actuales, usos_por_usuario, fecha_inicio, fecha_fin, activo, creado_en) FROM stdin;
23dd2857-ad6e-4cbc-abf3-52ce3e4a9437	AURA10	10% de descuento en colección nueva	PORCENTAJE	10.00	100.00	500	14	1	2026-08-23 14:02:35.566333	2026-11-21 14:02:35.566333	t	2026-09-22 14:02:35.566333
8baf1c55-dc52-479f-84fd-682417a74acd	BIENVENIDA20	0 de regalo en tu primera compra	MONTO_FIJO	20.00	150.00	200	28	1	2026-08-23 14:02:35.566333	2026-11-21 14:02:35.566333	t	2026-09-22 14:02:35.566333
a2f1c91f-f56d-4bb9-80a7-bff421de4c39	VIPATELIER	15% exclusivo para clientes VIP	PORCENTAJE	15.00	250.00	100	9	1	2026-09-07 14:02:35.566333	2026-11-06 14:02:35.566333	t	2026-09-22 14:02:35.566333
\.


--
-- Data for Name: cupon_uso; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cupon_uso (id, cupon_id, usuario_id, notaventa_id, usado_en) FROM stdin;
\.


--
-- Data for Name: detalle_carrito; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_carrito (id, carrito_id, variante_id, cantidad, precio_unitario, fecha) FROM stdin;
\.


--
-- Data for Name: detalle_cotizacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_cotizacion (id, cotizacion_id, producto_id, cantidad, precio) FROM stdin;
\.


--
-- Data for Name: detalle_devolucion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_devolucion (id, devolucion_id, producto_id, cantidad, fecha) FROM stdin;
\.


--
-- Data for Name: detalle_nota_compra; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_nota_compra (id, notacompra_id, producto_id, cantidad, precio) FROM stdin;
\.


--
-- Data for Name: detalle_nota_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_nota_venta (id, notaventa_id, producto_id, variante_id, cantidad, precio, descuento, subtotal, nombre_producto, talla, color) FROM stdin;
a437f75f-db86-49ae-a9db-32e67ba21c31	a5ac4655-0fae-4ea7-9136-7667e8932313	b1000001-0001-4001-8001-000000000001	\N	2	320.00	0.00	640.00	Vestido de Gala en Seda Escarlata	M	Negro
ad378ff8-ebfe-4766-a8bc-63b6a3eefea4	9ece1868-974b-4d71-9fab-0cf6b0bfa264	b1000001-0001-4001-8001-000000000002	\N	3	350.00	0.00	1050.00	Vestido de Noche en Encaje Azul Zafiro	L	Blanco
2079f493-9123-41e0-b53a-3787c914bbda	7785ea52-1691-49f8-be53-1f82b1468e2c	b1000001-0001-4001-8001-000000000001	\N	2	320.00	0.00	640.00	Vestido de Gala en Seda Escarlata	S	Azul
c941be9e-c9c9-4f82-b0a9-ceb3a34d0566	7785ea52-1691-49f8-be53-1f82b1468e2c	b1000001-0001-4001-8001-000000000003	\N	1	290.00	0.00	290.00	Vestido Sirena Noir de Alta Costura	M	Rojo
46b651e7-a082-40c4-a29e-c82a44bb8b21	f64c0a88-d244-4efd-ac6c-2b154df2e1d0	b1000001-0001-4001-8001-000000000002	\N	2	350.00	0.00	700.00	Vestido de Noche en Encaje Azul Zafiro	M	Gris
d7a59b2c-547e-44cc-b699-0bdd61e8c0c3	febaa4c5-f57c-4f36-af43-a05d6b0da58e	b1000001-0001-4001-8001-000000000001	\N	4	320.00	0.00	1280.00	Vestido de Gala en Seda Escarlata	L	Negro
33c9129d-087c-413c-bb7d-808de1d1f936	febaa4c5-f57c-4f36-af43-a05d6b0da58e	b1000001-0001-4001-8001-000000000002	\N	2	350.00	0.00	700.00	Vestido de Noche en Encaje Azul Zafiro	M	Blanco
1264f33f-d529-402f-b515-10ad90162a1e	da9c9c32-b7cd-49e3-920e-f28377363704	b1000001-0001-4001-8001-000000000003	\N	3	290.00	0.00	870.00	Vestido Sirena Noir de Alta Costura	S	Azul
fd7c7565-c240-4b65-9a2c-dddd729916ce	b325a461-5299-41ab-a440-063b9eb68945	b1000001-0001-4001-8001-000000000001	\N	3	320.00	0.00	960.00	Vestido de Gala en Seda Escarlata	XL	Negro
\.


--
-- Data for Name: detalle_promocion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_promocion (id, promocion_id, producto_id) FROM stdin;
\.


--
-- Data for Name: devolucion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.devolucion (id, notaventa_id, tipo, motivo, fecha, estado, creado_en) FROM stdin;
\.


--
-- Data for Name: direccion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.direccion (id, usuario_id, alias, calle, nrocasa, referencia, predeterminada, creado_en, actualizado_en) FROM stdin;
d9593fd6-6493-412b-8cd5-eff3f7eb3867	2a956712-fd3c-4b6b-9288-e5a06f729086	Casa	Av. Principal	123	Frente al parque	f	2026-09-20 05:27:24.739952	2026-09-20 05:27:24.76136
85c23cfb-557a-4dfe-bf8b-24e87b7518e8	2a956712-fd3c-4b6b-9288-e5a06f729086	Trabajo	Calle Empresa	Edificio A	\N	t	2026-09-20 05:27:24.76136	2026-09-20 05:27:24.76136
2aaf2339-5730-41d7-bc28-4c933909b560	7ea8eba8-9411-4e69-a815-dd582e4096ae	Pampa de la Isla	barrio el condado	351	al lado de mi vecino	t	2026-09-20 23:37:08.09823	2026-09-21 02:29:53.51436
\.


--
-- Data for Name: empleado; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empleado (id, usuario_id, salario, estado, direccion, creado_en) FROM stdin;
\.


--
-- Data for Name: envio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.envio (id, notaventa_id, metodo_envio_id, direccion_id, empresa_transportadora, numero_tracking, estado, fecha_envio, fecha_entrega_estimada, fecha_entrega_real, creado_en) FROM stdin;
\.


--
-- Data for Name: estado_rol; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estado_rol (id, rol_id, fecha_inicial, fecha_final, estado, creado_en) FROM stdin;
\.


--
-- Data for Name: favorito; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.favorito (id, usuario_id, producto_id, creado_en) FROM stdin;
\.


--
-- Data for Name: historial_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historial_venta (id, notaventa_id, estado_anterior, estado_nuevo, comentario, usuario_id, creado_en) FROM stdin;
\.


--
-- Data for Name: imagen_producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.imagen_producto (id, producto_id, formato, perspectiva, url, orden, principal, creado_en, public_id) FROM stdin;
bd643723-9dd7-45a0-93cc-7c048f33b866	b1000001-0001-4001-8001-000000000001	\N	\N	/uploads/vestido_rojo_gala.jpg	1	t	2026-09-22 04:15:31.295734	\N
e22f6b1f-0120-4494-8c71-c87cc7b02227	b1000001-0001-4001-8001-000000000002	\N	\N	/uploads/elegant_dress_1789943810626.jpg	1	t	2026-09-22 04:15:31.295734	\N
b3bd261f-624d-4441-808c-0ff8cd359a0e	b1000001-0001-4001-8001-000000000003	\N	\N	/uploads/black_dress_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
b9bf56d4-048a-4930-a868-dd82db026cbe	b2000002-0002-4002-8002-000000000001	\N	\N	/uploads/casual_tshirt_1789943819927.jpg	1	t	2026-09-22 04:15:31.295734	\N
871cd08f-af60-4d40-9c75-318c3f8cd05d	b2000002-0002-4002-8002-000000000002	\N	\N	/uploads/graphic_tshirt_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
3b723a36-bfb5-42d0-be1a-e254bd761126	b2000002-0002-4002-8002-000000000003	\N	\N	/uploads/tshirt_moka_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
fa26f90d-7adb-4a84-a388-8ca6f1f42015	b3000003-0003-4003-8003-000000000001	\N	\N	/uploads/denim_skirt_1789943829160.jpg	1	t	2026-09-22 04:15:31.295734	\N
dabaa237-c526-406f-b6fa-be6829cd7b9b	b3000003-0003-4003-8003-000000000002	\N	\N	/uploads/leather_skirt_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
9c6730fa-013c-46bb-a86a-31ab47634edb	b3000003-0003-4003-8003-000000000003	\N	\N	/uploads/skirt_black_denim_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
1f4e22e0-4826-4c75-ae27-b430a1519405	b4000004-0004-4004-8004-000000000001	\N	\N	/uploads/silk_shirt_1789943838183.jpg	1	t	2026-09-22 04:15:31.295734	\N
87e06785-1f7c-4388-910d-7ad02287a000	b4000004-0004-4004-8004-000000000002	\N	\N	/uploads/silk_shirt_emerald_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
1a8b4263-e64e-4de3-a292-f87968a39e5a	b4000004-0004-4004-8004-000000000003	\N	\N	/uploads/indigo_shirt_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
2ca66326-43b1-482d-9e2f-1fda66ef9e65	b5000005-0005-4005-8005-000000000001	\N	\N	/uploads/summer_shorts_1789943847571.jpg	1	t	2026-09-22 04:15:31.295734	\N
b34d1ea9-0f46-487c-b24c-1b2348938f8b	b5000005-0005-4005-8005-000000000002	\N	\N	/uploads/shorts_denim_dark_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
29c6779d-d912-410f-864e-0250063c32a5	b5000005-0005-4005-8005-000000000003	\N	\N	/uploads/shorts_denim_black_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
6f0ff052-3a97-45d1-8bd6-2dd27c73c8c7	b6000006-0006-4006-8006-000000000001	\N	\N	/uploads/winter_coat_1789943856236.jpg	1	t	2026-09-22 04:15:31.295734	\N
96e7191b-3f9d-46ad-8888-fa00a2b2aa45	b6000006-0006-4006-8006-000000000002	\N	\N	/uploads/coat_moca_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
25d39fe5-d43c-4ce6-b75a-65c9af7dd576	b6000006-0006-4006-8006-000000000003	\N	\N	/uploads/coat_navy_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
51308923-572e-4db4-afaa-d28442aff010	b7000007-0007-4007-8007-000000000001	\N	\N	/uploads/denim_jeans_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
aec1fc20-f07d-47a6-9c24-1b7e148eb66b	b7000007-0007-4007-8007-000000000002	\N	\N	/uploads/jeans_black_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
8282695b-afe5-4f6d-978b-3c98c8d2005d	b7000007-0007-4007-8007-000000000003	\N	\N	/uploads/jeans_indigo_packshot.jpg	1	t	2026-09-22 04:15:31.295734	\N
\.


--
-- Data for Name: marca; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marca (id, nombre, creado_en) FROM stdin;
\.


--
-- Data for Name: metodo_envio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metodo_envio (id, nombre, descripcion, costo, tiempo_estimado, activo, creado_en) FROM stdin;
\.


--
-- Data for Name: metodo_pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metodo_pago (id, nombre, activo) FROM stdin;
dcb8cd5b-18f8-43c7-a7b6-44dfa1beae69	QR Simple / Transferencia	t
e939257b-8c33-4688-8236-68a214c561b7	Tarjeta de Débito/Crédito	t
7082b2da-8046-4f75-8bbf-88f7be385e7f	Efectivo contra entrega	t
\.


--
-- Data for Name: nota_compra; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nota_compra (id, nro, proveedor_id, tienda_id, fecha, total, creado_en) FROM stdin;
\.


--
-- Data for Name: nota_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nota_venta (id, nro, usuario_id, cliente_id, caja_id, tienda_id, direccion_id, cupon_id, fecha, subtotal, descuento, costo_envio, total, estado, creado_en, actualizado_en) FROM stdin;
a5ac4655-0fae-4ea7-9136-7667e8932313	PED-2026-001	2a956712-fd3c-4b6b-9288-e5a06f729086	\N	\N	\N	\N	\N	2026-09-22 12:00:57.321649	350.00	0.00	20.00	370.00	PAGADO	2026-09-22 14:00:57.321649	2026-09-22 14:00:57.321649
9ece1868-974b-4d71-9fab-0cf6b0bfa264	PED-2026-002	2a956712-fd3c-4b6b-9288-e5a06f729086	\N	\N	\N	\N	\N	2026-09-22 09:00:57.321649	480.00	30.00	0.00	450.00	COMPLETADO	2026-09-22 14:00:57.321649	2026-09-22 14:00:57.321649
7785ea52-1691-49f8-be53-1f82b1468e2c	PED-2026-003	2a956712-fd3c-4b6b-9288-e5a06f729086	\N	\N	\N	\N	\N	2026-09-19 14:00:57.321649	620.00	50.00	20.00	590.00	ENTREGADO	2026-09-22 14:00:57.321649	2026-09-22 14:00:57.321649
f64c0a88-d244-4efd-ac6c-2b154df2e1d0	PED-2026-004	2a956712-fd3c-4b6b-9288-e5a06f729086	\N	\N	\N	\N	\N	2026-09-15 14:00:57.321649	290.00	0.00	15.00	305.00	ENVIADO	2026-09-22 14:00:57.321649	2026-09-22 14:00:57.321649
febaa4c5-f57c-4f36-af43-a05d6b0da58e	PED-2026-005	2a956712-fd3c-4b6b-9288-e5a06f729086	\N	\N	\N	\N	\N	2026-09-07 14:00:57.321649	850.00	100.00	0.00	750.00	ENTREGADO	2026-09-22 14:00:57.321649	2026-09-22 14:00:57.321649
da9c9c32-b7cd-49e3-920e-f28377363704	PED-2026-006	2a956712-fd3c-4b6b-9288-e5a06f729086	\N	\N	\N	\N	\N	2026-08-18 14:00:57.321649	520.00	0.00	20.00	540.00	COMPLETADO	2026-09-22 14:00:57.321649	2026-09-22 14:00:57.321649
b325a461-5299-41ab-a440-063b9eb68945	PED-2026-007	2a956712-fd3c-4b6b-9288-e5a06f729086	\N	\N	\N	\N	\N	2026-07-19 14:00:57.321649	410.00	0.00	15.00	425.00	ENTREGADO	2026-09-22 14:00:57.321649	2026-09-22 14:00:57.321649
\.


--
-- Data for Name: pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pago (id, notaventa_id, metodo_pago_id, monto, estado, respuesta_pasarela, id_transaccion, fecha_pago, creado_en) FROM stdin;
35fbcabe-d233-4af7-a3d2-95f0d9556b2a	a5ac4655-0fae-4ea7-9136-7667e8932313	dcb8cd5b-18f8-43c7-a7b6-44dfa1beae69	370.00	APROBADO	\N	TRX-QR-849201	2026-09-22 12:00:57.321649	2026-09-22 14:00:57.321649
\.


--
-- Data for Name: producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.producto (id, categoria_id, marca_id, proveedor_id, nombre, descripcion, precio, activo, destacado, creado_en, actualizado_en) FROM stdin;
b1000001-0001-4001-8001-000000000001	11111111-1111-4111-a111-111111111101	\N	\N	Vestido de Gala en Seda Escarlata	Vestido largo de gala confeccionado en satén de seda pura en vibrante color rojo escarlata. Escote drapeado y corte al bies de caída impecable, concebido para veladas inolvidables.	320.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b1000001-0001-4001-8001-000000000002	11111111-1111-4111-a111-111111111101	\N	\N	Vestido de Noche en Encaje Azul Zafiro	Elegante vestido largo en tono azul zafiro profundo con cuerpo bordado en fino encaje floral semitransparente y falda vaporosa de caída escultural.	350.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b1000001-0001-4001-8001-000000000003	11111111-1111-4111-a111-111111111101	\N	\N	Vestido Sirena Noir de Alta Costura	Corte sirena que realza la silueta femenina, confeccionado en crepé negro azabache con aplicaciones de encaje francés. Una pieza imprescindible de gala.	290.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b2000002-0002-4002-8002-000000000001	22222222-2222-4222-a222-222222222201	\N	\N	Polera Cuello Redondo de Algodón Pima	Básico esencial de fondo de armario. Confeccionada con algodón Pima peruano de fibra larga, garantizando brillo natural, suavidad extrema y durabilidad.	55.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b2000002-0002-4002-8002-000000000002	22222222-2222-4222-a222-222222222202	\N	\N	Polera Gráfica Minimalista Wander	Camiseta de corte contemporáneo en algodón peinado premium con serigrafía tipográfica editorial al frente en tinta al agua de tacto imperceptible.	65.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b2000002-0002-4002-8002-000000000003	22222222-2222-4222-a222-222222222201	\N	\N	Polera Boxy de Algodón Café Moca	Corte relajado en algodón de 220 GSM en tono café moca cálido. Versatilidad cromática ideal para combinar bajo sastrería o con denim claro.	60.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b3000003-0003-4003-8003-000000000001	67c0ec1b-94fa-4bd4-b37a-9f74f815031f	\N	\N	Falda Denim Clásica Línea A	Falda de denim rígido en lavado medio con silueta ligeramente evasé, bolsillos clásicos y costuras contrastadas en tono tabaco.	125.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b3000003-0003-4003-8003-000000000002	67c0ec1b-94fa-4bd4-b37a-9f74f815031f	\N	\N	Falda Noir de Cuero Estructurada	Falda corta de cuero ovino suave con costuras arquitectónicas, forro sedoso y cremallera trasera vista en níquel satinado.	195.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b3000003-0003-4003-8003-000000000003	67c0ec1b-94fa-4bd4-b37a-9f74f815031f	\N	\N	Falda Denim Lavado Negro Charcoal	Falda recta confeccionada en denim japonés tratado en negro carbón con sutiles matices minerales. Carácter rebelde y sofisticado.	135.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b4000004-0004-4004-8004-000000000001	33333333-3333-4333-a333-333333333302	\N	\N	Camisa de Seda Pura Noir	Camisa de corte sastre en satén de seda morera negra. Brillo fluido sedoso, cuello camisero impecable y botones ocultos.	220.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b4000004-0004-4004-8004-000000000002	33333333-3333-4333-a333-333333333302	\N	\N	Camisa de Satén de Seda Verde Esmeralda	Pieza de joyería textil confeccionada en rica seda verde esmeralda profundo. Cuello en punta y puño abotonado clásico.	240.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b4000004-0004-4004-8004-000000000003	33333333-3333-4333-a333-333333333301	\N	\N	Camisa Chambray Índigo Estampada	Camisa liviana de algodón chambray azul índigo con fino microestampado geométrico en tono tiza. Frescura y soltura artesanal.	145.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b5000005-0005-4005-8005-000000000001	fe5e4893-0236-4533-817c-da2e1db599f6	\N	\N	Shorts Denim Verano Lavado Claro	Shorts de tiro medio en denim 100%% algodón lavado a la piedra, con acabado deshilachado sutil y remaches en bronce envejecido.	85.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b5000005-0005-4005-8005-000000000002	fe5e4893-0236-4533-817c-da2e1db599f6	\N	\N	Shorts Denim en Lavado Índigo Profundo	Shorts vaqueros estructurados en denim rígido índigo profundo con doble pespunte tabaco y dobladillo pulcro.	90.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b5000005-0005-4005-8005-000000000003	fe5e4893-0236-4533-817c-da2e1db599f6	\N	\N	Shorts Denim Noir Deslavado	Shorts de denim teñido en negro con tratamiento enzimático para un tacto suave y acabado desgastado contemporáneo.	95.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b6000006-0006-4006-8006-000000000001	44444444-4444-4444-a444-444444444402	\N	\N	Abrigo Cruzado de Lana Merino Carbón	Abrigo cruzado atemporal en paño de lana merino virgen en espiga gris carbón. Solapa en pico, doble botonadura en carey y cinturón ceñidor.	360.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b6000006-0006-4006-8006-000000000002	44444444-4444-4444-a444-444444444402	\N	\N	Abrigo Cruzado en Lana Chocolate Moca	Lana peinada pesada en cálido color chocolate moca. Silueta envolvente con forro sedoso de cupro que resguarda con elegancia sobria.	380.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b6000006-0006-4006-8006-000000000003	44444444-4444-4444-a444-444444444401	\N	\N	Trench Coat Atelier en Lana Azul Marino	Trench coat estructurado en paño de lana azul marino de alta densidad. Doble botonadura, trabillas en puño y cinturón con hebilla forrada.	395.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b7000007-0007-4007-8007-000000000001	583d0937-40b2-4070-96b3-4685fdb92bc2	\N	\N	Jeans Rectos Denim Azul Clásico	Pantalón vaquero de cinco bolsillos, tiro alto y pierna recta atemporal confeccionado en denim japonés de 13 oz con lavado auténtico.	140.00	t	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b7000007-0007-4007-8007-000000000002	583d0937-40b2-4070-96b3-4685fdb92bc2	\N	\N	Jeans Rectos Denim Noir Washed	Denim pesado sin elasticidad teñido en negro azabache con leve lavado al agua para una textura suave y aspecto minimalista moderno.	145.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b7000007-0007-4007-8007-000000000003	583d0937-40b2-4070-96b3-4685fdb92bc2	\N	\N	Jeans Rectos Denim Índigo Raw	Pantalón vaquero en mezclilla rígida azul índigo oscuro sin desteñir. Silueta limpia ideal para emparejar con prendas de sastrería.	150.00	t	f	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
\.


--
-- Data for Name: producto_variante; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.producto_variante (id, producto_id, talla_id, color_id, sku, stock, stock_minimo, precio_extra, activa, creado_en, actualizado_en) FROM stdin;
eb38ac0e-e36b-45dd-9843-56f8bbf1a3db	b1000001-0001-4001-8001-000000000001	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a6	AUR-VES-ROJ-M	15	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
bb5d4aa7-3c04-49d0-9457-fac96191be3a	b1000001-0001-4001-8001-000000000001	44f26fd1-367f-49c6-83ac-65a42e41d12b	5fab2609-5a5d-4c3f-b09f-4c46e4c047a6	AUR-VES-ROJ-L	8	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
d54f4504-e372-4759-842d-b1183697b143	b1000001-0001-4001-8001-000000000002	e4ba85b0-8c5a-4246-aee4-f3bb08552621	5fab2609-5a5d-4c3f-b09f-4c46e4c047a7	AUR-VES-ZAF-S	10	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
1fd8f455-3f4e-4c8b-9f42-06d3bb688c3b	b1000001-0001-4001-8001-000000000002	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a7	AUR-VES-ZAF-M	18	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
4400b722-e1f6-4bbc-9abc-d785f0bc6be3	b1000001-0001-4001-8001-000000000003	e4ba85b0-8c5a-4246-aee4-f3bb08552620	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-VES-NOI-XS	6	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
d348f834-1992-4340-9592-92a33984403a	b1000001-0001-4001-8001-000000000003	e4ba85b0-8c5a-4246-aee4-f3bb08552621	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-VES-NOI-S	14	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
295f662d-8ead-4247-a50d-da11fb34195e	b1000001-0001-4001-8001-000000000003	060a4da2-147e-4428-a11c-befb8f87010e	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-VES-NOI-M	11	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
a8ec1913-94c6-434e-b3b6-eefa5f23e765	b2000002-0002-4002-8002-000000000001	e4ba85b0-8c5a-4246-aee4-f3bb08552621	5fab2609-5a5d-4c3f-b09f-4c46e4c047a1	AUR-POL-PIM-S	25	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
a8d56ea2-1788-4134-a649-a3984683dd38	b2000002-0002-4002-8002-000000000001	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a1	AUR-POL-PIM-M	30	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
ac3986f9-97fd-4af1-8183-97396936a250	b2000002-0002-4002-8002-000000000001	44f26fd1-367f-49c6-83ac-65a42e41d12b	5fab2609-5a5d-4c3f-b09f-4c46e4c047a1	AUR-POL-PIM-L	20	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b15a4450-8bcc-4d81-97a7-60a0d808d359	b2000002-0002-4002-8002-000000000002	e4ba85b0-8c5a-4246-aee4-f3bb08552621	5fab2609-5a5d-4c3f-b09f-4c46e4c047a1	AUR-POL-GRA-S	15	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
a9c03755-052f-4e9a-bfc0-e44480f94c2a	b2000002-0002-4002-8002-000000000002	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a1	AUR-POL-GRA-M	18	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
4d054bb2-df26-48b1-89b5-2fab5aa863bb	b2000002-0002-4002-8002-000000000003	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a3	AUR-POL-MOK-M	20	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
6ce6a2fc-a6b4-4d39-a393-0a24679e4b9b	b2000002-0002-4002-8002-000000000003	44f26fd1-367f-49c6-83ac-65a42e41d12b	5fab2609-5a5d-4c3f-b09f-4c46e4c047a3	AUR-POL-MOK-L	15	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
6ca49bc8-a8d7-4eb4-a292-10f785510011	b3000003-0003-4003-8003-000000000001	e4ba85b0-8c5a-4246-aee4-f3bb08552621	e21b66c7-5345-4e19-afd8-c9de594b77d3	AUR-FAL-DEN-S	12	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
489bebfa-9c7a-4bc5-bf59-c3762ae8e2b2	b3000003-0003-4003-8003-000000000001	060a4da2-147e-4428-a11c-befb8f87010e	e21b66c7-5345-4e19-afd8-c9de594b77d3	AUR-FAL-DEN-M	16	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
7db72797-021c-43c0-bf86-c6bfe8b1d25c	b3000003-0003-4003-8003-000000000002	e4ba85b0-8c5a-4246-aee4-f3bb08552621	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-FAL-LEATH-S	9	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
5ce489ee-5195-40ec-ae6f-b92bdb4f8438	b3000003-0003-4003-8003-000000000002	060a4da2-147e-4428-a11c-befb8f87010e	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-FAL-LEATH-M	14	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
a6e10375-105d-4160-a919-6e36f439c92c	b3000003-0003-4003-8003-000000000003	060a4da2-147e-4428-a11c-befb8f87010e	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-FAL-BLK-M	10	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
983245c9-3794-4fd6-911a-e1813ecfd6e6	b3000003-0003-4003-8003-000000000003	44f26fd1-367f-49c6-83ac-65a42e41d12b	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-FAL-BLK-L	7	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
27f75831-4e72-4edc-bb55-9b007ac8ced8	b4000004-0004-4004-8004-000000000001	e4ba85b0-8c5a-4246-aee4-f3bb08552621	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-CAM-NOI-S	10	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
7b5d1475-d39b-4ede-9303-0a7720d60e8c	b4000004-0004-4004-8004-000000000001	060a4da2-147e-4428-a11c-befb8f87010e	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-CAM-NOI-M	15	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
3ba727b0-4567-4ab8-95a2-259f4284cf2a	b4000004-0004-4004-8004-000000000002	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a8	AUR-CAM-ESM-M	18	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
6058bd1d-22b0-437c-989e-f71f16925d1f	b4000004-0004-4004-8004-000000000002	44f26fd1-367f-49c6-83ac-65a42e41d12b	5fab2609-5a5d-4c3f-b09f-4c46e4c047a8	AUR-CAM-ESM-L	12	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
c7dd7a7b-d895-44b4-886b-c5642c5c363e	b4000004-0004-4004-8004-000000000003	e4ba85b0-8c5a-4246-aee4-f3bb08552621	5fab2609-5a5d-4c3f-b09f-4c46e4c047a9	AUR-CAM-IND-S	14	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
c2d6b05a-ce36-4c0b-aed1-d853103c228d	b4000004-0004-4004-8004-000000000003	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a9	AUR-CAM-IND-M	20	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
ca7b5843-935e-432d-8c43-2c61e597f70a	b5000005-0005-4005-8005-000000000001	e4ba85b0-8c5a-4246-aee4-f3bb08552621	e21b66c7-5345-4e19-afd8-c9de594b77d3	AUR-SHO-LIG-S	16	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
4419f560-9772-4d7c-b8a1-57d9371424eb	b5000005-0005-4005-8005-000000000001	060a4da2-147e-4428-a11c-befb8f87010e	e21b66c7-5345-4e19-afd8-c9de594b77d3	AUR-SHO-LIG-M	22	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
8d51400e-d7ca-4354-b75f-0018f9225951	b5000005-0005-4005-8005-000000000002	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a9	AUR-SHO-IND-M	18	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
23652d35-8c81-4b13-9e06-9d7441f5135e	b5000005-0005-4005-8005-000000000003	e4ba85b0-8c5a-4246-aee4-f3bb08552621	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-SHO-NOI-S	12	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
eae01069-811e-49f7-8c59-9414f501a8c5	b5000005-0005-4005-8005-000000000003	060a4da2-147e-4428-a11c-befb8f87010e	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-SHO-NOI-M	15	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
016b7c26-b145-4060-a6b0-e3ede39cc0fe	b6000006-0006-4006-8006-000000000001	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047aa	AUR-ABR-CAR-M	10	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
56b32ffb-833e-4bc6-bfd6-421967636cc5	b6000006-0006-4006-8006-000000000001	44f26fd1-367f-49c6-83ac-65a42e41d12b	5fab2609-5a5d-4c3f-b09f-4c46e4c047aa	AUR-ABR-CAR-L	8	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
216b9a89-1040-4faa-80db-1386fc665c97	b6000006-0006-4006-8006-000000000002	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a3	AUR-ABR-MOC-M	8	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
09fa5005-ee2f-456f-a897-ff386bae8f50	b6000006-0006-4006-8006-000000000002	44f26fd1-367f-49c6-83ac-65a42e41d12b	5fab2609-5a5d-4c3f-b09f-4c46e4c047a3	AUR-ABR-MOC-L	6	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
c9d76537-f335-4938-b811-0f35e8a24abf	b6000006-0006-4006-8006-000000000003	44f26fd1-367f-49c6-83ac-65a42e41d12b	5fab2609-5a5d-4c3f-b09f-4c46e4c047ab	AUR-ABR-NAV-L	7	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
ff0b19ad-76c9-4d76-bc38-8533ac0d0f62	b7000007-0007-4007-8007-000000000001	e4ba85b0-8c5a-4246-aee4-f3bb08552621	e21b66c7-5345-4e19-afd8-c9de594b77d3	AUR-JEA-BLU-S	12	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
6948c95c-69ad-4701-814e-8ed08d833ca2	b7000007-0007-4007-8007-000000000001	060a4da2-147e-4428-a11c-befb8f87010e	e21b66c7-5345-4e19-afd8-c9de594b77d3	AUR-JEA-BLU-M	15	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
3d79aeff-90e8-4a35-8e42-3a35f384c0ec	b7000007-0007-4007-8007-000000000002	e4ba85b0-8c5a-4246-aee4-f3bb08552621	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-JEA-NOI-S	14	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
65f25c53-9838-472f-9c9c-05221fbc9e26	b7000007-0007-4007-8007-000000000002	060a4da2-147e-4428-a11c-befb8f87010e	d8e784f8-74ac-4050-abd5-6306501adc5d	AUR-JEA-NOI-M	18	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
c9cb8d43-0e17-4531-9aac-656c64703eab	b7000007-0007-4007-8007-000000000003	060a4da2-147e-4428-a11c-befb8f87010e	5fab2609-5a5d-4c3f-b09f-4c46e4c047a9	AUR-JEA-IND-M	12	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
b7fc6690-a475-4a27-b77e-fcf7b394785b	b7000007-0007-4007-8007-000000000003	44f26fd1-367f-49c6-83ac-65a42e41d12b	5fab2609-5a5d-4c3f-b09f-4c46e4c047a9	AUR-JEA-IND-L	10	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
116024f2-9ec8-45c4-a730-961d18680277	b1000001-0001-4001-8001-000000000001	e4ba85b0-8c5a-4246-aee4-f3bb08552621	5fab2609-5a5d-4c3f-b09f-4c46e4c047a6	AUR-VES-ROJ-S	2	5	0.00	t	2026-09-22 04:15:31.295734	2026-09-22 04:15:31.295734
\.


--
-- Data for Name: promocion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promocion (id, nombre, descripcion, tipo, descuento, precio_combo, fecha_inicial, fecha_final, estado, creado_en) FROM stdin;
\.


--
-- Data for Name: proveedor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proveedor (id, ci, nombre, descripcion, telefono, correo, direccion, creado_en) FROM stdin;
\.


--
-- Data for Name: resena; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resena (id, usuario_id, producto_id, notaventa_id, calificacion, comentario, aprobada, creado_en, actualizado_en) FROM stdin;
cef810cc-4a30-4a58-b6cf-115e5a42ba71	e4949d4b-1a81-49f5-97f3-ca9e86fda5d6	b1000001-0001-4001-8001-000000000001	\N	5	El satén de seda en rojo escarlata es una joya. La caída drapeada y la confección son de un nivel digno de alta costura.	t	2026-09-22 04:15:31.940378	2026-09-22 04:15:31.940378
8c96a6e0-87c9-4f28-acfd-f3c396f908c5	e4949d4b-1a81-49f5-97f3-ca9e86fda5d6	b6000006-0006-4006-8006-000000000001	\N	5	El abrigo tiene una estructura y proporción extraordinarias. La lana espiga es cálida, pesada y de presencia imponente.	t	2026-09-22 04:15:31.944268	2026-09-22 04:15:31.944268
\.


--
-- Data for Name: rol; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rol (id, nombre, descripcion, creado_en) FROM stdin;
4b2e11e5-7efc-4ec3-b499-cdcf4f35b71f	CLIENTE	Rol por defecto	2026-09-20 05:27:24.661367
6f1da988-4367-4848-9ee2-fb2783129dcc	ADMIN	Administrador del sistema	2026-09-20 23:24:37.349524
00e5c479-504f-4bd0-986d-78cc87ad55d9	EMPLEADO	Personal de ventas e inventario	2026-09-21 16:40:02.651764
\.


--
-- Data for Name: talla; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.talla (id, nombre, orden) FROM stdin;
e4ba85b0-8c5a-4246-aee4-f3bb08552620	XS	0
e4ba85b0-8c5a-4246-aee4-f3bb08552621	S	1
060a4da2-147e-4428-a11c-befb8f87010e	M	2
44f26fd1-367f-49c6-83ac-65a42e41d12b	L	3
44f26fd1-367f-49c6-83ac-65a42e41d12c	XL	4
\.


--
-- Data for Name: tienda; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tienda (id, nombre, fecha, estado, creado_en) FROM stdin;
\.


--
-- Data for Name: token; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.token (id, usuario_id, tipo, valor, expira_en, usado, creado_en) FROM stdin;
1a8b2092-02a2-4696-8831-9b1670c7f0f3	7ea8eba8-9411-4e69-a815-dd582e4096ae	VERIFICACION_EMAIL	dfb88ead-904a-4a9a-a74a-7909d9f01358	2026-09-21 18:16:05.391	f	2026-09-20 22:16:05.376374
b4869151-fe48-4002-a4de-a75bca331d87	7ea8eba8-9411-4e69-a815-dd582e4096ae	REFRESH	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWE4ZWJhOC05NDExLTRlNjktYTgxNS1kZDU4MmU0MDk2YWUiLCJlbWFpbCI6ImRpZWdvYXN0ZXRlcGF6QGdtYWlsLmNvbSIsInJvbGUiOiJDTElFTlRFIiwianRpIjoiMDM4N2I0NzgtODcxZi00MWE4LTkyZDQtOTk1ZDY1N2NiMmNkIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3ODk5NDI2MDksImV4cCI6MTc5MDU0NzQwOX0.UF0ZuR8pN6ECQLegADqnGng-48hDL_y18JF5IJija3Q	2026-09-27 18:16:49.023	t	2026-09-20 22:16:49.023635
2ddacd39-db74-4654-a0a6-7a65f964cfb2	7ea8eba8-9411-4e69-a815-dd582e4096ae	REFRESH	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWE4ZWJhOC05NDExLTRlNjktYTgxNS1kZDU4MmU0MDk2YWUiLCJlbWFpbCI6ImRpZWdvYXN0ZXRlcGF6QGdtYWlsLmNvbSIsInJvbGUiOiJBRE1JTiIsImp0aSI6IjczYzM2ZTdiLWMwMmUtNGU4ZC05ZGJhLTFiYzczNmVkNTI3NSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzg5OTQ2NzIxLCJleHAiOjE3OTA1NTE1MjF9.R3vEa36HtXZpQ1s06vuAkIrspkB8GvlQ5oen6JLzgbY	2026-09-27 19:25:21.891	f	2026-09-20 23:25:21.891445
95982e5f-e449-4c0f-aee2-a36daddae9f0	7ea8eba8-9411-4e69-a815-dd582e4096ae	REFRESH	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWE4ZWJhOC05NDExLTRlNjktYTgxNS1kZDU4MmU0MDk2YWUiLCJlbWFpbCI6ImRpZWdvYXN0ZXRlcGF6QGdtYWlsLmNvbSIsInJvbGUiOiJBRE1JTiIsImp0aSI6IjFlYmM0ZGRkLWRlNDMtNDkwYS04MmUwLTIyN2IyNGMwOTI4NCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzg5OTQ2NzQxLCJleHAiOjE3OTA1NTE1NDF9.yI592fk5tHsilPiF3s-GMk7pNgPcyYlxaCyLPGMh6AA	2026-09-27 19:25:41.906	f	2026-09-20 23:25:41.906977
96445ec6-0d82-40fa-b71f-cf6fb4d876fe	7ea8eba8-9411-4e69-a815-dd582e4096ae	REFRESH	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWE4ZWJhOC05NDExLTRlNjktYTgxNS1kZDU4MmU0MDk2YWUiLCJlbWFpbCI6ImRpZWdvYXN0ZXRlcGF6QGdtYWlsLmNvbSIsInJvbGUiOiJBRE1JTiIsImp0aSI6IjE3NGVkMWUwLWVlMjctNDljYS04ZmFlLWQyOTc3MjU3YmZjNCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzg5OTQ3MjYxLCJleHAiOjE3OTA1NTIwNjF9.wtZlfPYFh03Trtvr8IEFlRSP_s8q-H1T4UCGi5LA-JY	2026-09-27 19:34:21.03	f	2026-09-20 23:34:21.030532
418a538e-34f1-4275-accc-654aaf55e5da	7ea8eba8-9411-4e69-a815-dd582e4096ae	REFRESH	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWE4ZWJhOC05NDExLTRlNjktYTgxNS1kZDU4MmU0MDk2YWUiLCJlbWFpbCI6ImRpZWdvYXN0ZXRlcGF6QGdtYWlsLmNvbSIsInJvbGUiOiJBRE1JTiIsImp0aSI6IjMyZDYzMTk2LTY2YTctNDNiMS1hODUxLTAyYWRiZjZkNjU1OCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzkwMDEyMjY4LCJleHAiOjE3OTA2MTcwNjh9._2d0JnaiGob6FHKf1qNd5Va7xVlV-aFzOWrVPSZlcSQ	2026-09-28 13:37:48.05	f	2026-09-21 17:37:48.050837
cb380486-cb90-4791-832f-4f4f398caae8	7ea8eba8-9411-4e69-a815-dd582e4096ae	REFRESH	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWE4ZWJhOC05NDExLTRlNjktYTgxNS1kZDU4MmU0MDk2YWUiLCJlbWFpbCI6ImRpZWdvYXN0ZXRlcGF6QGdtYWlsLmNvbSIsInJvbGUiOiJBRE1JTiIsImp0aSI6IjEyZGM5NGUxLWZhMDktNDAyYy04NzIwLWVkODI4MTg4MjkzNCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzkwMDEzNzQ1LCJleHAiOjE3OTA2MTg1NDV9.jt7RmZ02tGOBvf_tioxTNJqxTOd_KRTtmpNVJnJf3FQ	2026-09-28 14:02:25.546	f	2026-09-21 18:02:25.546811
bfeed532-b017-4548-812a-705caa907ea7	7ea8eba8-9411-4e69-a815-dd582e4096ae	REFRESH	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWE4ZWJhOC05NDExLTRlNjktYTgxNS1kZDU4MmU0MDk2YWUiLCJlbWFpbCI6ImRpZWdvYXN0ZXRlcGF6QGdtYWlsLmNvbSIsInJvbGUiOiJBRE1JTiIsImp0aSI6IjAwYWM3MGRhLTgyZjUtNDI1YS1hZmU3LWUxOWU5ODQ1MDUwNCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzkwMDE0MzUwLCJleHAiOjE3OTA2MTkxNTB9.muaKw4QOXy1Z3BMo_YAl59Qdjl46HVKrc3Sl06BgKBk	2026-09-28 14:12:30.479	f	2026-09-21 18:12:30.480062
142ba2e5-fd04-45c7-931e-6796f2205d27	7ea8eba8-9411-4e69-a815-dd582e4096ae	REFRESH	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWE4ZWJhOC05NDExLTRlNjktYTgxNS1kZDU4MmU0MDk2YWUiLCJlbWFpbCI6ImRpZWdvYXN0ZXRlcGF6QGdtYWlsLmNvbSIsInJvbGUiOiJBRE1JTiIsImp0aSI6IjI5ZTg2Yzg5LWY3MGUtNDYyNS1hYTkwLTRjOWIyYWM5OGNkNyIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzkwMDM0Mzk0LCJleHAiOjE3OTA2MzkxOTR9.VRW03qzHzzBL2bwqxb-eLX9f5xSupfEfsQVELDqMjFI	2026-09-28 19:46:34.533	f	2026-09-21 23:46:34.533473
\.


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario (id, rol_id, ci, nombre, apellido, celular, correo, contrasena, foto, email_verificado, activo, ultimo_login, creado_en, actualizado_en) FROM stdin;
2a956712-fd3c-4b6b-9288-e5a06f729086	4b2e11e5-7efc-4ec3-b499-cdcf4f35b71f	1234567	Diego	Astete	\N	diego@test.com	hashed123	\N	t	t	\N	2026-09-20 05:27:24.661367	2026-09-20 05:27:24.661367
87a45c73-7297-467d-90c0-e51002477ad8	6f1da988-4367-4848-9ee2-fb2783129dcc	\N	Admin	General	\N	admin@elmagnifico.com	$2a$06$WkVj56wNsaDhbjW/zU7T/Oey.sX15MgU9/6wMRo/fop8sUuGhyyUS	\N	t	t	\N	2026-09-21 00:31:05.096418	2026-09-21 00:31:05.096418
7ea8eba8-9411-4e69-a815-dd582e4096ae	6f1da988-4367-4848-9ee2-fb2783129dcc	\N	Diego	Astete	\N	diegoastetepaz@gmail.com	$2b$10$3Zcn64wpM3yrv3N3epbFPeW30qmCtnf2sO9p67Pay/b.VZhvh2lOK	\N	f	t	2026-09-21 19:46:34.517	2026-09-20 22:16:05.376374	2026-09-21 23:46:34.521909
e4949d4b-1a81-49f5-97f3-ca9e86fda5d6	6f1da988-4367-4848-9ee2-fb2783129dcc	\N	Admin	AURA	\N	admin@aura-atelier.com	$2a$06$Wf4hI1tfONYFLT7aWFV/1.jwD.iS3CswZzP2Ct5V3VYrvVLQz2/p.	\N	t	t	\N	2026-09-22 00:43:02.018759	2026-09-22 00:43:02.018759
\.


--
-- Name: archivo archivo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.archivo
    ADD CONSTRAINT archivo_pkey PRIMARY KEY (id);


--
-- Name: bitacora bitacora_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitacora
    ADD CONSTRAINT bitacora_pkey PRIMARY KEY (id);


--
-- Name: caja caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caja
    ADD CONSTRAINT caja_pkey PRIMARY KEY (id);


--
-- Name: carrito carrito_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito
    ADD CONSTRAINT carrito_pkey PRIMARY KEY (id);


--
-- Name: carrito carrito_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito
    ADD CONSTRAINT carrito_usuario_id_key UNIQUE (usuario_id);


--
-- Name: categoria categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_pkey PRIMARY KEY (id);


--
-- Name: cliente cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (id);


--
-- Name: cliente cliente_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_usuario_id_key UNIQUE (usuario_id);


--
-- Name: color color_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color
    ADD CONSTRAINT color_nombre_key UNIQUE (nombre);


--
-- Name: color color_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color
    ADD CONSTRAINT color_pkey PRIMARY KEY (id);


--
-- Name: cotizacion cotizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_pkey PRIMARY KEY (id);


--
-- Name: cupon cupon_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cupon
    ADD CONSTRAINT cupon_codigo_key UNIQUE (codigo);


--
-- Name: cupon cupon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cupon
    ADD CONSTRAINT cupon_pkey PRIMARY KEY (id);


--
-- Name: cupon_uso cupon_uso_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cupon_uso
    ADD CONSTRAINT cupon_uso_pkey PRIMARY KEY (id);


--
-- Name: detalle_carrito detalle_carrito_carrito_id_variante_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_carrito
    ADD CONSTRAINT detalle_carrito_carrito_id_variante_id_key UNIQUE (carrito_id, variante_id);


--
-- Name: detalle_carrito detalle_carrito_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_carrito
    ADD CONSTRAINT detalle_carrito_pkey PRIMARY KEY (id);


--
-- Name: detalle_cotizacion detalle_cotizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_cotizacion
    ADD CONSTRAINT detalle_cotizacion_pkey PRIMARY KEY (id);


--
-- Name: detalle_devolucion detalle_devolucion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_pkey PRIMARY KEY (id);


--
-- Name: detalle_nota_compra detalle_nota_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_nota_compra
    ADD CONSTRAINT detalle_nota_compra_pkey PRIMARY KEY (id);


--
-- Name: detalle_nota_venta detalle_nota_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_nota_venta
    ADD CONSTRAINT detalle_nota_venta_pkey PRIMARY KEY (id);


--
-- Name: detalle_promocion detalle_promocion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_promocion
    ADD CONSTRAINT detalle_promocion_pkey PRIMARY KEY (id);


--
-- Name: devolucion devolucion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT devolucion_pkey PRIMARY KEY (id);


--
-- Name: direccion direccion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direccion
    ADD CONSTRAINT direccion_pkey PRIMARY KEY (id);


--
-- Name: empleado empleado_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado
    ADD CONSTRAINT empleado_pkey PRIMARY KEY (id);


--
-- Name: empleado empleado_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado
    ADD CONSTRAINT empleado_usuario_id_key UNIQUE (usuario_id);


--
-- Name: envio envio_notaventa_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.envio
    ADD CONSTRAINT envio_notaventa_id_key UNIQUE (notaventa_id);


--
-- Name: envio envio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.envio
    ADD CONSTRAINT envio_pkey PRIMARY KEY (id);


--
-- Name: estado_rol estado_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estado_rol
    ADD CONSTRAINT estado_rol_pkey PRIMARY KEY (id);


--
-- Name: favorito favorito_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorito
    ADD CONSTRAINT favorito_pkey PRIMARY KEY (id);


--
-- Name: favorito favorito_usuario_id_producto_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorito
    ADD CONSTRAINT favorito_usuario_id_producto_id_key UNIQUE (usuario_id, producto_id);


--
-- Name: historial_venta historial_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_venta
    ADD CONSTRAINT historial_venta_pkey PRIMARY KEY (id);


--
-- Name: imagen_producto imagen_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imagen_producto
    ADD CONSTRAINT imagen_producto_pkey PRIMARY KEY (id);


--
-- Name: marca marca_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marca
    ADD CONSTRAINT marca_nombre_key UNIQUE (nombre);


--
-- Name: marca marca_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marca
    ADD CONSTRAINT marca_pkey PRIMARY KEY (id);


--
-- Name: metodo_envio metodo_envio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodo_envio
    ADD CONSTRAINT metodo_envio_pkey PRIMARY KEY (id);


--
-- Name: metodo_pago metodo_pago_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodo_pago
    ADD CONSTRAINT metodo_pago_nombre_key UNIQUE (nombre);


--
-- Name: metodo_pago metodo_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodo_pago
    ADD CONSTRAINT metodo_pago_pkey PRIMARY KEY (id);


--
-- Name: nota_compra nota_compra_nro_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_compra
    ADD CONSTRAINT nota_compra_nro_key UNIQUE (nro);


--
-- Name: nota_compra nota_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_compra
    ADD CONSTRAINT nota_compra_pkey PRIMARY KEY (id);


--
-- Name: nota_venta nota_venta_nro_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_venta
    ADD CONSTRAINT nota_venta_nro_key UNIQUE (nro);


--
-- Name: nota_venta nota_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_venta
    ADD CONSTRAINT nota_venta_pkey PRIMARY KEY (id);


--
-- Name: pago pago_notaventa_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_notaventa_id_key UNIQUE (notaventa_id);


--
-- Name: pago pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_pkey PRIMARY KEY (id);


--
-- Name: producto producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_pkey PRIMARY KEY (id);


--
-- Name: producto_variante producto_variante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variante
    ADD CONSTRAINT producto_variante_pkey PRIMARY KEY (id);


--
-- Name: producto_variante producto_variante_producto_id_talla_id_color_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variante
    ADD CONSTRAINT producto_variante_producto_id_talla_id_color_id_key UNIQUE (producto_id, talla_id, color_id);


--
-- Name: producto_variante producto_variante_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variante
    ADD CONSTRAINT producto_variante_sku_key UNIQUE (sku);


--
-- Name: promocion promocion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocion
    ADD CONSTRAINT promocion_pkey PRIMARY KEY (id);


--
-- Name: proveedor proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedor
    ADD CONSTRAINT proveedor_pkey PRIMARY KEY (id);


--
-- Name: resena resena_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_pkey PRIMARY KEY (id);


--
-- Name: resena resena_usuario_id_producto_id_notaventa_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_usuario_id_producto_id_notaventa_id_key UNIQUE (usuario_id, producto_id, notaventa_id);


--
-- Name: rol rol_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_nombre_key UNIQUE (nombre);


--
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id);


--
-- Name: talla talla_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.talla
    ADD CONSTRAINT talla_nombre_key UNIQUE (nombre);


--
-- Name: talla talla_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.talla
    ADD CONSTRAINT talla_pkey PRIMARY KEY (id);


--
-- Name: tienda tienda_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tienda
    ADD CONSTRAINT tienda_pkey PRIMARY KEY (id);


--
-- Name: token token_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_pkey PRIMARY KEY (id);


--
-- Name: token token_valor_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_valor_key UNIQUE (valor);


--
-- Name: usuario usuario_ci_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_ci_key UNIQUE (ci);


--
-- Name: usuario usuario_correo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_correo_key UNIQUE (correo);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- Name: idx_bitacora_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bitacora_fecha ON public.bitacora USING btree (fecha);


--
-- Name: idx_bitacora_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bitacora_usuario ON public.bitacora USING btree (usuario_id);


--
-- Name: idx_detalle_carrito; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_carrito ON public.detalle_carrito USING btree (carrito_id);


--
-- Name: idx_detalle_notaventa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_notaventa ON public.detalle_nota_venta USING btree (notaventa_id);


--
-- Name: idx_direccion_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_direccion_usuario ON public.direccion USING btree (usuario_id);


--
-- Name: idx_historial_notaventa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_notaventa ON public.historial_venta USING btree (notaventa_id);


--
-- Name: idx_imagen_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_imagen_producto ON public.imagen_producto USING btree (producto_id);


--
-- Name: idx_notaventa_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notaventa_estado ON public.nota_venta USING btree (estado);


--
-- Name: idx_notaventa_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notaventa_usuario ON public.nota_venta USING btree (usuario_id);


--
-- Name: idx_producto_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_categoria ON public.producto USING btree (categoria_id);


--
-- Name: idx_producto_marca; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_marca ON public.producto USING btree (marca_id);


--
-- Name: idx_producto_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_nombre ON public.producto USING btree (nombre);


--
-- Name: idx_resena_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resena_producto ON public.resena USING btree (producto_id);


--
-- Name: idx_token_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_usuario ON public.token USING btree (usuario_id);


--
-- Name: idx_token_valor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_valor ON public.token USING btree (valor);


--
-- Name: idx_usuario_correo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_correo ON public.usuario USING btree (correo);


--
-- Name: idx_usuario_rol; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_rol ON public.usuario USING btree (rol_id);


--
-- Name: idx_variante_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variante_producto ON public.producto_variante USING btree (producto_id);


--
-- Name: archivo archivo_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.archivo
    ADD CONSTRAINT archivo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: bitacora bitacora_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitacora
    ADD CONSTRAINT bitacora_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: caja caja_tienda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caja
    ADD CONSTRAINT caja_tienda_id_fkey FOREIGN KEY (tienda_id) REFERENCES public.tienda(id) ON DELETE SET NULL;


--
-- Name: carrito carrito_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito
    ADD CONSTRAINT carrito_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: categoria categoria_padre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_padre_id_fkey FOREIGN KEY (padre_id) REFERENCES public.categoria(id) ON DELETE SET NULL;


--
-- Name: cliente cliente_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: cotizacion cotizacion_tienda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_tienda_id_fkey FOREIGN KEY (tienda_id) REFERENCES public.tienda(id) ON DELETE SET NULL;


--
-- Name: cotizacion cotizacion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: cupon_uso cupon_uso_cupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cupon_uso
    ADD CONSTRAINT cupon_uso_cupon_id_fkey FOREIGN KEY (cupon_id) REFERENCES public.cupon(id) ON DELETE CASCADE;


--
-- Name: cupon_uso cupon_uso_notaventa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cupon_uso
    ADD CONSTRAINT cupon_uso_notaventa_id_fkey FOREIGN KEY (notaventa_id) REFERENCES public.nota_venta(id) ON DELETE CASCADE;


--
-- Name: cupon_uso cupon_uso_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cupon_uso
    ADD CONSTRAINT cupon_uso_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: detalle_carrito detalle_carrito_carrito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_carrito
    ADD CONSTRAINT detalle_carrito_carrito_id_fkey FOREIGN KEY (carrito_id) REFERENCES public.carrito(id) ON DELETE CASCADE;


--
-- Name: detalle_carrito detalle_carrito_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_carrito
    ADD CONSTRAINT detalle_carrito_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variante(id) ON DELETE CASCADE;


--
-- Name: detalle_cotizacion detalle_cotizacion_cotizacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_cotizacion
    ADD CONSTRAINT detalle_cotizacion_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES public.cotizacion(id) ON DELETE CASCADE;


--
-- Name: detalle_devolucion detalle_devolucion_devolucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_devolucion_id_fkey FOREIGN KEY (devolucion_id) REFERENCES public.devolucion(id) ON DELETE CASCADE;


--
-- Name: detalle_devolucion detalle_devolucion_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id) ON DELETE RESTRICT;


--
-- Name: detalle_nota_compra detalle_nota_compra_notacompra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_nota_compra
    ADD CONSTRAINT detalle_nota_compra_notacompra_id_fkey FOREIGN KEY (notacompra_id) REFERENCES public.nota_compra(id) ON DELETE CASCADE;


--
-- Name: detalle_nota_compra detalle_nota_compra_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_nota_compra
    ADD CONSTRAINT detalle_nota_compra_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id) ON DELETE RESTRICT;


--
-- Name: detalle_nota_venta detalle_nota_venta_notaventa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_nota_venta
    ADD CONSTRAINT detalle_nota_venta_notaventa_id_fkey FOREIGN KEY (notaventa_id) REFERENCES public.nota_venta(id) ON DELETE CASCADE;


--
-- Name: detalle_nota_venta detalle_nota_venta_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_nota_venta
    ADD CONSTRAINT detalle_nota_venta_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id) ON DELETE RESTRICT;


--
-- Name: detalle_nota_venta detalle_nota_venta_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_nota_venta
    ADD CONSTRAINT detalle_nota_venta_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variante(id) ON DELETE SET NULL;


--
-- Name: detalle_promocion detalle_promocion_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_promocion
    ADD CONSTRAINT detalle_promocion_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id) ON DELETE CASCADE;


--
-- Name: detalle_promocion detalle_promocion_promocion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_promocion
    ADD CONSTRAINT detalle_promocion_promocion_id_fkey FOREIGN KEY (promocion_id) REFERENCES public.promocion(id) ON DELETE CASCADE;


--
-- Name: devolucion devolucion_notaventa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT devolucion_notaventa_id_fkey FOREIGN KEY (notaventa_id) REFERENCES public.nota_venta(id) ON DELETE SET NULL;


--
-- Name: direccion direccion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direccion
    ADD CONSTRAINT direccion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: empleado empleado_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado
    ADD CONSTRAINT empleado_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: envio envio_direccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.envio
    ADD CONSTRAINT envio_direccion_id_fkey FOREIGN KEY (direccion_id) REFERENCES public.direccion(id) ON DELETE RESTRICT;


--
-- Name: envio envio_metodo_envio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.envio
    ADD CONSTRAINT envio_metodo_envio_id_fkey FOREIGN KEY (metodo_envio_id) REFERENCES public.metodo_envio(id) ON DELETE RESTRICT;


--
-- Name: envio envio_notaventa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.envio
    ADD CONSTRAINT envio_notaventa_id_fkey FOREIGN KEY (notaventa_id) REFERENCES public.nota_venta(id) ON DELETE CASCADE;


--
-- Name: estado_rol estado_rol_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estado_rol
    ADD CONSTRAINT estado_rol_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.rol(id) ON DELETE CASCADE;


--
-- Name: favorito favorito_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorito
    ADD CONSTRAINT favorito_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id) ON DELETE CASCADE;


--
-- Name: favorito favorito_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorito
    ADD CONSTRAINT favorito_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: historial_venta historial_venta_notaventa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_venta
    ADD CONSTRAINT historial_venta_notaventa_id_fkey FOREIGN KEY (notaventa_id) REFERENCES public.nota_venta(id) ON DELETE CASCADE;


--
-- Name: historial_venta historial_venta_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_venta
    ADD CONSTRAINT historial_venta_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: imagen_producto imagen_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imagen_producto
    ADD CONSTRAINT imagen_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id) ON DELETE CASCADE;


--
-- Name: nota_compra nota_compra_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_compra
    ADD CONSTRAINT nota_compra_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedor(id) ON DELETE RESTRICT;


--
-- Name: nota_compra nota_compra_tienda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_compra
    ADD CONSTRAINT nota_compra_tienda_id_fkey FOREIGN KEY (tienda_id) REFERENCES public.tienda(id) ON DELETE SET NULL;


--
-- Name: nota_venta nota_venta_caja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_venta
    ADD CONSTRAINT nota_venta_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES public.caja(id) ON DELETE SET NULL;


--
-- Name: nota_venta nota_venta_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_venta
    ADD CONSTRAINT nota_venta_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE SET NULL;


--
-- Name: nota_venta nota_venta_cupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_venta
    ADD CONSTRAINT nota_venta_cupon_id_fkey FOREIGN KEY (cupon_id) REFERENCES public.cupon(id) ON DELETE SET NULL;


--
-- Name: nota_venta nota_venta_direccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_venta
    ADD CONSTRAINT nota_venta_direccion_id_fkey FOREIGN KEY (direccion_id) REFERENCES public.direccion(id) ON DELETE SET NULL;


--
-- Name: nota_venta nota_venta_tienda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_venta
    ADD CONSTRAINT nota_venta_tienda_id_fkey FOREIGN KEY (tienda_id) REFERENCES public.tienda(id) ON DELETE SET NULL;


--
-- Name: nota_venta nota_venta_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_venta
    ADD CONSTRAINT nota_venta_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: pago pago_metodo_pago_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_metodo_pago_id_fkey FOREIGN KEY (metodo_pago_id) REFERENCES public.metodo_pago(id) ON DELETE RESTRICT;


--
-- Name: pago pago_notaventa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_notaventa_id_fkey FOREIGN KEY (notaventa_id) REFERENCES public.nota_venta(id) ON DELETE CASCADE;


--
-- Name: producto producto_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categoria(id) ON DELETE RESTRICT;


--
-- Name: producto producto_marca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_marca_id_fkey FOREIGN KEY (marca_id) REFERENCES public.marca(id) ON DELETE SET NULL;


--
-- Name: producto producto_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedor(id) ON DELETE SET NULL;


--
-- Name: producto_variante producto_variante_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variante
    ADD CONSTRAINT producto_variante_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.color(id) ON DELETE SET NULL;


--
-- Name: producto_variante producto_variante_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variante
    ADD CONSTRAINT producto_variante_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id) ON DELETE CASCADE;


--
-- Name: producto_variante producto_variante_talla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variante
    ADD CONSTRAINT producto_variante_talla_id_fkey FOREIGN KEY (talla_id) REFERENCES public.talla(id) ON DELETE SET NULL;


--
-- Name: resena resena_notaventa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_notaventa_id_fkey FOREIGN KEY (notaventa_id) REFERENCES public.nota_venta(id) ON DELETE SET NULL;


--
-- Name: resena resena_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.producto(id) ON DELETE CASCADE;


--
-- Name: resena resena_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: token token_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: usuario usuario_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.rol(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict ySPREPqeJsxuobY5kzJ9cjejekExSHhLIVp1TflQwRqgysiANnAVVHW4t5j720S

