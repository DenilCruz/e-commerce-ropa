import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../usuarios/entities/user.entity';
import { ProductEntity } from '../../productos/entities/product.entity';

@Entity('resena')
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'uuid', name: 'producto_id' })
  productoId: string;

  @Column({ type: 'uuid', name: 'notaventa_id', nullable: true })
  notaventaId?: string;

  @Column({ type: 'int' })
  calificacion: number;

  @Column({ type: 'text', nullable: true })
  comentario: string;

  @Column({ type: 'boolean', default: true })
  aprobada: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'producto_id' })
  producto: ProductEntity;
}
