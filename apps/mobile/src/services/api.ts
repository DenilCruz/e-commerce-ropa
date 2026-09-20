import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/auth.store';

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }

  // En Android físico o emulador, localhost apunta al dispositivo en lugar de la PC
  if (Platform.OS === 'android') {
    return 'http://192.168.100.22:3000/api/v1';
  }

  return envUrl || 'http://localhost:3000/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
