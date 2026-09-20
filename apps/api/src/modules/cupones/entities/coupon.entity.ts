import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum TipoCupon {
  PORCENTAJE = 'PORCENTAJE',
  MONTO_FIJO = 'MONTO_FIJO',
}

@Entity('cupon')
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: TipoCupon | string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'monto_minimo', default: 0 })
  montoMinimo: number;

  @Column({ type: 'int', name: 'usos_maximos', nullable: true })
  usosMaximos: number | null;

  @Column({ type: 'int', name: 'usos_actuales', default: 0 })
  usosActuales: number;

  @Column({ type: 'int', name: 'usos_por_usuario', default: 1 })
  usosPorUsuario: number;

  @Column({ type: 'timestamp', name: 'fecha_inicio' })
  fechaInicio: Date;

  @Column({ type: 'timestamp', name: 'fecha_fin' })
  fechaFin: Date;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
