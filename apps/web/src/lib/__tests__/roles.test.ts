import { describe, expect, it } from 'vitest';
import { esDueno, esPersonal } from '../roles';

describe('roles de panel', () => {
  it('trata al vendedor histórico como personal y no como dueño', () => {
    expect(esPersonal('EMPLEADO')).toBe(true);
    expect(esPersonal('VENDEDOR')).toBe(true);
    expect(esDueno('VENDEDOR')).toBe(false);
    expect(esDueno('ADMIN')).toBe(true);
    expect(esDueno('SUPERADMIN')).toBe(true);
    expect(esPersonal('CLIENTE')).toBe(false);
  });
});
