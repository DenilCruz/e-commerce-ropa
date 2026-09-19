import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  async findAll() {
    return { message: 'Listado de Mail (en desarrollo)' };
  }

  async findOne(id: string) {
    return { id, message: 'Detalle de Mail (en desarrollo)' };
  }
}
