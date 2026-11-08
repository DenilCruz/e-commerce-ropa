import { api } from '../../../services/api';
import { ClienteDelServidor } from './clientesLocales';

/** Customer list the point of sale keeps on the device (C1: at most 200). */
export async function listarClientesDelServidor(limite = 200): Promise<ClienteDelServidor[]> {
  const { data } = await api.get('/clientes-mostrador', { params: { limite } });
  const lista = Array.isArray(data) ? data : data?.data;
  return Array.isArray(lista) ? lista : [];
}
