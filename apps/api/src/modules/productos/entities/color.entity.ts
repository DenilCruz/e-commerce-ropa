import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('color')
export class ColorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;
}
