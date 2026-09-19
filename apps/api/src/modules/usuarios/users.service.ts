import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  async findAll() {
    return { message: 'Listado de Users (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Users (en desarrollo)' };
  }
}
