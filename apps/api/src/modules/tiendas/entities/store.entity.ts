import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** A tenant of the platform: one row per store. */
@Entity('tienda')
export class StoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  slug: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  fecha: Date;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVA' })
  estado: string;

  @Column({ type: 'varchar', length: 30, default: 'FREE_TRIAL' })
  plan: string;

  @Column({ type: 'uuid', name: 'propietario_id', nullable: true })
  propietarioId: string | null;

  @Column({ type: 'varchar', length: 500, name: 'qr_url', nullable: true })
  qrUrl: string | null;

  @Column({ type: 'varchar', length: 150, name: 'titular_cuenta', nullable: true })
  titularCuenta: string | null;

  @Column({ type: 'varchar', length: 100, name: 'banco', nullable: true })
  banco: string | null;

  @Column({ type: 'varchar', length: 50, name: 'numero_cuenta', nullable: true })
  numeroCuenta: string | null;

  @Column({ type: 'varchar', length: 30, name: 'modalidad_pago_activa', default: 'MODELO_A_CUSTODIA' })
  modalidadPagoActiva: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn: Date;
}
