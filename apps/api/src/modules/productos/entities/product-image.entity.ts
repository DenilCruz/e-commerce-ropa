import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProductEntity } from './product.entity';

@Entity('imagen_producto')
export class ProductImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'producto_id' })
  productoId: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  formato: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  perspectiva: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'public_id' })
  publicId?: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: false })
  principal: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @ManyToOne(() => ProductEntity, product => product.imagenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: ProductEntity;
}
