-- =====================================================================
-- SCRIPT DE GENERACIÓN DE DATOS SINTÉTICOS CON VOLUMEN
-- Archivo: database/03_seed_synthetic_aura_sales.sql
-- Motor: PostgreSQL 15+
-- Objetivo: Generar 900 órdenes históricas (últimos 12 meses) con patrón semanal, estacional y de crecimiento,
--           para que los dashboards predictivos tengan algo real que detectar
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

  -- Volumen y patrón de demanda (una tienda real vende más viernes/sábado, en fin de año y crece con el tiempo)
  v_total_ordenes CONSTANT INT := 900;
  v_total_clientes CONSTANT INT := 150;

  -- Combos que los clientes suelen comprar juntos (patrón de la prenda A con la prenda B, por nombre de producto)
  v_combos_a CONSTANT TEXT[] := ARRAY['^vestido', '^camisa', '^polera', '^falda'];
  v_combos_b CONSTANT TEXT[] := ARRAY['^(abrigo|trench)', '^jeans', '^shorts', '^camisa'];
  v_prob_combo CONSTANT NUMERIC := 0.35;
  v_es_combo BOOLEAN;
  v_combo INT;
  v_idx_a INT[];
  v_idx_b INT[];
  v_dia_idx INT;
  v_peso NUMERIC;
  v_peso_dow CONSTANT NUMERIC[] := ARRAY[0.75, 0.65, 0.70, 0.80, 0.90, 1.20, 1.50];                 -- domingo..sábado
  v_peso_mes CONSTANT NUMERIC[] := ARRAY[0.85, 0.80, 0.90, 0.90, 1.10, 0.95, 1.00, 1.05, 1.00, 1.10, 1.15, 1.50]; -- enero..diciembre
  v_peso_max CONSTANT NUMERIC := 1.50 * 1.50 * 1.30;  -- máximo posible de los tres factores (crecimiento de 0.7 a 1.3)

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
  RAISE NOTICE '🚀 Iniciando generación de % ventas sintéticas para la tienda AURA...', v_total_ordenes;

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

  -- 4. Crear los Clientes Sintéticos si no existen (los 20 primeros conservan su correo original)
  FOR i IN 1..v_total_clientes LOOP
    IF i <= 20 THEN
      v_nombre := v_nombres[i];
      v_apellido := v_apellidos[i];
      v_correo := LOWER(v_nombre) || '.' || LOWER(v_apellido) || '@aura-vip.com';
    ELSE
      v_nombre := v_nombres[1 + (i - 1) % 20];
      v_apellido := v_apellidos[1 + ((i - 1) * 7 + (i - 1) / 20) % 20];
      v_correo := LOWER(v_nombre) || '.' || LOWER(v_apellido) || i::TEXT || '@aura-vip.com';
    END IF;

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

    -- Miembro CLIENTE de la tienda: es lo que usan los dashboards (RFM / churn) para listar a los clientes
    IF NOT EXISTS (SELECT 1 FROM usuario_tienda WHERE usuario_id = v_user_id AND tienda_id = v_tenant_id) THEN
      INSERT INTO usuario_tienda (usuario_id, tienda_id, rol_id, activo, creado_en)
      VALUES (v_user_id, v_tenant_id, v_rol_cliente_id, true, NOW() - INTERVAL '380 days');
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

  -- 6. Generar las Notas de Venta con distribución temporal realista
  FOR i IN 1..v_total_ordenes LOOP
    -- Día de la venta (1..365 días atrás, nunca hoy): se acepta con probabilidad proporcional al peso del día
    -- de la semana, del mes y del crecimiento del negocio (de 0.7 hace un año a 1.3 ayer)
    LOOP
      v_dia_idx := 1 + floor(random() * 365)::INT;
      v_peso := v_peso_dow[EXTRACT(DOW FROM CURRENT_DATE - v_dia_idx)::INT + 1]
              * v_peso_mes[EXTRACT(MONTH FROM CURRENT_DATE - v_dia_idx)::INT]
              * (0.7 + 0.6 * (1 - v_dia_idx / 365.0));
      EXIT WHEN random() < v_peso / v_peso_max;
    END LOOP;
    v_dias_atras := v_dia_idx;

    -- Hora aleatoria del día (pico entre 10:00 y 22:00)
    v_segundos_dia := (36000 + floor(random() * 43200))::INT;
    v_fecha := (CURRENT_DATE - v_dia_idx)::TIMESTAMP + (v_segundos_dia || ' seconds')::INTERVAL;

    -- Cliente: pocos compran mucho y muchos compran una o dos veces (distribución sesgada hacia los primeros)
    v_idx_prod := 1 + floor(array_length(v_clientes_ids, 1) * power(random(), 1.6))::INT;
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

    -- Con cierta probabilidad la venta incluye un combo (dos prendas que se complementan)
    v_es_combo := random() < v_prob_combo;
    IF v_es_combo THEN
      v_combo := 1 + floor(random() * array_length(v_combos_a, 1))::INT;
      SELECT array_agg(k) INTO v_idx_a FROM generate_subscripts(v_prod_nombres, 1) k WHERE v_prod_nombres[k] ~* v_combos_a[v_combo];
      SELECT array_agg(k) INTO v_idx_b FROM generate_subscripts(v_prod_nombres, 1) k WHERE v_prod_nombres[k] ~* v_combos_b[v_combo];
      IF v_idx_a IS NULL OR v_idx_b IS NULL THEN v_es_combo := FALSE; END IF;
    END IF;
    IF v_es_combo AND v_items_count < 2 THEN v_items_count := 2; END IF;
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
      IF v_es_combo AND j = 1 THEN
        v_idx_prod := v_idx_a[1 + floor(random() * array_length(v_idx_a, 1))::INT];
      ELSIF v_es_combo AND j = 2 THEN
        v_idx_prod := v_idx_b[1 + floor(random() * array_length(v_idx_b, 1))::INT];
      ELSE
        v_idx_prod := 1 + floor(random() * v_total_prods)::INT;
      END IF;
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

  RAISE NOTICE '🎉 ¡ÉXITO! Se generaron % ventas sintéticas históricas distribuidas en los últimos 12 meses.', v_total_ordenes;
  RAISE NOTICE '🔒 Todas las ventas pertenecen de forma aislada a la tienda AURA (tenant_id = %).', v_tenant_id;
END $$;
