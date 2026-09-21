SET client_encoding = 'UTF8';

BEGIN;

TRUNCATE TABLE categoria CASCADE;
TRUNCATE TABLE color CASCADE;
TRUNCATE TABLE talla CASCADE;
TRUNCATE TABLE producto CASCADE;

INSERT INTO categoria (id, nombre, descripcion, activa) VALUES
('264efe79-ded7-4cfa-a0b0-110b822944c5', 'Vestidos', 'Vestidos para toda ocasión', true),
('5977fad7-63be-49cd-bee5-1d572e849cdd', 'Poleras', 'Poleras casuales', true),
('67c0ec1b-94fa-4bd4-b37a-9f74f815031f', 'Faldas', 'Faldas modernas', true),
('3a3ed9f0-94be-45a7-8699-c007a4ef9795', 'Camisas', 'Camisas formales', true),
('fe5e4893-0236-4533-817c-da2e1db599f6', 'Shorts', 'Shorts de verano', true),
('afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b', 'Abrigos', 'Abrigos de invierno', true);

INSERT INTO color (id, nombre) VALUES 
('5fab2609-5a5d-4c3f-b09f-4c46e4c047a6', 'Azul Noche'),
('4f7e58d8-cbad-461b-b00c-ef83634535e4', 'Gris Jaspeado'),
('e21b66c7-5345-4e19-afd8-c9de594b77d3', 'Azul Denim'),
('d8e784f8-74ac-4050-abd5-6306501adc5d', 'Negro'),
('3f1e8fae-d806-4c5c-a248-f3d4d2b3aa26', 'Gris Oscuro');

INSERT INTO talla (id, nombre) VALUES 
('e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'S'),
('060a4da2-147e-4428-a11c-befb8f87010e', 'M'),
('44f26fd1-367f-49c6-83ac-65a42e41d12b', 'L');

-- 1. VESTIDO
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('eafb6edc-ad0c-4e68-8085-f3a478e8a806', 'Vestido de Noche Elegante', 'Vestido largo con detalles de encaje y pedrería. Ideal para eventos formales y galas. Diseño sin costuras y caída perfecta.', 250.00, true, true, '264efe79-ded7-4cfa-a0b0-110b822944c5');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('eafb6edc-ad0c-4e68-8085-f3a478e8a806', '/uploads/elegant_dress_1789943810626.jpg', true, 1);

INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('eafb6edc-ad0c-4e68-8085-f3a478e8a806', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a6', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'VES-ELEG-S', 10, 0),
('eafb6edc-ad0c-4e68-8085-f3a478e8a806', '5fab2609-5a5d-4c3f-b09f-4c46e4c047a6', '060a4da2-147e-4428-a11c-befb8f87010e', 'VES-ELEG-M', 15, 0);

-- 2. POLERA
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('c3cc1efa-4388-4e78-b35b-7a04035d22e3', 'Polera Básica de Algodón', 'Polera casual con cuello redondo, 100% algodón orgánico peinado. Ultra suave y fresca.', 25.00, true, false, '5977fad7-63be-49cd-bee5-1d572e849cdd');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('c3cc1efa-4388-4e78-b35b-7a04035d22e3', '/uploads/casual_tshirt_1789943819927.jpg', true, 1);

INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('c3cc1efa-4388-4e78-b35b-7a04035d22e3', '4f7e58d8-cbad-461b-b00c-ef83634535e4', '060a4da2-147e-4428-a11c-befb8f87010e', 'POL-BAS-M', 50, 0);

-- 3. FALDA
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('e23eb288-b2f4-440c-accb-436cc07face1', 'Falda de Denim Clásica', 'Falda de jean con corte clásico A, tiro alto, lavado medio. Perfecta para un look casual de fin de semana.', 45.00, true, false, '67c0ec1b-94fa-4bd4-b37a-9f74f815031f');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('e23eb288-b2f4-440c-accb-436cc07face1', '/uploads/denim_skirt_1789943829160.jpg', true, 1);

INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('e23eb288-b2f4-440c-accb-436cc07face1', 'e21b66c7-5345-4e19-afd8-c9de594b77d3', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'FAL-DEN-S', 12, 0);

-- 4. CAMISA
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('8f8b5703-c607-4bbb-bf1f-1a2d3289fc51', 'Camisa de Seda Premium', 'Camisa de botones formal, elaborada 100% en seda de morera. Acabado satinado, ideal para oficina.', 120.00, true, true, '3a3ed9f0-94be-45a7-8699-c007a4ef9795');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('8f8b5703-c607-4bbb-bf1f-1a2d3289fc51', '/uploads/silk_shirt_1789943838183.jpg', true, 1);

INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('8f8b5703-c607-4bbb-bf1f-1a2d3289fc51', 'd8e784f8-74ac-4050-abd5-6306501adc5d', '060a4da2-147e-4428-a11c-befb8f87010e', 'CAM-SED-M', 8, 0);

-- 5. SHORTS
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('2a7e8cd5-bcc2-4701-b377-53378717ade0', 'Shorts de Verano', 'Shorts de jean ligeros con dobladillo desgastado. Tiro medio y ajuste cómodo.', 35.00, true, false, 'fe5e4893-0236-4533-817c-da2e1db599f6');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('2a7e8cd5-bcc2-4701-b377-53378717ade0', '/uploads/summer_shorts_1789943847571.jpg', true, 1);

INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('2a7e8cd5-bcc2-4701-b377-53378717ade0', 'e21b66c7-5345-4e19-afd8-c9de594b77d3', 'e4ba85b0-8c5a-4246-aee4-f3bb08552621', 'SHO-VER-S', 20, 0);

-- 6. ABRIGO
INSERT INTO producto (id, nombre, descripcion, precio, activo, destacado, categoria_id) VALUES
('7e829857-321d-4d06-9ae5-2d2644e7613e', 'Abrigo de Lana Cruzado', 'Elegante abrigo de lana de doble botonadura con cinturón ajustable. Perfecto para climas fríos.', 190.00, true, true, 'afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b');

INSERT INTO imagen_producto (producto_id, url, principal, orden) VALUES
('7e829857-321d-4d06-9ae5-2d2644e7613e', '/uploads/winter_coat_1789943856236.jpg', true, 1);

INSERT INTO producto_variante (producto_id, color_id, talla_id, sku, stock, precio_extra) VALUES
('7e829857-321d-4d06-9ae5-2d2644e7613e', '3f1e8fae-d806-4c5c-a248-f3d4d2b3aa26', '44f26fd1-367f-49c6-83ac-65a42e41d12b', 'ABR-LAN-L', 5, 0);

COMMIT;

-- Insertar administrador genérico si no existe
INSERT INTO usuario (id, rol_id, nombre, apellido, correo, contrasena, email_verificado, activo)
VALUES (
  uuid_generate_v4(),
  (SELECT id FROM rol WHERE nombre = 'ADMIN' LIMIT 1),
  'Admin',
  'General',
  'admin@elmagnifico.com',
  crypt('Admin123!', gen_salt('bf')),
  true,
  true
) ON CONFLICT (correo) DO NOTHING;
