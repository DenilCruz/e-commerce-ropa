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

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn: Date;
}
