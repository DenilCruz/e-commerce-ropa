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
import { ShippingMethodEntity } from './shipping-method.entity';
import { AddressEntity } from '../../usuarios/entities/address.entity';

@Entity('envio')
export class ShippingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'notaventa_id', unique: true })
  notaventaId: string;

  @Column({ type: 'uuid', name: 'metodo_envio_id' })
  metodoEnvioId: string;

  @Column({ type: 'uuid', name: 'direccion_id', nullable: true })
  direccionId: string;

  @Column({ type: 'varchar', length: 255, name: 'direccion_texto', nullable: true })
  direccionTexto: string;

  @Column({ type: 'varchar', length: 100, name: 'empresa_transportadora', nullable: true })
  empresaTransportadora: string;

  @Column({ type: 'varchar', length: 100, name: 'numero_tracking', nullable: true })
  numeroTracking: string;

  @Column({ type: 'varchar', length: 30, default: 'PREPARANDO' })
  estado: string; // PREPARANDO, EN_CAMINO, EN_REPARTO, ENTREGADO, CANCELADO

  @Column({ type: 'timestamp', name: 'fecha_envio', nullable: true })
  fechaEnvio: Date;

  @Column({ type: 'timestamp', name: 'fecha_entrega_estimada', nullable: true })
  fechaEntregaEstimada: Date;

  @Column({ type: 'timestamp', name: 'fecha_entrega_real', nullable: true })
  fechaEntregaReal: Date;

  @Column({ type: 'numeric', precision: 10, scale: 6, nullable: true })
  latitud: number;

  @Column({ type: 'numeric', precision: 10, scale: 6, nullable: true })
  longitud: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @OneToOne(() => OrderEntity, (orden) => orden.envio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notaventa_id' })
  notaventa: OrderEntity;

  @ManyToOne(() => ShippingMethodEntity)
  @JoinColumn({ name: 'metodo_envio_id' })
  metodoEnvio: ShippingMethodEntity;

  @ManyToOne(() => AddressEntity, { nullable: true })
  @JoinColumn({ name: 'direccion_id' })
  direccion: AddressEntity;
}
