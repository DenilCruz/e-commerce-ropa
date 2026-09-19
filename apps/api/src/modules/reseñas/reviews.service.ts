import { Injectable } from '@nestjs/common';

@Injectable()
export class ReviewsService {
  async findAll() {
    return { message: 'Listado de Reviews (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Reviews (en desarrollo)' };
  }
}
