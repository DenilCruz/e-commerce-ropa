import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Peticiones: Adjuntar Bearer Token y/o X-Tenant-Slug
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    const tenantSlug = localStorage.getItem('tenant_slug');

    // Identificar slug contextual desde la URL (/t/:slug)
    const match = typeof window !== 'undefined' ? window.location.pathname.match(/\/t\/([^/]+)/) : null;
    const routeSlug = match ? match[1] : null;
    const activeSlug = routeSlug || tenantSlug;

    const url = config.url || '';
    const esRutaGlobalTiendas =
      url.includes('/auth/tiendas') ||
      url.includes('/auth/perfil') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/refresh');

    if (activeSlug && config.headers && !esRutaGlobalTiendas) {
      config.headers['X-Tenant-Slug'] = activeSlug;
    }

    if (token && config.headers) {
      // Si la URL apunta a una tienda específica distinta a la sesión activa en el navegador,
      // no adjuntamos el token ajeno en rutas públicas para evitar 403 (La tienda indicada no coincide con tu sesión),
      // pero sí lo adjuntamos en rutas globales de gestión de tiendas (/auth/tiendas)
      const esTiendaDistinta = routeSlug && tenantSlug && routeSlug.toLowerCase() !== tenantSlug.toLowerCase();
      if (!esTiendaDistinta || esRutaGlobalTiendas) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor de Respuestas: HU-06 Renovación automática de token en 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es 401 y no es una ruta de auth inicial (/auth/login, /auth/registro)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/registro') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data;

        useAuthStore.getState().setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
