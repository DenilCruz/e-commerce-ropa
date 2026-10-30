jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException } from '@nestjs/common';
import { WebhooksController } from '../../src/modules/facturacion/webhooks.controller';

describe('WebhooksController', () => {
  let billing: any;
  let controller: WebhooksController;
  const cuerpo = Buffer.from('{"id":"evt_1"}');

  beforeEach(() => {
    billing = {
      verificarFirma: jest.fn().mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed' }),
      procesarEvento: jest.fn().mockResolvedValue('PROCESADO'),
    };
    controller = new WebhooksController(billing);
  });

  it('verifica la firma sobre el cuerpo crudo y procesa el evento', async () => {
    const r = await controller.stripe({ rawBody: cuerpo } as any, 't=1,v1=abc');

    expect(billing.verificarFirma).toHaveBeenCalledWith(cuerpo, 't=1,v1=abc');
    expect(billing.procesarEvento).toHaveBeenCalledWith({ id: 'evt_1', type: 'checkout.session.completed' });
    expect(r).toEqual({ received: true });
  });

  it('no procesa nada si la firma no verifica (400) y no filtra datos en la respuesta', async () => {
    billing.verificarFirma.mockImplementation(() => {
      throw new BadRequestException('La firma del webhook no es válida.');
    });

    await expect(controller.stripe({ rawBody: cuerpo } as any, 'mala')).rejects.toThrow(BadRequestException);
    expect(billing.procesarEvento).not.toHaveBeenCalled();
  });

  it('responde 200 también para un evento repetido: Stripe no debe reintentarlo', async () => {
    billing.procesarEvento.mockResolvedValue('DUPLICADO');

    await expect(controller.stripe({ rawBody: cuerpo } as any, 't=1,v1=abc')).resolves.toEqual({ received: true });
  });

  it('deja subir el error de la base para que Stripe reintente', async () => {
    billing.procesarEvento.mockRejectedValue(new Error('base caída'));

    await expect(controller.stripe({ rawBody: cuerpo } as any, 't=1,v1=abc')).rejects.toThrow('base caída');
  });
});
