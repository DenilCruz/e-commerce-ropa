import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  async findAll() {
    return { message: 'Listado de Admin (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Admin (en desarrollo)' };
  }
}
