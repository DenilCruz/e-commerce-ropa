import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../usuarios/entities/user.entity';
import { ProductEntity } from '../../productos/entities/product.entity';

@Entity('favorito')
export class WishlistEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'uuid', name: 'producto_id' })
  productoId: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'producto_id' })
  producto: ProductEntity;
}
