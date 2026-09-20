import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { CategoriaEntity } from '../../categorias/entities/category.entity';
import { BrandEntity } from './brand.entity';
import { ProductVariantEntity } from './product-variant.entity';
import { ProductImageEntity } from './product-image.entity';

@Entity('producto')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'categoria_id' })
  categoriaId: string;

  @Column({ type: 'uuid', name: 'marca_id', nullable: true })
  marcaId: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  precio: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'boolean', default: false })
  destacado: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @ManyToOne(() => CategoriaEntity)
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaEntity;

  @ManyToOne(() => BrandEntity)
  @JoinColumn({ name: 'marca_id' })
  marca: BrandEntity;

  @OneToMany(() => ProductVariantEntity, variant => variant.producto)
  variantes: ProductVariantEntity[];

  @OneToMany(() => ProductImageEntity, image => image.producto)
  imagenes: ProductImageEntity[];
}
