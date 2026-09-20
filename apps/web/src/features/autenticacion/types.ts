export interface UserProfile {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  emailVerificado: boolean;
  celular?: string;
  ci?: string;
  foto?: string;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  usuario: UserProfile;
}

export interface RegistroRequest {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  celular?: string;
  ci?: string;
}

export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface RecuperarPasswordRequest {
  correo: string;
}

export interface RestablecerPasswordRequest {
  token: string;
  nuevaContrasena: string;
}

export interface VerificarEmailRequest {
  token: string;
}
