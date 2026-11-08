import { HttpException, HttpStatus } from '@nestjs/common';

export type MetodoPagoSimulado = 'TARJETA' | 'QR';

export interface PagoSimulado {
  metodo: MetodoPagoSimulado;
  numero?: string;
  expiracion?: string;
  cvc?: string;
  titular?: string;
}

/** Test cards of the simulated gateway, same idea as a real gateway's sandbox cards. */
export const TARJETAS_DE_PRUEBA: Record<string, string> = {
  '4000000000000002': 'La tarjeta fue rechazada por el banco emisor.',
  '4000000000009995': 'Fondos insuficientes.',
  '4000000000000069': 'La tarjeta está vencida.',
};

/** Luhn checksum: what any gateway runs before it even contacts the bank. */
export function numeroDeTarjetaValido(numero: string): boolean {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19) return false;
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let valor = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      valor *= 2;
      if (valor > 9) valor -= 9;
    }
    suma += valor;
  }
  return suma % 10 === 0;
}

/** MM/AA or MM/AAAA; valid through the last day of that month. */
export function expiracionVigente(expiracion: string, ahora: Date = new Date()): boolean {
  const m = /^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/.exec(expiracion.trim());
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  return new Date(anio, mes, 1).getTime() > ahora.getTime();
}

const rechazar = (mensaje: string): never => {
  throw new HttpException(`Pago rechazado (simulación): ${mensaje}`, HttpStatus.PAYMENT_REQUIRED);
};

/**
 * Decides the outcome of a simulated payment the way a gateway would: format checks first, then the issuer's answer.
 * Card data is only inspected here; it is never stored or logged. Throws a 402 when the payment is declined.
 */
export function evaluarPagoSimulado(pago: PagoSimulado, ahora: Date = new Date()): void {
  if (pago.metodo === 'QR') return; // the customer confirms the transfer; the simulated bank always approves it
  if (pago.metodo !== 'TARJETA') rechazar('método de pago no soportado.');

  const numero = (pago.numero ?? '').replace(/\D/g, '');
  if (!numeroDeTarjetaValido(numero)) rechazar('el número de tarjeta no es válido.');
  if (!expiracionVigente(pago.expiracion ?? '', ahora)) rechazar('la fecha de vencimiento no es válida o ya pasó.');
  if (!/^\d{3,4}$/.test((pago.cvc ?? '').trim())) rechazar('el código de seguridad no es válido.');
  if ((pago.titular ?? '').trim().length < 2) rechazar('falta el nombre del titular.');

  const motivo = TARJETAS_DE_PRUEBA[numero];
  if (motivo) rechazar(motivo);
}
