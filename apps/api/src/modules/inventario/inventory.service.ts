import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryService {
  async findAll() {
    return { message: 'Listado de Inventory (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Inventory (en desarrollo)' };
  }
}
