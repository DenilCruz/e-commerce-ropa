SET client_encoding = 'UTF8';

BEGIN;

-- Limpieza limpia para regeneración de catálogo AURA
TRUNCATE TABLE resena CASCADE;
TRUNCATE TABLE detalle_carrito CASCADE;
TRUNCATE TABLE detalle_nota_venta CASCADE;
TRUNCATE TABLE detalle_promocion CASCADE;
TRUNCATE TABLE favorito CASCADE;
TRUNCATE TABLE imagen_producto CASCADE;
TRUNCATE TABLE producto_variante CASCADE;
TRUNCATE TABLE producto CASCADE;
TRUNCATE TABLE categoria CASCADE;
TRUNCATE TABLE color CASCADE;
TRUNCATE TABLE talla CASCADE;

-- 1. CATEGORÍAS
INSERT INTO categoria (id, nombre, descripcion, activa, padre_id) VALUES
('264efe79-ded7-4cfa-a0b0-110b822944c5', 'Vestidos', 'Vestidos de corte editorial en sedas y linos puros', true, NULL),
('5977fad7-63be-49cd-bee5-1d572e849cdd', 'Poleras', 'Tops y poleras de algodón Pima y canalé fino', true, NULL),
('67c0ec1b-94fa-4bd4-b37a-9f74f815031f', 'Faldas', 'Faldas midi estructuradas, satinadas y plisadas', true, NULL),
('3a3ed9f0-94be-45a7-8699-c007a4ef9795', 'Camisas', 'Camisas en popelina y seda con sastrería precisa', true, NULL),
('fe5e4893-0236-4533-817c-da2e1db599f6', 'Shorts', 'Bermudas sartoriales y shorts veraniegos de lino', true, NULL),
('afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b', 'Abrigos', 'Blazers de lana, trench coats y tapados de invierno', true, NULL),
('583d0937-40b2-4070-96b3-4685fdb92bc2', 'Pantalones', 'Pantalones de corte sastre y siluetas fluidas', true, NULL),

-- Subcategorías
('11111111-1111-4111-a111-111111111101', 'Vestidos de Noche', 'Vestidos de gala y seda para veladas exclusivas', true, '264efe79-ded7-4cfa-a0b0-110b822944c5'),
('11111111-1111-4111-a111-111111111102', 'Vestidos Casuales', 'Siluetas ligeras de lino para el día a día', true, '264efe79-ded7-4cfa-a0b0-110b822944c5'),
('22222222-2222-4222-a222-222222222201', 'Poleras Básicas', 'Esenciales en algodón peruano de máxima pureza', true, '5977fad7-63be-49cd-bee5-1d572e849cdd'),
('22222222-2222-4222-a222-222222222202', 'Tops y Canalé', 'Prendas de punto fino para combinar en capas', true, '5977fad7-63be-49cd-bee5-1d572e849cdd'),
('33333333-3333-4333-a333-333333333301', 'Camisas Formales', 'Camisas estructuradas en popelina de algodón', true, '3a3ed9f0-94be-45a7-8699-c007a4ef9795'),
('33333333-3333-4333-a333-333333333302', 'Camisas de Seda / Lino', 'Prendas transpirables con caída relajada', true, '3a3ed9f0-94be-45a7-8699-c007a4ef9795'),
('44444444-4444-4444-a444-444444444401', 'Chaquetas y Blazers', 'Sacos estructurados de hombros limpios', true, 'afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b'),
('44444444-4444-4444-a444-444444444402', 'Tapados de Invierno', 'Abrigos envolventes en lana y alpaca', true, 'afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b');

-- 2. COLORES MULTICOLOR DE ATELIER AURA
INSERT INTO color (id, nombre) VALUES 
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a1', 'Marfil / Ivory'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a2', 'Arena / Camel'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a3', 'Café Moca'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a4', 'Verde Oliva'),
('d8e784f8-74ac-4050-abd5-6306501adc5d', 'Negro Azabache'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a5', 'Champán Satinado'),
('e21b66c7-5345-4e19-afd8-c9de594b77d3', 'Azul Denim'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a6', 'Rojo Escarlata'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a7', 'Azul Zafiro'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a8', 'Verde Esmeralda'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a9', 'Azul Índigo'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047aa', 'Gris Marengo'),
('5fab2609-5a5d-4c3f-b09f-4c46e4c047ab', 'Azul Marino')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- 3. TALLAS
INSERT INTO talla (id, nombre, orden) VALUES 
('e4ba85b0-8c5a-4246-aee4-f3bb08552620', 'XS', 0),
('e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'S', 1),
('060a4da2-147e-4428-a11c-befb8f87010e', 'M', 2),
('44f26fd1-367f-49c6-83ac-65a42e41d12b', 'L', 3),
('44f26fd1-367f-49c6-83ac-65a42e41d12c', 'XL', 4)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, orden = EXCLUDED.orden;

-- 4. CATÁLOGO DE PRODUCTOS AURA (21 PRENDAS - 100%% PRENDA SOLA)

-- CATEGORÍA 1: VESTIDOS
-- 1.1 Vestido de Gala Seda Escarlata
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b1000001-0001-4001-8001-000000000001', 'Vestido de Gala en Seda Escarlata', 'Vestido largo de gala confeccionado en satén de seda pura en vibrante color rojo escarlata. Escote drapeado y corte al bies de caída impecable, concebido para veladas inolvidables.', 320.00, true, true, '11111111-1111-4111-a111-111111111101');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b1000001-0001-4001-8001-000000000001', '/uploads/vestido_rojo_gala.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b1000001-0001-4001-8001-000000000001', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a6', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-VES-ROJ-S', 12, 0),
('b1000001-0001-4001-8001-000000000001', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a6', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-VES-ROJ-M', 15, 0),
('b1000001-0001-4001-8001-000000000001', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a6', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-VES-ROJ-L', 8, 0);

-- 1.2 Vestido de Noche en Encaje Azul Zafiro
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b1000001-0001-4001-8001-000000000002', 'Vestido de Noche en Encaje Azul Zafiro', 'Elegante vestido largo en tono azul zafiro profundo con cuerpo bordado en fino encaje floral semitransparente y falda vaporosa de caída escultural.', 350.00, true, true, '11111111-1111-4111-a111-111111111101');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b1000001-0001-4001-8001-000000000002', '/uploads/elegant_dress_1789943810626.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b1000001-0001-4001-8001-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a7', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-VES-ZAF-S', 10, 0),
('b1000001-0001-4001-8001-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a7', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-VES-ZAF-M', 18, 0);

-- 1.3 Vestido Sirena Noir de Alta Costura
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b1000001-0001-4001-8001-000000000003', 'Vestido Sirena Noir de Alta Costura', 'Corte sirena que realza la silueta femenina, confeccionado en crepé negro azabache con aplicaciones de encaje francés. Una pieza imprescindible de gala.', 290.00, true, true, '11111111-1111-4111-a111-111111111101');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b1000001-0001-4001-8001-000000000003', '/uploads/black_dress_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b1000001-0001-4001-8001-000000000003', 'd8e784f8-74ac-4050-abd5-6306501adc5d', 'e4ba85b0-8c5a-4246-aee4-f3bb08552620', 'AUR-VES-NOI-XS', 6, 0),
('b1000001-0001-4001-8001-000000000003', 'd8e784f8-74ac-4050-abd5-6306501adc5d', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-VES-NOI-S', 14, 0),
('b1000001-0001-4001-8001-000000000003', 'd8e784f8-74ac-4050-abd5-6306501adc5d', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-VES-NOI-M', 11, 0);

-- CATEGORÍA 2: POLERAS Y TOPS
-- 2.1 Polera Pima Blanca
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b2000002-0002-4002-8002-000000000001', 'Polera Cuello Redondo de Algodón Pima', 'Básico esencial de fondo de armario. Confeccionada con algodón Pima peruano de fibra larga, garantizando brillo natural, suavidad extrema y durabilidad.', 55.00, true, false, '22222222-2222-4222-a222-222222222201');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b2000002-0002-4002-8002-000000000001', '/uploads/casual_tshirt_1789943819927.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b2000002-0002-4002-8002-000000000001', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a1', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-POL-PIM-S', 25, 0),
('b2000002-0002-4002-8002-000000000001', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a1', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-POL-PIM-M', 30, 0),
('b2000002-0002-4002-8002-000000000001', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a1', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-POL-PIM-L', 20, 0);

-- 2.2 Polera Gráfica Wander
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b2000002-0002-4002-8002-000000000002', 'Polera Gráfica Minimalista Wander', 'Camiseta de corte contemporáneo en algodón peinado premium con serigrafía tipográfica editorial al frente en tinta al agua de tacto imperceptible.', 65.00, true, false, '22222222-2222-4222-a222-222222222202');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b2000002-0002-4002-8002-000000000002', '/uploads/graphic_tshirt_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b2000002-0002-4002-8002-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a1', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-POL-GRA-S', 15, 0),
('b2000002-0002-4002-8002-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a1', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-POL-GRA-M', 18, 0);

-- 2.3 Polera Boxy Algodón Café Moca
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b2000002-0002-4002-8002-000000000003', 'Polera Boxy de Algodón Café Moca', 'Corte relajado en algodón de 220 GSM en tono café moca cálido. Versatilidad cromática ideal para combinar bajo sastrería o con denim claro.', 60.00, true, false, '22222222-2222-4222-a222-222222222201');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b2000002-0002-4002-8002-000000000003', '/uploads/tshirt_moka_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b2000002-0002-4002-8002-000000000003', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a3', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-POL-MOK-M', 20, 0),
('b2000002-0002-4002-8002-000000000003', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a3', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-POL-MOK-L', 15, 0);

-- CATEGORÍA 3: FALDAS
-- 3.1 Falda Denim Clásica
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b3000003-0003-4003-8003-000000000001', 'Falda Denim Clásica Línea A', 'Falda de denim rígido en lavado medio con silueta ligeramente evasé, bolsillos clásicos y costuras contrastadas en tono tabaco.', 125.00, true, false, '67c0ec1b-94fa-4bd4-b37a-9f74f815031f');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b3000003-0003-4003-8003-000000000001', '/uploads/denim_skirt_1789943829160.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b3000003-0003-4003-8003-000000000001', 'e21b66c7-5345-4e19-afd8-c9de594b77d3', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-FAL-DEN-S', 12, 0),
('b3000003-0003-4003-8003-000000000001', 'e21b66c7-5345-4e19-afd8-c9de594b77d3', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-FAL-DEN-M', 16, 0);

-- 3.2 Falda Noir de Cuero
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b3000003-0003-4003-8003-000000000002', 'Falda Noir de Cuero Estructurada', 'Falda corta de cuero ovino suave con costuras arquitectónicas, forro sedoso y cremallera trasera vista en níquel satinado.', 195.00, true, true, '67c0ec1b-94fa-4bd4-b37a-9f74f815031f');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b3000003-0003-4003-8003-000000000002', '/uploads/leather_skirt_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b3000003-0003-4003-8003-000000000002', 'd8e784f8-74ac-4050-abd5-6306501adc5d', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-FAL-LEATH-S', 9, 0),
('b3000003-0003-4003-8003-000000000002', 'd8e784f8-74ac-4050-abd5-6306501adc5d', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-FAL-LEATH-M', 14, 0);

-- 3.3 Falda Denim Lavado Negro Charcoal
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b3000003-0003-4003-8003-000000000003', 'Falda Denim Lavado Negro Charcoal', 'Falda recta confeccionada en denim japonés tratado en negro carbón con sutiles matices minerales. Carácter rebelde y sofisticado.', 135.00, true, false, '67c0ec1b-94fa-4bd4-b37a-9f74f815031f');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b3000003-0003-4003-8003-000000000003', '/uploads/skirt_black_denim_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b3000003-0003-4003-8003-000000000003', 'd8e784f8-74ac-4050-abd5-6306501adc5d', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-FAL-BLK-M', 10, 0),
('b3000003-0003-4003-8003-000000000003', 'd8e784f8-74ac-4050-abd5-6306501adc5d', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-FAL-BLK-L', 7, 0);

-- CATEGORÍA 4: CAMISAS
-- 4.1 Camisa Seda Noir
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b4000004-0004-4004-8004-000000000001', 'Camisa de Seda Pura Noir', 'Camisa de corte sastre en satén de seda morera negra. Brillo fluido sedoso, cuello camisero impecable y botones ocultos.', 220.00, true, true, '33333333-3333-4333-a333-333333333302');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b4000004-0004-4004-8004-000000000001', '/uploads/silk_shirt_1789943838183.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b4000004-0004-4004-8004-000000000001', 'd8e784f8-74ac-4050-abd5-6306501adc5d', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-CAM-NOI-S', 10, 0),
('b4000004-0004-4004-8004-000000000001', 'd8e784f8-74ac-4050-abd5-6306501adc5d', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-CAM-NOI-M', 15, 0);

-- 4.2 Camisa Seda Verde Esmeralda
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b4000004-0004-4004-8004-000000000002', 'Camisa de Satén de Seda Verde Esmeralda', 'Pieza de joyería textil confeccionada en rica seda verde esmeralda profundo. Cuello en punta y puño abotonado clásico.', 240.00, true, true, '33333333-3333-4333-a333-333333333302');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b4000004-0004-4004-8004-000000000002', '/uploads/silk_shirt_emerald_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b4000004-0004-4004-8004-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a8', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-CAM-ESM-M', 18, 0),
('b4000004-0004-4004-8004-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a8', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-CAM-ESM-L', 12, 0);

-- 4.3 Camisa Chambray Índigo
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b4000004-0004-4004-8004-000000000003', 'Camisa Chambray Índigo Estampada', 'Camisa liviana de algodón chambray azul índigo con fino microestampado geométrico en tono tiza. Frescura y soltura artesanal.', 145.00, true, false, '33333333-3333-4333-a333-333333333301');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b4000004-0004-4004-8004-000000000003', '/uploads/indigo_shirt_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b4000004-0004-4004-8004-000000000003', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a9', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-CAM-IND-S', 14, 0),
('b4000004-0004-4004-8004-000000000003', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a9', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-CAM-IND-M', 20, 0);

-- CATEGORÍA 5: SHORTS
-- 5.1 Shorts Denim Lavado Claro
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b5000005-0005-4005-8005-000000000001', 'Shorts Denim Verano Lavado Claro', 'Shorts de tiro medio en denim 100%% algodón lavado a la piedra, con acabado deshilachado sutil y remaches en bronce envejecido.', 85.00, true, false, 'fe5e4893-0236-4533-817c-da2e1db599f6');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b5000005-0005-4005-8005-000000000001', '/uploads/summer_shorts_1789943847571.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b5000005-0005-4005-8005-000000000001', 'e21b66c7-5345-4e19-afd8-c9de594b77d3', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-SHO-LIG-S', 16, 0),
('b5000005-0005-4005-8005-000000000001', 'e21b66c7-5345-4e19-afd8-c9de594b77d3', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-SHO-LIG-M', 22, 0);

-- 5.2 Shorts Denim Índigo Profundo
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b5000005-0005-4005-8005-000000000002', 'Shorts Denim en Lavado Índigo Profundo', 'Shorts vaqueros estructurados en denim rígido índigo profundo con doble pespunte tabaco y dobladillo pulcro.', 90.00, true, false, 'fe5e4893-0236-4533-817c-da2e1db599f6');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b5000005-0005-4005-8005-000000000002', '/uploads/shorts_denim_dark_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b5000005-0005-4005-8005-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a9', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-SHO-IND-M', 18, 0);

-- 5.3 Shorts Denim Noir Deslavado
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b5000005-0005-4005-8005-000000000003', 'Shorts Denim Noir Deslavado', 'Shorts de denim teñido en negro con tratamiento enzimático para un tacto suave y acabado desgastado contemporáneo.', 95.00, true, false, 'fe5e4893-0236-4533-817c-da2e1db599f6');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b5000005-0005-4005-8005-000000000003', '/uploads/shorts_denim_black_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b5000005-0005-4005-8005-000000000003', 'd8e784f8-74ac-4050-abd5-6306501adc5d', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-SHO-NOI-S', 12, 0),
('b5000005-0005-4005-8005-000000000003', 'd8e784f8-74ac-4050-abd5-6306501adc5d', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-SHO-NOI-M', 15, 0);

-- CATEGORÍA 6: ABRIGOS
-- 6.1 Abrigo Cruzado Carbón
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b6000006-0006-4006-8006-000000000001', 'Abrigo Cruzado de Lana Merino Carbón', 'Abrigo cruzado atemporal en paño de lana merino virgen en espiga gris carbón. Solapa en pico, doble botonadura en carey y cinturón ceñidor.', 360.00, true, true, '44444444-4444-4444-a444-444444444402');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b6000006-0006-4006-8006-000000000001', '/uploads/winter_coat_1789943856236.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b6000006-0006-4006-8006-000000000001', '5fab2609-5a5d-4c3f-b09f-4c46e4c047aa', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-ABR-CAR-M', 10, 0),
('b6000006-0006-4006-8006-000000000001', '5fab2609-5a5d-4c3f-b09f-4c46e4c047aa', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-ABR-CAR-L', 8, 0);

-- 6.2 Abrigo Chocolate Moca
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b6000006-0006-4006-8006-000000000002', 'Abrigo Cruzado en Lana Chocolate Moca', 'Lana peinada pesada en cálido color chocolate moca. Silueta envolvente con forro sedoso de cupro que resguarda con elegancia sobria.', 380.00, true, true, '44444444-4444-4444-a444-444444444402');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b6000006-0006-4006-8006-000000000002', '/uploads/coat_moca_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b6000006-0006-4006-8006-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a3', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-ABR-MOC-M', 8, 0),
('b6000006-0006-4006-8006-000000000002', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a3', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-ABR-MOC-L', 6, 0);

-- 6.3 Trench Coat Atelier Azul Marino
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b6000006-0006-4006-8006-000000000003', 'Trench Coat Atelier en Lana Azul Marino', 'Trench coat estructurado en paño de lana azul marino de alta densidad. Doble botonadura, trabillas en puño y cinturón con hebilla forrada.', 395.00, true, true, '44444444-4444-4444-a444-444444444401');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b6000006-0006-4006-8006-000000000003', '/uploads/coat_navy_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b6000006-0006-4006-8006-000000000003', '5fab2609-5a5d-4c3f-b09f-4c46e4c047ab', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-ABR-NAV-L', 7, 0);

-- CATEGORÍA 7: PANTALONES
-- 7.1 Jeans Denim Azul Clásico
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b7000007-0007-4007-8007-000000000001', 'Jeans Rectos Denim Azul Clásico', 'Pantalón vaquero de cinco bolsillos, tiro alto y pierna recta atemporal confeccionado en denim japonés de 13 oz con lavado auténtico.', 140.00, true, true, '583d0937-40b2-4070-96b3-4685fdb92bc2');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b7000007-0007-4007-8007-000000000001', '/uploads/denim_jeans_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b7000007-0007-4007-8007-000000000001', 'e21b66c7-5345-4e19-afd8-c9de594b77d3', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-JEA-BLU-S', 12, 0),
('b7000007-0007-4007-8007-000000000001', 'e21b66c7-5345-4e19-afd8-c9de594b77d3', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-JEA-BLU-M', 15, 0);

-- 7.2 Jeans Denim Noir Washed
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b7000007-0007-4007-8007-000000000002', 'Jeans Rectos Denim Noir Washed', 'Denim pesado sin elasticidad teñido en negro azabache con leve lavado al agua para una textura suave y aspecto minimalista moderno.', 145.00, true, false, '583d0937-40b2-4070-96b3-4685fdb92bc2');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b7000007-0007-4007-8007-000000000002', '/uploads/jeans_black_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b7000007-0007-4007-8007-000000000002', 'd8e784f8-74ac-4050-abd5-6306501adc5d', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'AUR-JEA-NOI-S', 14, 0),
('b7000007-0007-4007-8007-000000000002', 'd8e784f8-74ac-4050-abd5-6306501adc5d', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-JEA-NOI-M', 18, 0);

-- 7.3 Jeans Denim Índigo Raw
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('b7000007-0007-4007-8007-000000000003', 'Jeans Rectos Denim Índigo Raw', 'Pantalón vaquero en mezclilla rígida azul índigo oscuro sin desteñir. Silueta limpia ideal para emparejar con prendas de sastrería.', 150.00, true, false, '583d0937-40b2-4070-96b3-4685fdb92bc2');
INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('b7000007-0007-4007-8007-000000000003', '/uploads/jeans_indigo_packshot.jpg', true, 1);
INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('b7000007-0007-4007-8007-000000000003', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a9', '060a4da2-147e-4428-a11c-befb8f87010e', 'AUR-JEA-IND-M', 12, 0),
('b7000007-0007-4007-8007-000000000003', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a9', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'AUR-JEA-IND-L', 10, 0);

COMMIT;

-- Asegurar usuario administrador y cliente de prueba para reseñas
INSERT INTO usuario (id, rol_id, nombre, apellido, correo, contrasena, email_verificado, activo)
VALUES 
(
  uuid_generate_v4(),
  (SELECT id FROM rol WHERE nombre = 'ADMIN' LIMIT 1),
  'Admin',
  'AURA',
  'admin@aura-atelier.com',
  crypt('Admin123!', gen_salt('bf')),
  true,
  true
),
(
  uuid_generate_v4(),
  (SELECT id FROM rol WHERE nombre = 'ADMIN' LIMIT 1),
  'Admin',
  'General',
  'admin@elmagnifico.com',
  crypt('Admin123!', gen_salt('bf')),
  true,
  true
)
ON CONFLICT (correo) DO NOTHING;

-- Reseñas de 5 estrellas para productos clave
INSERT INTO resena (usuario_id, producto_id, calificacion, comentario, aprobada)
SELECT 
  u.id, 
  'b1000001-0001-4001-8001-000000000001', 
  5, 
  'El satén de seda en rojo escarlata es una joya. La caída drapeada y la confección son de un nivel digno de alta costura.',
  true
FROM usuario u WHERE u.correo = 'admin@aura-atelier.com'
ON CONFLICT DO NOTHING;

INSERT INTO resena (usuario_id, producto_id, calificacion, comentario, aprobada)
SELECT 
  u.id, 
  'b6000006-0006-4006-8006-000000000001', 
  5, 
  'El abrigo tiene una estructura y proporción extraordinarias. La lana espiga es cálida, pesada y de presencia imponente.',
  true
FROM usuario u WHERE u.correo = 'admin@aura-atelier.com'
ON CONFLICT DO NOTHING;
