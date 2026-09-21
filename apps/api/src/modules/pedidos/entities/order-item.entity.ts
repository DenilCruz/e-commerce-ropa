import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';
import { ProductEntity } from '../../productos/entities/product.entity';
import { ProductVariantEntity } from '../../productos/entities/product-variant.entity';

@Entity('detalle_nota_venta')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'notaventa_id' })
  notaventaId: string;

  @Column({ type: 'uuid', name: 'producto_id' })
  productoId: string;

  @Column({ type: 'uuid', name: 'variante_id', nullable: true })
  varianteId: string;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'varchar', length: 150, name: 'nombre_producto', nullable: true })
  nombreProducto: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  talla: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string;

  @ManyToOne(() => OrderEntity, (orden) => orden.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notaventa_id' })
  notaventa: OrderEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'producto_id' })
  producto: ProductEntity;

  @ManyToOne(() => ProductVariantEntity, { nullable: true })
  @JoinColumn({ name: 'variante_id' })
  variante: ProductVariantEntity;
}
