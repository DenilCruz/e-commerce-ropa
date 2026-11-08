import { api } from '../../../services/api';
import { ClienteLocal } from '../types';

/** Posts one queued customer. The id was generated here, so sending it twice returns the same customer (C1). */
export async function enviarClientePorApi(cliente: ClienteLocal): Promise<void> {
  await api.post('/clientes-mostrador', {
    id: cliente.id,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    celular: cliente.celular,
    ci: cliente.ci,
    correo: cliente.correo,
  });
}
