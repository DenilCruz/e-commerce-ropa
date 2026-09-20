BEGIN;

INSERT INTO categoria (id, nombre, descripcion, activa) VALUES
('c0000000-0000-0000-0000-000000000001', 'Vestidos', 'Vestidos para toda ocasión', true),
('c0000000-0000-0000-0000-000000000002', 'Poleras', 'Poleras casuales', true),
('c0000000-0000-0000-0000-000000000003', 'Faldas', 'Faldas modernas', true),
('c0000000-0000-0000-0000-000000000004', 'Camisas', 'Camisas formales', true),
('c0000000-0000-0000-0000-000000000005', 'Shorts', 'Shorts de verano', true),
('c0000000-0000-0000-0000-000000000006', 'Abrigos', 'Abrigos de invierno', true);

INSERT INTO color (id, nombre) VALUES 
('10000000-0000-0000-0000-000000000001', 'Azul Noche'),
('10000000-0000-0000-0000-000000000002', 'Gris Jaspeado'),
('10000000-0000-0000-0000-000000000003', 'Azul Denim'),
('10000000-0000-0000-0000-000000000004', 'Negro'),
('10000000-0000-0000-0000-000000000005', 'Gris Oscuro')
ON CONFLICT DO NOTHING;

INSERT INTO talla (id, nombre) VALUES 
('20000000-0000-0000-0000-000000000001', 'S'),
('20000000-0000-0000-0000-000000000002', 'M'),
('20000000-0000-0000-0000-000000000003', 'L')
ON CONFLICT DO NOTHING;

-- 1. VESTIDO
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('30000000-0000-0000-0000-000000000001', 'Vestido de Noche Elegante', 'Vestido largo con detalles de encaje y pedrería. Ideal para eventos formales y galas. Diseño sin costuras y caída perfecta.', 250.00, true, true, 'c0000000-0000-0000-0000-000000000001');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('30000000-0000-0000-0000-000000000001', '/elegant_dress_1789943810626.jpg', true, 1);

INSERT INTO producto_variante (id, producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'VES-ELEG-S', 10, 0),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'VES-ELEG-M', 15, 0);

-- 2. POLERA
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('30000000-0000-0000-0000-000000000002', 'Polera Básica de Algodón', 'Polera casual con cuello redondo, 100% algodón orgánico peinado. Ultra suave y fresca.', 25.00, true, false, 'c0000000-0000-0000-0000-000000000002');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('30000000-0000-0000-0000-000000000002', '/casual_tshirt_1789943819927.jpg', true, 1);

INSERT INTO producto_variante (id, producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'POL-BAS-M', 50, 0);

-- 3. FALDA
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('30000000-0000-0000-0000-000000000003', 'Falda de Denim Clásica', 'Falda de jean con corte clásico A, tiro alto, lavado medio. Perfecta para un look casual de fin de semana.', 45.00, true, false, 'c0000000-0000-0000-0000-000000000003');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('30000000-0000-0000-0000-000000000003', '/denim_skirt_1789943829160.jpg', true, 1);

INSERT INTO producto_variante (id, producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'FAL-DEN-S', 12, 0);

-- 4. CAMISA
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('30000000-0000-0000-0000-000000000004', 'Camisa de Seda Premium', 'Camisa de botones formal, elaborada 100% en seda de morera. Acabado satinado, ideal para oficina.', 120.00, true, true, 'c0000000-0000-0000-0000-000000000004');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('30000000-0000-0000-0000-000000000004', '/silk_shirt_1789943838183.jpg', true, 1);

INSERT INTO producto_variante (id, producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'CAM-SED-M', 8, 0);

-- 5. SHORTS
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('30000000-0000-0000-0000-000000000005', 'Shorts de Verano', 'Shorts de jean ligeros con dobladillo desgastado. Tiro medio y ajuste cómodo.', 35.00, true, false, 'c0000000-0000-0000-0000-000000000005');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('30000000-0000-0000-0000-000000000005', '/summer_shorts_1789943847571.jpg', true, 1);

INSERT INTO producto_variante (id, producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'SHO-VER-S', 20, 0);

-- 6. ABRIGO
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('30000000-0000-0000-0000-000000000006', 'Abrigo de Lana Cruzado', 'Elegante abrigo de lana de doble botonadura con cinturón ajustable. Perfecto para climas fríos.', 190.00, true, true, 'c0000000-0000-0000-0000-000000000006');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('30000000-0000-0000-0000-000000000006', '/winter_coat_1789943856236.jpg', true, 1);

INSERT INTO producto_variante (id, producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'ABR-LAN-L', 5, 0);

COMMIT;
