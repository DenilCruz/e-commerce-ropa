import { Injectable } from '@nestjs/common';

@Injectable()
export class CouponsService {
  async findAll() {
    return { message: 'Listado de Coupons (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Coupons (en desarrollo)' };
  }
}
