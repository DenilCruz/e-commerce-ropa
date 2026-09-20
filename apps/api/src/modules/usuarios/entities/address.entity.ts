import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('direccion')
export class AddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  alias: string;

  @Column({ type: 'varchar', length: 200 })
  calle: string;

  @Column({ type: 'varchar', length: 20 })
  nrocasa: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referencia: string;

  @Column({ type: 'boolean', default: false })
  predeterminada: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @ManyToOne(() => UserEntity, user => user.direcciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;
}
