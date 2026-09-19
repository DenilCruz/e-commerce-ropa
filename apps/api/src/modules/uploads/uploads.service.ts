import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  async findAll() {
    return { message: 'Listado de Uploads (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Uploads (en desarrollo)' };
  }
}
