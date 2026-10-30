-- =====================================================================
-- SCRIPT DE GENERACIÓN DE DATOS SINTÉTICOS CON VOLUMEN
-- Archivo: database/03_seed_synthetic_aura_sales.sql
-- Motor: PostgreSQL 15+
-- Objetivo: Generar 200 órdenes históricas (últimos 12 meses)
-- Exclusivo para la Tienda Demo de AURA (tenant_id = 'a0a0a0a0-0000-4000-8000-000000000001')
-- =====================================================================

DO $$
DECLARE
  v_tenant_id CONSTANT UUID := 'a0a0a0a0-0000-4000-8000-000000000001';
  v_rol_cliente_id UUID;

  -- Métodos de pago
  v_mp_qr UUID;
  v_mp_tarjeta UUID;
  v_mp_efectivo UUID;

  -- Cupones
  v_cupon_aura10 UUID;
  v_cupon_bienvenida UUID;
  v_cupon_vip UUID;

  -- Arreglos para generación sintética
  v_nombres TEXT[] := ARRAY[
    'Camila', 'Mateo', 'Valeria', 'Santiago', 'Luciana',
    'Sebastián', 'Mariana', 'Alejandro', 'Daniela', 'Nicolás',
    'Andrea', 'Joaquín', 'Natalia', 'Leonardo', 'Gabriela',
    'Diego', 'Paola', 'Fernando', 'Carolina', 'Andrés'
  ];

  v_apellidos TEXT[] := ARRAY[
    'Ríos', 'Morales', 'Flores', 'Vargas', 'Mendoza',
    'Suárez', 'Paz', 'Gutiérrez', 'Rojas', 'Mamani',
    'Castillo', 'Torrez', 'Benítez', 'Valenzuela', 'Salazar',
    'Paredes', 'Medina', 'Chávez', 'Aramayo', 'Quiroga'
  ];

  v_tallas TEXT[] := ARRAY['XS', 'S', 'M', 'L', 'XL'];
  v_colores TEXT[] := ARRAY['Negro Noir', 'Marfil / Ivory', 'Azul Zafiro', 'Rojo Carmesí', 'Esmeralda', 'Champagne'];

  v_clientes_ids UUID[] := ARRAY[]::UUID[];
  v_usuarios_ids UUID[] := ARRAY[]::UUID[];

  v_prod_ids UUID[];
  v_prod_nombres TEXT[];
  v_prod_precios NUMERIC[];
  v_total_prods INT;

  -- Variables de iteración
  v_user_id UUID;
  v_cliente_id UUID;
  v_correo TEXT;
  v_nombre TEXT;
  v_apellido TEXT;
  v_pwd_hash TEXT := '$2a$10$wE47xK7pG2qDq0e/wZg9jOHGvD0BqPfxoG57aA8p4n3VvXyZ.L6S2'; -- hash bcrypt genérico 'password123'

  v_orden_id UUID;
  v_nro_orden TEXT;
  v_fecha TIMESTAMP;
  v_dias_atras NUMERIC;
  v_segundos_dia INT;

  v_items_count INT;
  v_idx_prod INT;
  v_prod_id UUID;
  v_prod_nombre TEXT;
  v_prod_precio NUMERIC;
  v_cant INT;
  v_item_subtotal NUMERIC;

  v_subtotal NUMERIC;
  v_descuento NUMERIC;
  v_envio NUMERIC;
  v_total NUMERIC;
  v_estado TEXT;
  v_cupon_id UUID;

  v_metodo_pago UUID;
  v_estado_pago TEXT;
  v_trx_id TEXT;
  v_rand FLOAT;
BEGIN
  RAISE NOTICE '🚀 Iniciando generación de 200 ventas sintéticas para la tienda AURA...';

  -- 1. Obtener Rol de Cliente
  SELECT id INTO v_rol_cliente_id FROM rol WHERE UPPER(nombre) = 'CLIENTE' LIMIT 1;
  IF v_rol_cliente_id IS NULL THEN
    INSERT INTO rol (nombre, descripcion) VALUES ('CLIENTE', 'Cliente regular de la tienda')
    RETURNING id INTO v_rol_cliente_id;
  END IF;

  -- 2. Obtener Métodos de Pago
  SELECT id INTO v_mp_qr FROM metodo_pago WHERE nombre ILIKE '%QR%' LIMIT 1;
  SELECT id INTO v_mp_tarjeta FROM metodo_pago WHERE nombre ILIKE '%Tarjeta%' LIMIT 1;
  SELECT id INTO v_mp_efectivo FROM metodo_pago WHERE nombre ILIKE '%Efectivo%' LIMIT 1;

  IF v_mp_qr IS NULL THEN
    SELECT id INTO v_mp_qr FROM metodo_pago LIMIT 1;
  END IF;
  IF v_mp_tarjeta IS NULL THEN v_mp_tarjeta := v_mp_qr; END IF;
  IF v_mp_efectivo IS NULL THEN v_mp_efectivo := v_mp_qr; END IF;

  -- 3. Obtener Cupones de la tienda AURA
  SELECT id INTO v_cupon_aura10 FROM cupon WHERE codigo = 'AURA10' AND tenant_id = v_tenant_id LIMIT 1;
  SELECT id INTO v_cupon_bienvenida FROM cupon WHERE codigo = 'BIENVENIDA20' AND tenant_id = v_tenant_id LIMIT 1;
  SELECT id INTO v_cupon_vip FROM cupon WHERE codigo = 'VIPATELIER' AND tenant_id = v_tenant_id LIMIT 1;

  -- 4. Crear 20 Clientes Sintéticos si no existen
  FOR i IN 1..20 LOOP
    v_nombre := v_nombres[i];
    v_apellido := v_apellidos[i];
    v_correo := LOWER(v_nombre) || '.' || LOWER(v_apellido) || '@aura-vip.com';

    -- Buscar usuario por correo
    SELECT id INTO v_user_id FROM usuario WHERE correo = v_correo;
    IF v_user_id IS NULL THEN
      INSERT INTO usuario (nombre, apellido, correo, contrasena, rol_id, email_verificado, activo, creado_en)
      VALUES (v_nombre, v_apellido, v_correo, v_pwd_hash, v_rol_cliente_id, true, true, NOW() - INTERVAL '380 days')
      RETURNING id INTO v_user_id;
    END IF;

    -- Asociar a tabla cliente
    SELECT id INTO v_cliente_id FROM cliente WHERE usuario_id = v_user_id AND tenant_id = v_tenant_id;
    IF v_cliente_id IS NULL THEN
      INSERT INTO cliente (usuario_id, tenant_id, creado_en)
      VALUES (v_user_id, v_tenant_id, NOW() - INTERVAL '380 days')
      RETURNING id INTO v_cliente_id;
    END IF;

    v_usuarios_ids := array_append(v_usuarios_ids, v_user_id);
    v_clientes_ids := array_append(v_clientes_ids, v_cliente_id);
  END LOOP;

  -- 5. Cargar catálogo de productos de AURA en memoria
  SELECT 
    array_agg(id),
    array_agg(nombre),
    array_agg(precio)
  INTO 
    v_prod_ids,
    v_prod_nombres,
    v_prod_precios
  FROM producto 
  WHERE tenant_id = v_tenant_id;

  v_total_prods := array_length(v_prod_ids, 1);
  IF v_total_prods IS NULL OR v_total_prods = 0 THEN
    RAISE EXCEPTION '❌ No hay productos en la tienda AURA. Verifique el catálogo antes de sembrar ventas.';
  END IF;

  RAISE NOTICE '📦 Catálogo cargado con % productos. Generando órdenes...', v_total_prods;

  -- 6. Generar 200 Notas de Venta con distribución temporal realista
  FOR i IN 1..200 LOOP
    -- Distribución de fecha: entre 365 días atrás y hoy
    -- Usamos (i * 1.8) + variación aleatoria para garantizar distribución a lo largo de todo el año
    v_dias_atras := (365.0 - (i * 1.78)) + (random() * 5.0 - 2.5);
    IF v_dias_atras < 0.05 THEN v_dias_atras := 0.05 + (random() * 0.2); END IF;
    IF v_dias_atras > 365.0 THEN v_dias_atras := 365.0; END IF;

    -- Hora aleatoria del día (pico entre 10:00 y 22:00)
    v_segundos_dia := (36000 + floor(random() * 43200))::INT;
    v_fecha := (NOW() - (v_dias_atras || ' days')::INTERVAL) + (v_segundos_dia || ' seconds')::INTERVAL;

    -- Seleccionar cliente aleatorio de los 20 sintéticos
    v_idx_prod := 1 + floor(random() * array_length(v_clientes_ids, 1))::INT;
    v_user_id := v_usuarios_ids[v_idx_prod];
    v_cliente_id := v_clientes_ids[v_idx_prod];

    -- Número de orden correlativo único
    v_nro_orden := 'PED-SYN-' || TO_CHAR(v_fecha, 'YYYYMM') || '-' || LPAD(i::TEXT, 4, '0');

    -- Estado de la orden realista
    v_rand := random();
    IF v_dias_atras > 30 THEN
      -- Órdenes antiguas: mayormente entregadas o completadas
      IF v_rand < 0.70 THEN v_estado := 'ENTREGADO';
      ELSIF v_rand < 0.90 THEN v_estado := 'COMPLETADO';
      ELSE v_estado := 'CANCELADO';
      END IF;
    ELSIF v_dias_atras > 7 THEN
      IF v_rand < 0.60 THEN v_estado := 'ENTREGADO';
      ELSIF v_rand < 0.80 THEN v_estado := 'ENVIADO';
      ELSIF v_rand < 0.95 THEN v_estado := 'PAGADO';
      ELSE v_estado := 'CANCELADO';
      END IF;
    ELSE
      -- Órdenes recientes (últimos 7 días)
      IF v_rand < 0.40 THEN v_estado := 'PAGADO';
      ELSIF v_rand < 0.70 THEN v_estado := 'ENVIADO';
      ELSIF v_rand < 0.90 THEN v_estado := 'PREPARANDO';
      ELSE v_estado := 'PENDIENTE';
      END IF;
    END IF;

    -- Aplicar cupón ocasional (15% de probabilidad)
    v_cupon_id := NULL;
    v_descuento := 0.00;
    IF random() < 0.15 THEN
      IF random() < 0.50 AND v_cupon_aura10 IS NOT NULL THEN
        v_cupon_id := v_cupon_aura10;
      ELSIF random() < 0.80 AND v_cupon_bienvenida IS NOT NULL THEN
        v_cupon_id := v_cupon_bienvenida;
      ELSIF v_cupon_vip IS NOT NULL THEN
        v_cupon_id := v_cupon_vip;
      END IF;
    END IF;

    -- Costo de envío (gratis o 15/20 Bs)
    IF random() < 0.40 THEN
      v_envio := 0.00;
    ELSIF random() < 0.75 THEN
      v_envio := 15.00;
    ELSE
      v_envio := 25.00;
    END IF;

    -- Cantidad de ítems en la orden (1 a 4 productos distintos)
    v_items_count := 1 + floor(random() * 3)::INT;
    v_subtotal := 0.00;

    -- Insertar nota de venta preliminar
    INSERT INTO nota_venta (
      nro, usuario_id, cliente_id, tenant_id, cupon_id,
      fecha, subtotal, descuento, costo_envio, total,
      estado, creado_en, actualizado_en
    ) VALUES (
      v_nro_orden, v_user_id, v_cliente_id, v_tenant_id, v_cupon_id,
      v_fecha, 0, 0, v_envio, 0,
      v_estado, v_fecha, v_fecha
    ) RETURNING id INTO v_orden_id;

    -- Insertar detalles de ítems
    FOR j IN 1..v_items_count LOOP
      v_idx_prod := 1 + floor(random() * v_total_prods)::INT;
      v_prod_id := v_prod_ids[v_idx_prod];
      v_prod_nombre := v_prod_nombres[v_idx_prod];
      v_prod_precio := v_prod_precios[v_idx_prod];
      v_cant := 1 + floor(random() * 2)::INT; -- 1 o 2 unidades

      v_item_subtotal := v_prod_precio * v_cant;
      v_subtotal := v_subtotal + v_item_subtotal;

      INSERT INTO detalle_nota_venta (
        notaventa_id, producto_id, cantidad, precio, descuento,
        subtotal, nombre_producto, talla, color, tenant_id
      ) VALUES (
        v_orden_id, v_prod_id, v_cant, v_prod_precio, 0.00,
        v_item_subtotal, v_prod_nombre,
        v_tallas[1 + floor(random() * array_length(v_tallas, 1))::INT],
        v_colores[1 + floor(random() * array_length(v_colores, 1))::INT],
        v_tenant_id
      );
    END LOOP;

    -- Calcular descuentos
    IF v_cupon_id = v_cupon_aura10 THEN
      v_descuento := ROUND((v_subtotal * 0.10), 2);
    ELSIF v_cupon_id = v_cupon_bienvenida THEN
      v_descuento := LEAST(20.00, v_subtotal);
    ELSIF v_cupon_id = v_cupon_vip THEN
      v_descuento := ROUND((v_subtotal * 0.15), 2);
    END IF;

    v_total := GREATEST(0.00, v_subtotal - v_descuento + v_envio);

    -- Actualizar totales en nota_venta
    UPDATE nota_venta 
    SET subtotal = v_subtotal, descuento = v_descuento, total = v_total
    WHERE id = v_orden_id;

    -- Registrar Pago correspondiente
    v_rand := random();
    IF v_rand < 0.50 THEN
      v_metodo_pago := v_mp_qr;
      v_trx_id := 'TRX-QR-' || LPAD((floor(random() * 899999) + 100000)::TEXT, 6, '0');
    ELSIF v_rand < 0.85 THEN
      v_metodo_pago := v_mp_tarjeta;
      v_trx_id := 'ch_stripe_synth_' || SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 14);
    ELSE
      v_metodo_pago := v_mp_efectivo;
      v_trx_id := 'TRX-EFE-' || LPAD((floor(random() * 899999) + 100000)::TEXT, 6, '0');
    END IF;

    IF v_estado IN ('PAGADO', 'ENVIADO', 'ENTREGADO', 'COMPLETADO') THEN
      v_estado_pago := 'APROBADO';
    ELSIF v_estado = 'CANCELADO' THEN
      v_estado_pago := 'FALLIDO';
    ELSE
      v_estado_pago := 'PENDIENTE';
    END IF;

    INSERT INTO pago (
      notaventa_id, metodo_pago_id, monto, estado,
      id_transaccion, fecha_pago, creado_en, tenant_id
    ) VALUES (
      v_orden_id, v_metodo_pago, v_total, v_estado_pago,
      v_trx_id, (CASE WHEN v_estado_pago = 'APROBADO' THEN v_fecha ELSE NULL END), v_fecha, v_tenant_id
    );

  END LOOP;

  RAISE NOTICE '🎉 ¡ÉXITO! Se generaron 200 ventas sintéticas históricas distribuidas en los últimos 12 meses.';
  RAISE NOTICE '🔒 Todas las ventas pertenecen de forma aislada a la tienda AURA (tenant_id = %).', v_tenant_id;
END $$;
