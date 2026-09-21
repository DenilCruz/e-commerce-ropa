import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';
import { UserEntity } from '../../usuarios/entities/user.entity';

@Entity('historial_venta')
export class OrderHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'notaventa_id' })
  notaventaId: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_anterior', nullable: true })
  estadoAnterior: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_nuevo' })
  estadoNuevo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comentario: string;

  @Column({ type: 'uuid', name: 'usuario_id', nullable: true })
  usuarioId: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @ManyToOne(() => OrderEntity, (orden) => orden.historial, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notaventa_id' })
  notaventa: OrderEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;
}
