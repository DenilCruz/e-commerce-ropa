import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../usuarios/entities/user.entity';
import { CouponEntity } from '../../cupones/entities/coupon.entity';
import { OrderItemEntity } from './order-item.entity';
import { PaymentEntity } from '../../pagos/entities/payment.entity';

@Entity('nota_venta')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  nro: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'uuid', name: 'cliente_id', nullable: true })
  clienteId: string;

  @Column({ type: 'uuid', name: 'caja_id', nullable: true })
  cajaId: string;

  @Column({ type: 'uuid', name: 'tienda_id', nullable: true })
  tiendaId: string;

  @Column({ type: 'uuid', name: 'direccion_id', nullable: true })
  direccionId: string;

  @Column({ type: 'uuid', name: 'cupon_id', nullable: true })
  cuponId: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  fecha: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'costo_envio', default: 0 })
  costoEnvio: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'varchar', length: 30, default: 'PENDIENTE' })
  estado: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  @ManyToOne(() => CouponEntity, { nullable: true })
  @JoinColumn({ name: 'cupon_id' })
  cupon: CouponEntity;

  @OneToMany(() => OrderItemEntity, (item) => item.notaventa, { cascade: true })
  items: OrderItemEntity[];

  @OneToOne(() => PaymentEntity, (pago) => pago.notaventa)
  pago: PaymentEntity;

  @OneToOne('ShippingEntity', (envio: any) => envio.notaventa)
  envio: any;

  @OneToMany('OrderHistoryEntity', (hist: any) => hist.notaventa, { cascade: true })
  historial: any[];
}
