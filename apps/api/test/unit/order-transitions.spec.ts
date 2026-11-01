import { efectosDeTransicion, motivoTransicionInvalida } from '../../src/modules/pedidos/order-transitions';

const qr = (estado: string | null = 'PENDIENTE') => ({ tipo: 'qr' as const, estado });
const cod = (estado: string | null = 'PENDIENTE') => ({ tipo: 'contra_entrega' as const, estado });
const tarjeta = (estado: string | null = 'APROBADO') => ({ tipo: 'tarjeta' as const, estado });

describe('order transitions', () => {
  describe('motivoTransicionInvalida', () => {
    it('allows the normal journey of a paid order', () => {
      expect(motivoTransicionInvalida('PENDIENTE', 'PAGADO', qr())).toBeNull();
      expect(motivoTransicionInvalida('PAGADO', 'ENVIADO', qr('APROBADO'))).toBeNull();
      expect(motivoTransicionInvalida('ENVIADO', 'ENTREGADO', qr('APROBADO'))).toBeNull();
    });

    it('does not let a QR order ship before the payment is confirmed', () => {
      expect(motivoTransicionInvalida('PENDIENTE', 'ENVIADO', qr())).toMatch(/Confirma el pago/);
      expect(motivoTransicionInvalida('PENDIENTE', 'ENVIADO', tarjeta('PENDIENTE'))).toMatch(/Confirma el pago/);
    });

    it('lets cash on delivery ship while still pending', () => {
      expect(motivoTransicionInvalida('PENDIENTE', 'ENVIADO', cod())).toBeNull();
    });

    it.each(['PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'REEMBOLSADO'])(
      'does not revive a cancelled order into %s',
      (destino) => {
        expect(motivoTransicionInvalida('CANCELADO', destino, qr(null))).toMatch(/ya no admite cambios/);
      },
    );

    it('does not revive a refunded order', () => {
      expect(motivoTransicionInvalida('REEMBOLSADO', 'PAGADO', tarjeta('REEMBOLSADO'))).toMatch(/ya no admite cambios/);
    });

    it('does not go backwards', () => {
      expect(motivoTransicionInvalida('ENTREGADO', 'PENDIENTE', cod('APROBADO'))).toMatch(/No se puede pasar/);
      expect(motivoTransicionInvalida('ENVIADO', 'PAGADO', qr('APROBADO'))).toMatch(/No se puede pasar/);
    });

    it('rejects a state that does not exist', () => {
      expect(motivoTransicionInvalida('PENDIENTE', 'REGALADO', qr())).toMatch(/Estado no válido/);
    });
  });

  describe('efectosDeTransicion', () => {
    it('approving a pending QR payment when the order is marked paid', () => {
      expect(efectosDeTransicion('PENDIENTE', 'PAGADO', qr())).toEqual({ pago: 'APROBADO', restaurarStock: false });
    });

    it('collects cash on delivery when the order is delivered', () => {
      expect(efectosDeTransicion('ENVIADO', 'ENTREGADO', cod())).toEqual({ pago: 'APROBADO', restaurarStock: false });
    });

    it('rejects a pending payment and restores stock when the order is cancelled', () => {
      expect(efectosDeTransicion('PENDIENTE', 'CANCELADO', qr())).toEqual({ pago: 'RECHAZADO', restaurarStock: true });
    });

    it('marks an approved payment as refunded when the order is cancelled', () => {
      expect(efectosDeTransicion('PAGADO', 'CANCELADO', tarjeta())).toEqual({ pago: 'REEMBOLSADO', restaurarStock: true });
    });

    it('never restores stock twice', () => {
      expect(efectosDeTransicion('CANCELADO', 'REEMBOLSADO', tarjeta('REEMBOLSADO')).restaurarStock).toBe(false);
      expect(efectosDeTransicion('REEMBOLSADO', 'CANCELADO', tarjeta('REEMBOLSADO')).restaurarStock).toBe(false);
    });

    it('leaves the payment alone when the order has none', () => {
      expect(efectosDeTransicion('PENDIENTE', 'CANCELADO', { tipo: 'otro', estado: null })).toEqual({
        pago: null,
        restaurarStock: true,
      });
    });
  });
});
