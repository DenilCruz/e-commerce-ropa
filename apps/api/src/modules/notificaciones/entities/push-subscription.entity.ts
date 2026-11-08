import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('push_suscripcion')
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  /** WEBPUSH rows carry endpoint + keys; EXPO rows carry only expoToken. */
  @Column({ type: 'varchar', length: 10, default: 'WEBPUSH' })
  canal: 'WEBPUSH' | 'EXPO';

  @Column({ type: 'text', nullable: true })
  endpoint: string | null;

  @Column({ type: 'text', nullable: true })
  p256dh: string | null;

  @Column({ type: 'text', nullable: true })
  auth: string | null;

  @Column({ type: 'text', name: 'expo_token', nullable: true })
  expoToken: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
