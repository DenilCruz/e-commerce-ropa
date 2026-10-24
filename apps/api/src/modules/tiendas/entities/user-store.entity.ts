import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { UserEntity } from '../../usuarios/entities/user.entity';
import { RoleEntity } from '../../usuarios/entities/role.entity';
import { StoreEntity } from './store.entity';

/** Membership of a user in a store, with one role per store. */
@Entity('usuario_tienda')
@Unique(['usuarioId', 'tiendaId'])
export class UserStoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'uuid', name: 'tienda_id' })
  tiendaId: string;

  @Column({ type: 'uuid', name: 'rol_id' })
  rolId: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  @ManyToOne(() => StoreEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tienda_id' })
  tienda: StoreEntity;

  @ManyToOne(() => RoleEntity)
  @JoinColumn({ name: 'rol_id' })
  rol: RoleEntity;
}
