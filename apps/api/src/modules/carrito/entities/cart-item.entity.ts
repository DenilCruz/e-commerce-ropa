import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CartEntity } from './cart.entity';
import { ProductVariantEntity } from '../../productos/entities/product-variant.entity';

@Entity('detalle_carrito')
@Unique(['carritoId', 'varianteId'])
export class CartItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'carrito_id' })
  carritoId: string;

  @Column({ type: 'uuid', name: 'variante_id' })
  varianteId: string;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'precio_unitario' })
  precioUnitario: number;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;

  @ManyToOne(() => CartEntity, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrito_id' })
  carrito: CartEntity;

  @ManyToOne(() => ProductVariantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variante_id' })
  variante: ProductVariantEntity;
}
