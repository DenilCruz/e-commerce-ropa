import { tipoDePago } from '../../src/modules/pagos/payment-kinds';

describe('tipoDePago', () => {
  it.each([
    ['QR Simple / Transferencia', 'qr'],
    ['Transferencia bancaria', 'qr'],
    ['Efectivo contra entrega', 'contra_entrega'],
    ['Pago contra entrega', 'contra_entrega'],
    ['Tarjeta de Débito/Crédito', 'tarjeta'],
    ['Stripe', 'tarjeta'],
    ['Cripto', 'otro'],
    [null, 'otro'],
  ])('%s -> %s', (nombre, esperado) => {
    expect(tipoDePago(nombre as any)).toBe(esperado);
  });
});
