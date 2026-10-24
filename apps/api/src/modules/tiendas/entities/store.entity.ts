import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** A tenant of the platform: one row per store. */
@Entity('tienda')
export class StoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  fecha: Date;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVA' })
  estado: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn: Date;
}
