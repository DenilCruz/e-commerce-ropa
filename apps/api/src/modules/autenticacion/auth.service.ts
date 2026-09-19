import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async findAll() {
    return { message: 'Listado de Auth (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Auth (en desarrollo)' };
  }
}
