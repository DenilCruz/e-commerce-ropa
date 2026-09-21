import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('metodo_pago')
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
