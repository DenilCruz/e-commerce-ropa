import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  async findAll() {
    return { message: 'Listado de Payments (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Payments (en desarrollo)' };
  }
}
