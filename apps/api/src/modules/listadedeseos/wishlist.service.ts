import { Injectable } from '@nestjs/common';

@Injectable()
export class WishlistService {
  async findAll() {
    return { message: 'Listado de Wishlist (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Wishlist (en desarrollo)' };
  }
}
