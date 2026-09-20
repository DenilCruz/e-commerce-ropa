import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

@Entity('categoria')
export class CategoriaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'padre_id', nullable: true })
  padre_id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @CreateDateColumn({ name: 'creado_en' })
  creado_en: Date;

  // Relación consigo misma para subcategorías (opcional, pero útil)
  @ManyToOne(() => CategoriaEntity, (categoria) => categoria.subcategorias)
  @JoinColumn({ name: 'padre_id' })
  padre: CategoriaEntity;

  @OneToMany(() => CategoriaEntity, (categoria) => categoria.padre)
  subcategorias: CategoriaEntity[];
}
