/**
 * The bank account the platform collects on when a store has no QR of its own (custody model). It comes from the
 * environment so it is configured, never written in the code; without it the custody QR is not offered.
 */
export interface CuentaPlataforma {
  qrUrl: string;
  titular: string;
  banco: string;
  numeroCuenta: string;
}

export const cuentaDeLaPlataforma = (env: Record<string, string | undefined> = process.env): CuentaPlataforma | null => {
  const limpio = (v?: string) => (v ?? '').trim();
  const qrUrl = limpio(env.PLATFORM_PAYMENT_QR_URL);
  const titular = limpio(env.PLATFORM_PAYMENT_HOLDER);
  const banco = limpio(env.PLATFORM_PAYMENT_BANK);
  if (!qrUrl || !titular || !banco) return null;
  return { qrUrl, titular, banco, numeroCuenta: limpio(env.PLATFORM_PAYMENT_ACCOUNT) };
};
