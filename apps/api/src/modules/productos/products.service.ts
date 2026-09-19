import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  async findAll() {
    return { message: 'Listado de Products (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Products (en desarrollo)' };
  }
}
