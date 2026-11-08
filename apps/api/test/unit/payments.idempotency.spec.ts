jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => {} }));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

import 'reflect-metadata';
import { IdempotencyInterceptor } from '../../src/common/idempotency/idempotency.interceptor';
import { PaymentsController } from '../../src/modules/pagos/payments.controller';

describe('PaymentsController idempotency', () => {
  it.each(['crearIntento', 'crearSesionEmbebida', 'confirmarPagoTarjeta', 'pagoContraEntrega', 'pagoQr', 'simularPagoQr'])(
    '%s runs behind the IdempotencyInterceptor',
    (handler) => {
      const fn = (PaymentsController.prototype as any)[handler];
      expect(fn).toBeDefined();
      expect(Reflect.getMetadata('__interceptors__', fn)).toContain(IdempotencyInterceptor);
    },
  );
});
