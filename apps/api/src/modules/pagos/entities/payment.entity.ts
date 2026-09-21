import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderEntity } from '../../pedidos/entities/order.entity';
import { PaymentMethodEntity } from './payment-method.entity';

@Entity('pago')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'notaventa_id', unique: true })
  notaventaId: string;

  @Column({ type: 'uuid', name: 'metodo_pago_id' })
  metodoPagoId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 30, default: 'PENDIENTE' })
  estado: string;

  @Column({ type: 'jsonb', name: 'respuesta_pasarela', nullable: true })
  respuestaPasarela: any;

  @Column({ type: 'varchar', length: 255, name: 'id_transaccion', nullable: true })
  idTransaccion: string;

  @Column({ type: 'timestamp', name: 'fecha_pago', nullable: true })
  fechaPago: Date;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @OneToOne(() => OrderEntity, (orden) => orden.pago, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notaventa_id' })
  notaventa: OrderEntity;

  @ManyToOne(() => PaymentMethodEntity, { nullable: true })
  @JoinColumn({ name: 'metodo_pago_id' })
  metodoPago: PaymentMethodEntity;
}
