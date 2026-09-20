import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../usuarios/entities/user.entity';

export enum TipoToken {
  REFRESH = 'REFRESH',
  VERIFICACION_EMAIL = 'VERIFICACION_EMAIL',
  RECUPERAR_PASSWORD = 'RECUPERAR_PASSWORD',
}

@Entity('token')
export class TokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'varchar', length: 30 })
  tipo: TipoToken | string;

  @Column({ type: 'varchar', length: 500, unique: true })
  valor: string;

  @Column({ type: 'timestamp', name: 'expira_en' })
  expiraEn: Date;

  @Column({ type: 'boolean', default: false })
  usado: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;
}
