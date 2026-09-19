import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoriesService {
  async findAll() {
    return { message: 'Listado de Categories (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Categories (en desarrollo)' };
  }
}
