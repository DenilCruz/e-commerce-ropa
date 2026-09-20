import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ArchivosService {
  constructor() {}

  // ==========================================
  // SERVICIO DE ARCHIVOS (SUBIDA)
  // ==========================================
  procesarSubida(file: Express.Multer.File): { url: string; nombre: string; tamanio: number } {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo de imagen.');
    }

    // Validar tipo de archivo (Solo imágenes)
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!permitidos.includes(file.mimetype)) {
      throw new BadRequestException('Formato de archivo no válido. Solo se permite JPG, PNG o WEBP.');
    }

    // Devolvemos la URL pública donde estará disponible la imagen
    const urlPublica = `/uploads/${file.filename}`;

    return {
      url: urlPublica,
      nombre: file.filename,
      tamanio: file.size, // En bytes
    };
  }
}
