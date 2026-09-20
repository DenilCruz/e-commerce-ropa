import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { RoleEntity } from './role.entity';
import { AddressEntity } from './address.entity';

@Entity('usuario')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'rol_id' })
  rolId: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  ci: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  apellido: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  celular: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  correo: string;

  @Column({ type: 'varchar', length: 255 })
  contrasena: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  foto: string;

  @Column({ type: 'boolean', name: 'email_verificado', default: false })
  emailVerificado: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'timestamp', name: 'ultimo_login', nullable: true })
  ultimoLogin: Date;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @ManyToOne(() => RoleEntity, role => role.usuarios)
  @JoinColumn({ name: 'rol_id' })
  rol: RoleEntity;

  @OneToMany(() => AddressEntity, address => address.usuario)
  direcciones: AddressEntity[];
}
