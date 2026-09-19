import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdersService {
  async findAll() {
    return { message: 'Listado de Orders (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Orders (en desarrollo)' };
  }
}
