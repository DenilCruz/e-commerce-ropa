import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProductEntity } from './product.entity';
import { SizeEntity } from './size.entity';
import { ColorEntity } from './color.entity';

@Entity('producto_variante')
export class ProductVariantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'producto_id' })
  productoId: string;

  @Column({ type: 'uuid', name: 'talla_id', nullable: true })
  tallaId: string;

  @Column({ type: 'uuid', name: 'color_id', nullable: true })
  colorId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', name: 'stock_minimo', default: 5 })
  stockMinimo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_extra', default: 0 })
  precioExtra: number;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @ManyToOne(() => ProductEntity, product => product.variantes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: ProductEntity;

  @ManyToOne(() => SizeEntity)
  @JoinColumn({ name: 'talla_id' })
  talla: SizeEntity;

  @ManyToOne(() => ColorEntity)
  @JoinColumn({ name: 'color_id' })
  color: ColorEntity;
}
