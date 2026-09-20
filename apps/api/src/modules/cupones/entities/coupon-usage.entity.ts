import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CouponEntity } from './coupon.entity';

@Entity('cupon_uso')
export class CouponUsageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'cupon_id' })
  cuponId: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'uuid', name: 'notaventa_id' })
  notaventaId: string;

  @CreateDateColumn({ name: 'usado_en' })
  usadoEn: Date;

  @ManyToOne(() => CouponEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cupon_id' })
  cupon: CouponEntity;
}
