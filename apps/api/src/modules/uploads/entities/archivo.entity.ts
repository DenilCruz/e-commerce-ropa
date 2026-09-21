import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('archivo')
export class ArchivoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nombre_original', type: 'varchar', length: 255 })
  nombreOriginal: string;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ name: 'public_id', type: 'varchar', length: 255, nullable: true })
  publicId?: string;

  @Column({ type: 'varchar', length: 20, default: 'webp' })
  formato: string;

  @Column({ type: 'varchar', length: 50, default: 'image/webp' })
  mimetype: string;

  @Column({ name: 'peso_bytes', type: 'int' })
  pesoBytes: number;

  @Column({ name: 'peso_original_bytes', type: 'int', nullable: true })
  pesoOriginalBytes?: number;

  @Column({ name: 'porcentaje_ahorro', type: 'int', default: 0 })
  porcentajeAhorro: number;

  @Column({ type: 'varchar', length: 20, default: 'local' })
  almacenamiento: 'cloudinary' | 'local';

  @Column({ type: 'varchar', length: 50, default: 'general' })
  categoria: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId?: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
