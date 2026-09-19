import { api } from '../../../services/api';
import { LoginDto, RegisterDto } from '@ecommerce/shared';

export const authApi = {
  login: (data: LoginDto) => api.post('/auth/login', data),
  register: (data: RegisterDto) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};
