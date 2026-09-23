import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/auth.store';

export const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  // Detectar la IP de la máquina host desde Expo Metro bundler (ej. 10.253.15.111:8081 -> 10.253.15.111)
  const hostUri = Constants.expoConfig?.hostUri;
  const metroHostIp = hostUri ? hostUri.split(':')[0] : null;

  // Si hay una URL en .env y no es una IP obsoleta harcodeada (192.168.100.22 / 192.168.0.5)
  if (
    envUrl &&
    !envUrl.includes('localhost') &&
    !envUrl.includes('192.168.100.22') &&
    !envUrl.includes('192.168.0.5')
  ) {
    return envUrl;
  }

  // Si Expo Metro provee la IP del host del desarrollador, usarla preferentemente
  if (metroHostIp && metroHostIp !== 'localhost' && metroHostIp !== '127.0.0.1') {
    return `http://${metroHostIp}:3000/api/v1`;
  }

  // En Android Emulator (AVD), 10.0.2.2 es la IP especial para el localhost del PC host
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }

  return 'http://localhost:3000/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const getImageUrl = (url?: string | null): string => {
  if (!url) return 'https://placehold.co/400x500?text=Sin+Imagen';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const currentBaseURL = api.defaults.baseURL || getBaseUrl();
  const assetsURL = currentBaseURL.replace(/\/api\/v1\/?$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  if (cleanUrl.startsWith('/uploads/')) {
    return `${assetsURL}${cleanUrl}`;
  }
  return `${assetsURL}/uploads${cleanUrl}`;
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

