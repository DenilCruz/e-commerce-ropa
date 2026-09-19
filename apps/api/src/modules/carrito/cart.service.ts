import { Injectable } from '@nestjs/common';

@Injectable()
export class CartService {
  async findAll() {
    return { message: 'Listado de Cart (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Cart (en desarrollo)' };
  }
}
