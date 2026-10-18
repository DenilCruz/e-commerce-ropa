import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { Toaster } from 'sonner';
import { OfflineBanner } from './components/OfflineBanner';
import { useCartStore } from './store/cart.store';

export const App: React.FC = () => {
  useEffect(() => {
    useCartStore.getState().cargarCarrito();
  }, []);

  return (
    <BrowserRouter>
      <OfflineBanner />
      <AppRouter />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
};
