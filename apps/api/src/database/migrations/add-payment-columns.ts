import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function migrate() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ecommerce_db',
  });

  await dataSource.initialize();
  console.log('✅ Conectado a PostgreSQL.');

  await dataSource.query(`
    ALTER TABLE "tienda" 
    ADD COLUMN IF NOT EXISTS "qr_url" VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS "titular_cuenta" VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS "banco" VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS "numero_cuenta" VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS "modalidad_pago_activa" VARCHAR(30) DEFAULT 'MODELO_A_CUSTODIA';
  `);
  console.log('✅ Columnas de configuración de pagos agregadas a la tabla tienda.');

  const tiendas = await dataSource.query(`SELECT id, nombre, slug, qr_url, titular_cuenta, banco, modalidad_pago_activa FROM "tienda"`);
  console.log('Tiendas actuales:', tiendas);

  await dataSource.destroy();
}

migrate().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
