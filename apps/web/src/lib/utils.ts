import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export function getImageUrl(url?: string | null, fallback = 'https://placehold.co/400x500?text=Sin+Imagen'): string {
  if (!url) return fallback;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
}

