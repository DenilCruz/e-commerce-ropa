import { Injectable } from '@nestjs/common';

@Injectable()
export class ShippingService {
  async findAll() {
    return { message: 'Listado de Shipping (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Shipping (en desarrollo)' };
  }
}
