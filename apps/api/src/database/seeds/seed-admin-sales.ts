import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runSeed() {
  console.log('🚀 Ejecutando Seed de Ventas y Dashboard para Administrador...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ecommerce_db',
  });

  try {
    await dataSource.initialize();
    console.log('📦 Conectado a la base de datos PostgreSQL.');

    const candidatePaths = [
      path.resolve(__dirname, '../../../../../database/02_seed_admin_ventas.sql'),
      path.resolve(__dirname, '../../../../database/02_seed_admin_ventas.sql'),
      path.resolve(process.cwd(), '../../database/02_seed_admin_ventas.sql'),
      path.resolve(process.cwd(), 'database/02_seed_admin_ventas.sql'),
    ];

    const sqlPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!sqlPath) {
      throw new Error(`No se encontró el archivo SQL en ninguna de las rutas: ${candidatePaths.join(', ')}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    await dataSource.query(sql);
    console.log('✅ Seed de ventas ejecutado con éxito en la base de datos.');
  } catch (error: any) {
    console.error('❌ Error al ejecutar el seed:', error.message || error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

runSeed();
