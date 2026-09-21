-- =====================================================================
-- SEED DE DATOS: VENTAS, PEDIDOS Y MÉTRICAS PARA PANEL ADMINISTRATIVO
-- Archivo: database/02_seed_admin_ventas.sql
-- Motor: PostgreSQL 15+
-- =====================================================================

DO $$
DECLARE
  v_admin_id UUID;
  v_cliente_id UUID;
  v_prod1 RECORD;
  v_prod2 RECORD;
  v_prod3 RECORD;
  v_orden1_id UUID;
  v_orden2_id UUID;
  v_orden3_id UUID;
  v_orden4_id UUID;
  v_orden5_id UUID;
  v_orden6_id UUID;
  v_orden7_id UUID;
  v_metodo_pago_id UUID;
BEGIN
  -- 1. Asegurar roles
  INSERT INTO rol (nombre, descripcion)
  VALUES 
    ('ADMIN', 'Administrador del sistema con acceso total'),
    ('CLIENTE', 'Cliente registrado en la tienda'),
    ('EMPLEADO', 'Personal de ventas e inventario')
  ON CONFLICT (nombre) DO NOTHING;

  -- 2. Asegurar método de pago
  INSERT INTO metodo_pago (nombre, activo)
  VALUES 
    ('QR Simple / Transferencia', true),
    ('Tarjeta de Débito/Crédito', true),
    ('Efectivo contra entrega', true)
  ON CONFLICT (nombre) DO NOTHING;

  SELECT id INTO v_metodo_pago_id FROM metodo_pago LIMIT 1;

  -- 3. Obtener o asegurar usuario cliente
  SELECT id INTO v_cliente_id 
  FROM usuario 
  WHERE rol_id = (SELECT id FROM rol WHERE UPPER(nombre) = 'CLIENTE' LIMIT 1)
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    INSERT INTO usuario (nombre, apellido, correo, contrasena, rol_id, email_verificado, activo)
    VALUES (
      'Juan Carlos',
      'Pérez',
      'cliente.demo@elmagnifico.com',
      '$2a$10$wE47xK7pG2qDq0e/wZg9jOHGvD0BqPfxoG57aA8p4n3VvXyZ.L6S2',
      (SELECT id FROM rol WHERE UPPER(nombre) = 'CLIENTE' LIMIT 1),
      true,
      true
    )
    RETURNING id INTO v_cliente_id;
  END IF;

  -- 4. Obtener productos existentes
  SELECT id, nombre, precio INTO v_prod1 FROM producto OFFSET 0 LIMIT 1;
  SELECT id, nombre, precio INTO v_prod2 FROM producto OFFSET 1 LIMIT 1;
  SELECT id, nombre, precio INTO v_prod3 FROM producto OFFSET 2 LIMIT 1;

  IF v_prod1.id IS NULL THEN
    RAISE NOTICE 'No se encontraron productos en la base de datos. Ejecute primero el seed de catálogo.';
    RETURN;
  END IF;

  -- 5. Limpiar datos de prueba de órdenes anteriores para no duplicar infinitamente
  DELETE FROM detalle_nota_venta;
  DELETE FROM pago;
  DELETE FROM nota_venta;

  -- ===================================================================
  -- INSERCIÓN DE ÓRDENES DISTRIBUIDAS HISTÓRICAMENTE
  -- ===================================================================

  -- ORDEN 1: HOY (Venta reciente)
  INSERT INTO nota_venta (nro, usuario_id, fecha, subtotal, descuento, costo_envio, total, estado)
  VALUES ('PED-2026-001', v_cliente_id, NOW() - INTERVAL '2 hours', 350.00, 0.00, 20.00, 370.00, 'PAGADO')
  RETURNING id INTO v_orden1_id;

  INSERT INTO detalle_nota_venta (notaventa_id, producto_id, cantidad, precio, descuento, subtotal, nombre_producto, talla, color)
  VALUES (v_orden1_id, v_prod1.id, 2, v_prod1.precio, 0, v_prod1.precio * 2, v_prod1.nombre, 'M', 'Negro');

  INSERT INTO pago (notaventa_id, metodo_pago_id, monto, estado, id_transaccion, fecha_pago)
  VALUES (v_orden1_id, v_metodo_pago_id, 370.00, 'APROBADO', 'TRX-QR-849201', NOW() - INTERVAL '2 hours');

  -- ORDEN 2: HOY (Venta completada)
  INSERT INTO nota_venta (nro, usuario_id, fecha, subtotal, descuento, costo_envio, total, estado)
  VALUES ('PED-2026-002', v_cliente_id, NOW() - INTERVAL '5 hours', 480.00, 30.00, 0.00, 450.00, 'COMPLETADO')
  RETURNING id INTO v_orden2_id;

  INSERT INTO detalle_nota_venta (notaventa_id, producto_id, cantidad, precio, descuento, subtotal, nombre_producto, talla, color)
  VALUES (v_orden2_id, v_prod2.id, 3, v_prod2.precio, 0, v_prod2.precio * 3, v_prod2.nombre, 'L', 'Blanco');

  -- ORDEN 3: HACE 3 DÍAS (Entregada)
  INSERT INTO nota_venta (nro, usuario_id, fecha, subtotal, descuento, costo_envio, total, estado)
  VALUES ('PED-2026-003', v_cliente_id, NOW() - INTERVAL '3 days', 620.00, 50.00, 20.00, 590.00, 'ENTREGADO')
  RETURNING id INTO v_orden3_id;

  INSERT INTO detalle_nota_venta (notaventa_id, producto_id, cantidad, precio, descuento, subtotal, nombre_producto, talla, color)
  VALUES 
    (v_orden3_id, v_prod1.id, 2, v_prod1.precio, 0, v_prod1.precio * 2, v_prod1.nombre, 'S', 'Azul'),
    (v_orden3_id, v_prod3.id, 1, v_prod3.precio, 0, v_prod3.precio, v_prod3.nombre, 'M', 'Rojo');

  -- ORDEN 4: HACE 7 DÍAS (Enviada)
  INSERT INTO nota_venta (nro, usuario_id, fecha, subtotal, descuento, costo_envio, total, estado)
  VALUES ('PED-2026-004', v_cliente_id, NOW() - INTERVAL '7 days', 290.00, 0.00, 15.00, 305.00, 'ENVIADO')
  RETURNING id INTO v_orden4_id;

  INSERT INTO detalle_nota_venta (notaventa_id, producto_id, cantidad, precio, descuento, subtotal, nombre_producto, talla, color)
  VALUES (v_orden4_id, v_prod2.id, 2, v_prod2.precio, 0, v_prod2.precio * 2, v_prod2.nombre, 'M', 'Gris');

  -- ORDEN 5: HACE 15 DÍAS (Entregada con descuento)
  INSERT INTO nota_venta (nro, usuario_id, fecha, subtotal, descuento, costo_envio, total, estado)
  VALUES ('PED-2026-005', v_cliente_id, NOW() - INTERVAL '15 days', 850.00, 100.00, 0.00, 750.00, 'ENTREGADO')
  RETURNING id INTO v_orden5_id;

  INSERT INTO detalle_nota_venta (notaventa_id, producto_id, cantidad, precio, descuento, subtotal, nombre_producto, talla, color)
  VALUES 
    (v_orden5_id, v_prod1.id, 4, v_prod1.precio, 0, v_prod1.precio * 4, v_prod1.nombre, 'L', 'Negro'),
    (v_orden5_id, v_prod2.id, 2, v_prod2.precio, 0, v_prod2.precio * 2, v_prod2.nombre, 'M', 'Blanco');

  -- ORDEN 6: MES PASADO (Hace 35 días)
  INSERT INTO nota_venta (nro, usuario_id, fecha, subtotal, descuento, costo_envio, total, estado)
  VALUES ('PED-2026-006', v_cliente_id, NOW() - INTERVAL '35 days', 520.00, 0.00, 20.00, 540.00, 'COMPLETADO')
  RETURNING id INTO v_orden6_id;

  INSERT INTO detalle_nota_venta (notaventa_id, producto_id, cantidad, precio, descuento, subtotal, nombre_producto, talla, color)
  VALUES (v_orden6_id, v_prod3.id, 3, v_prod3.precio, 0, v_prod3.precio * 3, v_prod3.nombre, 'S', 'Azul');

  -- ORDEN 7: HACE 2 MESES (Hace 65 días)
  INSERT INTO nota_venta (nro, usuario_id, fecha, subtotal, descuento, costo_envio, total, estado)
  VALUES ('PED-2026-007', v_cliente_id, NOW() - INTERVAL '65 days', 410.00, 0.00, 15.00, 425.00, 'ENTREGADO')
  RETURNING id INTO v_orden7_id;

  INSERT INTO detalle_nota_venta (notaventa_id, producto_id, cantidad, precio, descuento, subtotal, nombre_producto, talla, color)
  VALUES (v_orden7_id, v_prod1.id, 3, v_prod1.precio, 0, v_prod1.precio * 3, v_prod1.nombre, 'XL', 'Negro');

  -- 6. Configurar al menos una variante con stock crítico para alertas de inventario (HU-91)
  UPDATE producto_variante 
  SET stock = 2, stock_minimo = 5 
  WHERE id = (SELECT id FROM producto_variante LIMIT 1);

  RAISE NOTICE '✅ Seed de ventas y pedidos completado con éxito.';
END $$;
