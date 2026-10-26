-- Migración 10: Columnas de Pasarela y Configuración de Pagos Híbridos (Modelo A / B)
ALTER TABLE "tienda" 
ADD COLUMN IF NOT EXISTS "qr_url" VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS "titular_cuenta" VARCHAR(150) NULL,
ADD COLUMN IF NOT EXISTS "banco" VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS "numero_cuenta" VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS "modalidad_pago_activa" VARCHAR(30) DEFAULT 'MODELO_A_CUSTODIA';
