export interface Direccion {
  id: string;
  alias?: string;
  calle: string;
  nrocasa: string;
  referencia?: string;
  predeterminada: boolean;
}

export interface ActualizarPerfilPayload {
  nombre?: string;
  apellido?: string;
  celular?: string;
  foto?: string;
}

export interface CrearDireccionPayload {
  alias?: string;
  calle: string;
  nrocasa: string;
  referencia?: string;
  predeterminada?: boolean;
}
