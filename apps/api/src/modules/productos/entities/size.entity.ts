import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('talla')
export class SizeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  nombre: string;

  @Column({ type: 'int', default: 0 })
  orden: number;
}
